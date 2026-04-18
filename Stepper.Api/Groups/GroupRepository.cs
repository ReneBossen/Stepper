using System.Net;
using Supabase;
using Stepper.Api.Common.Database;
using Stepper.Api.Common.Models;

namespace Stepper.Api.Groups;

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
    public async Task<Guid> CreateGroupWithOwnerAsync(CreateGroupInput input)
    {
        ArgumentNullException.ThrowIfNull(input);

        var client = await GetAuthenticatedClientAsync();

        var response = await client.Rpc("create_group_with_owner", new Dictionary<string, object?>
        {
            { "p_name", input.Name },
            { "p_description", input.Description },
            { "p_is_public", input.IsPublic },
            { "p_period_type", input.PeriodType.ToString().ToLowerInvariant() },
            { "p_max_members", input.MaxMembers },
            { "p_join_code", input.JoinCode }
        });

        var content = response.Content;
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new InvalidOperationException("create_group_with_owner returned no group id.");
        }

        // Supabase returns the scalar UUID as a JSON string, e.g. "\"guid\"".
        var parsed = System.Text.Json.JsonSerializer.Deserialize<Guid>(content);
        if (parsed == Guid.Empty)
        {
            throw new InvalidOperationException("create_group_with_owner returned an empty group id.");
        }

        return parsed;
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
    public async Task<List<(Group Group, MemberRole Role, MembershipStatus Status)>> GetUserGroupsAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var memberships = await client
            .From<GroupMembershipEntity>()
            .Where(x => x.UserId == userId)
            .Get();

        if (memberships.Models.Count == 0)
        {
            return new List<(Group, MemberRole, MembershipStatus)>();
        }

        var groupIds = memberships.Models.Select(m => m.GroupId).ToList();
        var groups = await client
            .From<GroupEntity>()
            .Filter("id", Supabase.Postgrest.Constants.Operator.In, groupIds.Select(id => (object)id.ToString()).ToList())
            .Get();

        var memberCounts = new Dictionary<Guid, int>();
        foreach (var groupId in groupIds)
        {
            memberCounts[groupId] = await GetMemberCountAsync(groupId);
        }

        var groupDict = groups.Models
            .ToDictionary(
                g => g.Id,
                g => g.ToGroup(memberCounts.GetValueOrDefault(g.Id, 0))
            );

        var result = new List<(Group, MemberRole, MembershipStatus)>();
        foreach (var membershipEntity in memberships.Models)
        {
            if (groupDict.TryGetValue(membershipEntity.GroupId, out var group))
            {
                var domain = membershipEntity.ToGroupMembership();
                result.Add((group, domain.Role, domain.Status));
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
    public Task<List<GroupMembership>> GetMembersAsync(Guid groupId)
    {
        return GetMembersAsync(groupId, status: null);
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

        var joinCodeEntity = await client
            .From<GroupJoinCodeEntity>()
            .Where(x => x.JoinCode == joinCode)
            .Single();

        if (joinCodeEntity == null)
        {
            return null;
        }

        return await GetByIdAsync(joinCodeEntity.GroupId);
    }

    /// <inheritdoc />
    public async Task<string?> GetJoinCodeAsync(Guid groupId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<GroupJoinCodeEntity>()
            .Where(x => x.GroupId == groupId)
            .Single();

        return response?.JoinCode;
    }

    /// <inheritdoc />
    public async Task CreateJoinCodeAsync(Guid groupId, string joinCode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(joinCode);

        var client = await GetAuthenticatedClientAsync();

        var entity = new GroupJoinCodeEntity
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            JoinCode = joinCode,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await client.From<GroupJoinCodeEntity>().Insert(entity);
    }

    /// <inheritdoc />
    public async Task UpdateJoinCodeAsync(Guid groupId, string joinCode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(joinCode);

        var client = await GetAuthenticatedClientAsync();

        var existing = await client
            .From<GroupJoinCodeEntity>()
            .Where(x => x.GroupId == groupId)
            .Single();

        if (existing == null)
        {
            await CreateJoinCodeAsync(groupId, joinCode);
            return;
        }

        existing.JoinCode = joinCode;
        existing.UpdatedAt = DateTime.UtcNow;

        await client.From<GroupJoinCodeEntity>().Update(existing);
    }

    /// <inheritdoc />
    public async Task DeleteJoinCodeAsync(Guid groupId)
    {
        var client = await GetAuthenticatedClientAsync();

        await client
            .From<GroupJoinCodeEntity>()
            .Where(x => x.GroupId == groupId)
            .Delete();
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

    /// <inheritdoc />
    public async Task<List<Group>> SearchPublicGroupsAsync(string query, int limit)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(query);

        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<GroupEntity>()
            .Where(x => x.IsPublic == true)
            .Filter("name", Supabase.Postgrest.Constants.Operator.ILike, $"%{query}%")
            .Limit(limit)
            .Get();

        var groups = new List<Group>();
        foreach (var entity in response.Models)
        {
            var memberCount = await GetMemberCountAsync(entity.Id);
            groups.Add(entity.ToGroup(memberCount));
        }

        return groups;
    }

    /// <inheritdoc />
    public async Task<List<Group>> GetPublicGroupsAsync(int limit)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<GroupEntity>()
            .Where(x => x.IsPublic == true)
            .Limit(limit)
            .Get();

        var groups = new List<Group>();
        foreach (var entity in response.Models)
        {
            var memberCount = await GetMemberCountAsync(entity.Id);
            groups.Add(entity.ToGroup(memberCount));
        }

        return groups;
    }

    /// <inheritdoc />
    public async Task<List<(Group Group, MemberRole Role, DateTime JoinedAt)>> GetUserGroupMembershipsWithDetailsAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var memberships = await FetchUserMembershipsAsync(client, userId);

        if (memberships.Count == 0)
        {
            return [];
        }

        var groupIds = memberships.Select(m => m.GroupId).ToList();
        var groupDict = await FetchGroupsDictionaryAsync(client, groupIds);

        return BuildMembershipDetailsResult(memberships, groupDict);
    }

    private static async Task<List<GroupMembershipEntity>> FetchUserMembershipsAsync(
        Supabase.Client client,
        Guid userId)
    {
        var response = await client
            .From<GroupMembershipEntity>()
            .Where(x => x.UserId == userId)
            .Get();

        return response.Models;
    }

    private async Task<Dictionary<Guid, Group>> FetchGroupsDictionaryAsync(
        Supabase.Client client,
        List<Guid> groupIds)
    {
        var groupsResponse = await client
            .From<GroupEntity>()
            .Filter("id", Supabase.Postgrest.Constants.Operator.In, groupIds.Select(id => (object)id.ToString()).ToList())
            .Get();

        var memberCounts = new Dictionary<Guid, int>();
        foreach (var groupId in groupIds)
        {
            memberCounts[groupId] = await GetMemberCountAsync(groupId);
        }

        return groupsResponse.Models.ToDictionary(
            g => g.Id,
            g => g.ToGroup(memberCounts.GetValueOrDefault(g.Id, 0)));
    }

    private static List<(Group Group, MemberRole Role, DateTime JoinedAt)> BuildMembershipDetailsResult(
        List<GroupMembershipEntity> memberships,
        Dictionary<Guid, Group> groupDict)
    {
        var result = new List<(Group, MemberRole, DateTime)>();

        foreach (var membership in memberships)
        {
            if (groupDict.TryGetValue(membership.GroupId, out var group))
            {
                var domainMembership = membership.ToGroupMembership();
                result.Add((group, domainMembership.Role, domainMembership.JoinedAt));
            }
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<(Guid GroupId, MembershipStatus Status)> JoinGroupByCodeAsync(string code)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(code);

        var client = await GetAuthenticatedClientAsync();

        var response = await client.Rpc("join_group_by_code", new Dictionary<string, object?>
        {
            { "p_code", code }
        });

        return ParseJoinRpcResponse(response.Content, "join_group_by_code");
    }

    /// <inheritdoc />
    public async Task<(Guid GroupId, MembershipStatus Status)> JoinPublicGroupAsync(Guid groupId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client.Rpc("join_public_group", new Dictionary<string, object?>
        {
            { "p_group_id", groupId }
        });

        return ParseJoinRpcResponse(response.Content, "join_public_group");
    }

    /// <inheritdoc />
    public async Task<GroupMembership> ApproveMembershipAsync(Guid groupId, Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var existing = await client
            .From<GroupMembershipEntity>()
            .Where(x => x.GroupId == groupId && x.UserId == userId)
            .Single();

        if (existing == null)
        {
            throw new KeyNotFoundException($"Membership not found for user {userId} in group {groupId}");
        }

        existing.Status = "active";

        var response = await client
            .From<GroupMembershipEntity>()
            .Update(existing);

        var updated = response.Models.FirstOrDefault();
        if (updated == null)
        {
            throw new InvalidOperationException("Failed to approve membership.");
        }

        return updated.ToGroupMembership();
    }

    /// <inheritdoc />
    public async Task<List<GroupMembership>> GetMembersAsync(Guid groupId, MembershipStatus? status)
    {
        var client = await GetAuthenticatedClientAsync();

        var query = client
            .From<GroupMembershipEntity>()
            .Where(x => x.GroupId == groupId);

        if (status.HasValue)
        {
            var statusLiteral = status.Value.ToString().ToLowerInvariant();
            query = query.Where(x => x.Status == statusLiteral);
        }

        var response = await query
            .Order("joined_at", Supabase.Postgrest.Constants.Ordering.Ascending)
            .Get();

        return response.Models.Select(e => e.ToGroupMembership()).ToList();
    }

    /// <inheritdoc />
    public async Task<Guid> AdminAddMemberAsync(Guid groupId, Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client.Rpc("admin_add_member", new Dictionary<string, object?>
        {
            { "p_group_id", groupId },
            { "p_user_id", userId }
        });

        var content = response.Content;
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new InvalidOperationException("admin_add_member returned no membership id.");
        }

        var parsed = System.Text.Json.JsonSerializer.Deserialize<Guid>(content);
        if (parsed == Guid.Empty)
        {
            throw new InvalidOperationException("admin_add_member returned an empty membership id.");
        }

        return parsed;
    }

    /// <inheritdoc />
    public async Task LeaveGroupAsync(Guid groupId)
    {
        var client = await GetAuthenticatedClientAsync();

        await client.Rpc("leave_group", new Dictionary<string, object?>
        {
            { "p_group_id", groupId }
        });
    }

    private static (Guid GroupId, MembershipStatus Status) ParseJoinRpcResponse(string? content, string rpcName)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new InvalidOperationException($"{rpcName} returned no content.");
        }

        using var document = System.Text.Json.JsonDocument.Parse(content);
        var root = document.RootElement;

        // RETURNS TABLE is serialized as a JSON array of objects.
        var row = root.ValueKind == System.Text.Json.JsonValueKind.Array
            ? root.EnumerateArray().FirstOrDefault()
            : root;

        if (row.ValueKind != System.Text.Json.JsonValueKind.Object)
        {
            throw new InvalidOperationException($"{rpcName} returned unexpected shape: {content}");
        }

        var groupId = row.GetProperty("group_id").GetGuid();
        var statusString = row.GetProperty("membership_status").GetString() ?? "active";
        var status = statusString.ToLowerInvariant() switch
        {
            "active" => MembershipStatus.Active,
            "pending" => MembershipStatus.Pending,
            _ => throw new InvalidOperationException($"{rpcName} returned unknown status: {statusString}")
        };

        return (groupId, status);
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
}
