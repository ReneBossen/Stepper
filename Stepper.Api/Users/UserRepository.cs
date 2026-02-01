using Supabase;
using Stepper.Api.Common.Constants;
using Stepper.Api.Common.Database;

namespace Stepper.Api.Users;

/// <summary>
/// Repository implementation for user data access using Supabase.
/// </summary>
public class UserRepository : IUserRepository
{
    private readonly ISupabaseClientFactory _clientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public UserRepository(
        ISupabaseClientFactory clientFactory,
        IHttpContextAccessor httpContextAccessor)
    {
        ArgumentNullException.ThrowIfNull(clientFactory);
        ArgumentNullException.ThrowIfNull(httpContextAccessor);

        _clientFactory = clientFactory;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <inheritdoc />
    public async Task<User?> GetByIdAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<UserEntity>()
            .Where(x => x.Id == userId)
            .Single();

        return response?.ToUser();
    }

    /// <inheritdoc />
    public async Task<User> CreateAsync(User user)
    {
        ArgumentNullException.ThrowIfNull(user);

        var client = await GetAuthenticatedClientAsync();

        var entity = UserEntity.FromUser(user);
        var response = await client
            .From<UserEntity>()
            .Insert(entity);

        var created = response.Models.FirstOrDefault();
        if (created == null)
        {
            throw new InvalidOperationException("Failed to create user profile.");
        }

        return created.ToUser();
    }

    /// <inheritdoc />
    public async Task<User> UpdateAsync(User user)
    {
        ArgumentNullException.ThrowIfNull(user);

        var client = await GetAuthenticatedClientAsync();

        var entity = UserEntity.FromUser(user);
        var response = await client
            .From<UserEntity>()
            .Update(entity);

        var updated = response.Models.FirstOrDefault();
        if (updated == null)
        {
            throw new InvalidOperationException("Failed to update user profile.");
        }

        return updated.ToUser();
    }

    /// <inheritdoc />
    public async Task<User> UpsertAsync(User user)
    {
        ArgumentNullException.ThrowIfNull(user);

        var client = await GetAuthenticatedClientAsync();

        var entity = UserEntity.FromUser(user);

        // Use Upsert with ignoreDuplicates to insert only if not exists
        var response = await client
            .From<UserEntity>()
            .Upsert(entity, new Supabase.Postgrest.QueryOptions { Upsert = true });

        var result = response.Models.FirstOrDefault();
        if (result == null)
        {
            // If upsert didn't return anything, the row already exists - fetch it
            var existing = await client
                .From<UserEntity>()
                .Where(x => x.Id == user.Id)
                .Single();

            if (existing == null)
            {
                throw new InvalidOperationException("Failed to create or retrieve user profile.");
            }

            return existing.ToUser();
        }

        return result.ToUser();
    }

    /// <inheritdoc />
    public async Task<List<User>> GetByIdsAsync(List<Guid> userIds)
    {
        ArgumentNullException.ThrowIfNull(userIds);

        if (userIds.Count == 0)
        {
            return new List<User>();
        }

        var client = await GetAuthenticatedClientAsync();

        // Build IN clause filter - format: "id.in.(uuid1,uuid2,uuid3)"
        var idsString = string.Join(",", userIds);
        var response = await client
            .From<UserEntity>()
            .Filter("id", Supabase.Postgrest.Constants.Operator.In, $"({idsString})")
            .Get();

        return response.Models.Select(e => e.ToUser()).ToList();
    }

    /// <inheritdoc />
    public async Task<int> GetFriendsCountAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        // Count friendships where user is requester with status='accepted'
        var asRequester = await client
            .From<FriendshipQueryEntity>()
            .Where(x => x.RequesterId == userId && x.Status == FriendshipStatusStrings.Accepted)
            .Get();

        // Count friendships where user is addressee with status='accepted'
        var asAddressee = await client
            .From<FriendshipQueryEntity>()
            .Where(x => x.AddresseeId == userId && x.Status == FriendshipStatusStrings.Accepted)
            .Get();

        return asRequester.Models.Count + asAddressee.Models.Count;
    }

    /// <inheritdoc />
    public async Task<int> GetGroupsCountAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<GroupMembershipQueryEntity>()
            .Where(x => x.UserId == userId)
            .Get();

        return response.Models.Count;
    }

    /// <inheritdoc />
    public async Task<List<(int StepCount, double? DistanceMeters, DateOnly Date)>> GetStepEntriesForRangeAsync(
        Guid userId,
        DateOnly startDate,
        DateOnly endDate)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<StepEntryQueryEntity>()
            .Where(x => x.UserId == userId && x.Date >= startDate && x.Date <= endDate)
            .Get();

        return response.Models
            .Select(e => (e.StepCount, e.DistanceMeters, e.Date))
            .ToList();
    }

    /// <inheritdoc />
    public async Task<List<DateOnly>> GetActivityDatesAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<StepEntryQueryEntity>()
            .Where(x => x.UserId == userId)
            .Order("date", Supabase.Postgrest.Constants.Ordering.Descending)
            .Get();

        // Get distinct dates ordered descending
        return response.Models
            .Select(e => e.Date)
            .Distinct()
            .OrderByDescending(d => d)
            .ToList();
    }

    /// <inheritdoc />
    public async Task<List<Guid>> GetUserGroupIdsAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<GroupMembershipQueryEntity>()
            .Where(x => x.UserId == userId)
            .Get();

        return response.Models.Select(m => m.GroupId).ToList();
    }

    /// <inheritdoc />
    public async Task<List<(Guid Id, string Name)>> GetGroupsByIdsAsync(List<Guid> groupIds)
    {
        if (groupIds.Count == 0)
        {
            return new List<(Guid, string)>();
        }

        var client = await GetAuthenticatedClientAsync();

        var idsString = string.Join(",", groupIds);
        var response = await client
            .From<GroupQueryEntity>()
            .Filter("id", Supabase.Postgrest.Constants.Operator.In, $"({idsString})")
            .Get();

        return response.Models.Select(g => (g.Id, g.Name)).ToList();
    }

    private async Task<Client> GetAuthenticatedClientAsync()
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
