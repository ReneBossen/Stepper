using Supabase;
using Stepper.Api.Common.Database;

namespace Stepper.Api.Activity;

/// <summary>
/// Repository implementation for activity feed data access using Supabase.
/// </summary>
public class ActivityRepository : IActivityRepository
{
    private readonly ISupabaseClientFactory _clientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;

    /// <summary>
    /// Initializes a new instance of the <see cref="ActivityRepository"/> class.
    /// </summary>
    /// <param name="clientFactory">The Supabase client factory.</param>
    /// <param name="httpContextAccessor">The HTTP context accessor.</param>
    public ActivityRepository(
        ISupabaseClientFactory clientFactory,
        IHttpContextAccessor httpContextAccessor)
    {
        ArgumentNullException.ThrowIfNull(clientFactory);
        ArgumentNullException.ThrowIfNull(httpContextAccessor);

        _clientFactory = clientFactory;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <inheritdoc />
    public async Task<List<ActivityItem>> GetFeedAsync(Guid userId, List<Guid> friendIds, int limit, int offset)
    {
        var client = await GetAuthenticatedClientAsync();

        var allUserIds = BuildUserIdList(userId, friendIds);
        var activities = await FetchActivitiesAsync(client, allUserIds, limit, offset);

        return activities;
    }

    /// <inheritdoc />
    public async Task<int> GetFeedCountAsync(Guid userId, List<Guid> friendIds)
    {
        var client = await GetAuthenticatedClientAsync();

        var allUserIds = BuildUserIdList(userId, friendIds);
        var count = await CountActivitiesAsync(client, allUserIds);

        return count;
    }

    private static List<Guid> BuildUserIdList(Guid userId, List<Guid> friendIds)
    {
        var allUserIds = new List<Guid> { userId };
        allUserIds.AddRange(friendIds);
        return allUserIds;
    }

    private static async Task<List<ActivityItem>> FetchActivitiesAsync(
        Client client,
        List<Guid> userIds,
        int limit,
        int offset)
    {
        var userIdStrings = userIds.Select(id => id.ToString()).ToList();

        var response = await client
            .From<ActivityItemEntity>()
            .Filter("user_id", Supabase.Postgrest.Constants.Operator.In, userIdStrings)
            .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending)
            .Range(offset, offset + limit - 1)
            .Get();

        return response.Models.Select(e => e.ToActivityItem()).ToList();
    }

    private static async Task<int> CountActivitiesAsync(Client client, List<Guid> userIds)
    {
        var userIdStrings = userIds.Select(id => id.ToString()).ToList();

        // Fetch all matching activities with just the ID to count
        // Note: In a production system with large datasets, you would use
        // a database function (RPC) for efficient counting
        var response = await client
            .From<ActivityItemEntity>()
            .Select("id")
            .Filter("user_id", Supabase.Postgrest.Constants.Operator.In, userIdStrings)
            .Get();

        return response.Models.Count;
    }

    /// <inheritdoc />
    public async Task<ActivityItem?> GetByIdAsync(Guid id)
    {
        var client = await GetAuthenticatedClientAsync();
        var activity = await FetchActivityByIdAsync(client, id);

        return activity;
    }

    private static async Task<ActivityItem?> FetchActivityByIdAsync(Client client, Guid id)
    {
        var response = await client
            .From<ActivityItemEntity>()
            .Filter("id", Supabase.Postgrest.Constants.Operator.Equals, id.ToString())
            .Single();

        return response?.ToActivityItem();
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
