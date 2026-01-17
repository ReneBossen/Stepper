using System.Net;
using Supabase;
using WalkingApp.Api.Common.Database;
using WalkingApp.Api.Steps.DTOs;

namespace WalkingApp.Api.Groups;

/// <summary>
/// Repository implementation for group data access using Supabase.
/// </summary>
public class GroupRepository : IGroupRepository
{
    private readonly ISupabaseClientFactory _clientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public GroupRepository(
        ISupabaseClientFactory clientFactory,
        IHttpContextAccessor httpContextAccessor)
    {
        ArgumentNullException.ThrowIfNull(clientFactory);
        ArgumentNullException.ThrowIfNull(httpContextAccessor);

        _clientFactory = clientFactory;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <inheritdoc />
    public async Task<Group> CreateAsync(Group group)
    {
        ArgumentNullException.ThrowIfNull(group);

        var client = await GetAuthenticatedClientAsync();

        var entity = GroupEntity.FromGroup(group);
        var response = await client
            .From<GroupEntity>()
            .Insert(entity);

        var created = response.Models.FirstOrDefault();
        if (created == null)
        {
            throw new InvalidOperationException("Failed to create group.");
        }

        var memberCount = await GetMemberCountAsync(created.Id);
        return created.ToGroup(memberCount);
    }

    /// <inheritdoc />
    public async Task<Group?> GetByIdAsync(Guid groupId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<GroupEntity>()
            .Where(x => x.Id == groupId)
            .Single();

        if (response == null)
        {
            return null;
        }

        var memberCount = await GetMemberCountAsync(groupId);
        return response.ToGroup(memberCount);
    }

    /// <inheritdoc />
    public async Task<List<(Group Group, MemberRole Role)>> GetUserGroupsAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        // Get all memberships for the user
        var memberships = await client
            .From<GroupMembershipEntity>()
            .Where(x => x.UserId == userId)
            .Get();

        var result = new List<(Group, MemberRole)>();

        foreach (var membership in memberships.Models)
        {
            var group = await GetByIdAsync(membership.GroupId);
            if (group != null)
            {
                result.Add((group, membership.ToGroupMembership().Role));
            }
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<Group> UpdateAsync(Group group)
    {
        ArgumentNullException.ThrowIfNull(group);

        var client = await GetAuthenticatedClientAsync();

        var entity = GroupEntity.FromGroup(group);
        var response = await client
            .From<GroupEntity>()
            .Update(entity);

        var updated = response.Models.FirstOrDefault();
        if (updated == null)
        {
            throw new InvalidOperationException("Failed to update group.");
        }

        var memberCount = await GetMemberCountAsync(updated.Id);
        return updated.ToGroup(memberCount);
    }

    /// <inheritdoc />
    public async Task<bool> DeleteAsync(Guid groupId)
    {
        var client = await GetAuthenticatedClientAsync();

        try
        {
            await client
                .From<GroupEntity>()
                .Where(x => x.Id == groupId)
                .Delete();

            return true;
        }
        catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    /// <inheritdoc />
    public async Task<List<GroupMembership>> GetMembersAsync(Guid groupId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<GroupMembershipEntity>()
            .Where(x => x.GroupId == groupId)
            .Order("joined_at", Supabase.Postgrest.Constants.Ordering.Ascending)
            .Get();

        return response.Models.Select(e => e.ToGroupMembership()).ToList();
    }

    /// <inheritdoc />
    public async Task<GroupMembership> AddMemberAsync(GroupMembership membership)
    {
        ArgumentNullException.ThrowIfNull(membership);

        var client = await GetAuthenticatedClientAsync();

        var entity = GroupMembershipEntity.FromGroupMembership(membership);
        var response = await client
            .From<GroupMembershipEntity>()
            .Insert(entity);

        var created = response.Models.FirstOrDefault();
        if (created == null)
        {
            throw new InvalidOperationException("Failed to add member to group.");
        }

        return created.ToGroupMembership();
    }

    /// <inheritdoc />
    public async Task<bool> RemoveMemberAsync(Guid groupId, Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        try
        {
            await client
                .From<GroupMembershipEntity>()
                .Where(x => x.GroupId == groupId && x.UserId == userId)
                .Delete();

            return true;
        }
        catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    /// <inheritdoc />
    public async Task<GroupMembership> UpdateMemberRoleAsync(Guid groupId, Guid userId, MemberRole role)
    {
        var client = await GetAuthenticatedClientAsync();

        // Get the existing membership
        var existing = await client
            .From<GroupMembershipEntity>()
            .Where(x => x.GroupId == groupId && x.UserId == userId)
            .Single();

        if (existing == null)
        {
            throw new KeyNotFoundException($"Membership not found for user {userId} in group {groupId}");
        }

        existing.Role = role.ToString().ToLowerInvariant();

        var response = await client
            .From<GroupMembershipEntity>()
            .Update(existing);

        var updated = response.Models.FirstOrDefault();
        if (updated == null)
        {
            throw new InvalidOperationException("Failed to update member role.");
        }

        return updated.ToGroupMembership();
    }

    /// <inheritdoc />
    public async Task<Group?> GetByJoinCodeAsync(string joinCode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(joinCode);

        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<GroupEntity>()
            .Where(x => x.JoinCode == joinCode)
            .Single();

        if (response == null)
        {
            return null;
        }

        var memberCount = await GetMemberCountAsync(response.Id);
        return response.ToGroup(memberCount);
    }

    /// <inheritdoc />
    public async Task<GroupMembership?> GetMembershipAsync(Guid groupId, Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<GroupMembershipEntity>()
            .Where(x => x.GroupId == groupId && x.UserId == userId)
            .Single();

        return response?.ToGroupMembership();
    }

    /// <inheritdoc />
    public async Task<List<LeaderboardEntry>> GetLeaderboardAsync(Guid groupId, DateRange period)
    {
        ArgumentNullException.ThrowIfNull(period);

        var client = await GetAuthenticatedClientAsync();

        // Use database function for efficient server-side aggregation
        var response = await client.Rpc("get_group_leaderboard", new Dictionary<string, object>
        {
            { "p_group_id", groupId },
            { "p_start_date", period.StartDate.ToString("yyyy-MM-dd") },
            { "p_end_date", period.EndDate.ToString("yyyy-MM-dd") }
        });

        // Parse the JSON response from the database function
        var entries = System.Text.Json.JsonSerializer
            .Deserialize<List<LeaderboardEntryResult>>(response.Content ?? string.Empty)
            ?? new List<LeaderboardEntryResult>();

        // Map to domain model
        return entries.Select(r => new LeaderboardEntry
        {
            Rank = (int)r.Rank,
            UserId = r.UserId,
            DisplayName = r.DisplayName,
            AvatarUrl = r.AvatarUrl,
            TotalSteps = (int)r.TotalSteps,
            TotalDistanceMeters = r.TotalDistanceMeters
        }).ToList();
    }

    /// <inheritdoc />
    public async Task<int> GetMemberCountAsync(Guid groupId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<GroupMembershipEntity>()
            .Where(x => x.GroupId == groupId)
            .Get();

        return response.Models.Count;
    }

    private async Task<Supabase.Client> GetAuthenticatedClientAsync()
    {
        if (_httpContextAccessor.HttpContext?.Items.TryGetValue("SupabaseToken", out var tokenObj) != true)
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        var token = tokenObj as string;
        if (string.IsNullOrEmpty(token))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        return await _clientFactory.CreateClientAsync(token);
    }

    /// <summary>
    /// Result model for leaderboard database function.
    /// </summary>
    private class LeaderboardEntryResult
    {
        public long Rank { get; set; }
        public Guid UserId { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public long TotalSteps { get; set; }
        public double TotalDistanceMeters { get; set; }
    }
}
