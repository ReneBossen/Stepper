using System.Net;
using Supabase;
using WalkingApp.Api.Common.Database;

namespace WalkingApp.Api.Notifications;

/// <summary>
/// Repository implementation for notification data access using Supabase.
/// </summary>
public class NotificationRepository : INotificationRepository
{
    private readonly ISupabaseClientFactory _clientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public NotificationRepository(
        ISupabaseClientFactory clientFactory,
        IHttpContextAccessor httpContextAccessor)
    {
        ArgumentNullException.ThrowIfNull(clientFactory);
        ArgumentNullException.ThrowIfNull(httpContextAccessor);

        _clientFactory = clientFactory;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <inheritdoc />
    public async Task<(List<Notification> Notifications, int TotalCount, int UnreadCount)> GetAllAsync(
        Guid userId,
        int limit,
        int offset)
    {
        var client = await GetAuthenticatedClientAsync();

        var notifications = await FetchNotificationsAsync(client, userId, limit, offset);
        var totalCount = await GetTotalCountAsync(client, userId);
        var unreadCount = await GetUnreadCountInternalAsync(client, userId);

        return (notifications, totalCount, unreadCount);
    }

    /// <inheritdoc />
    public async Task<int> GetUnreadCountAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();
        return await GetUnreadCountInternalAsync(client, userId);
    }

    /// <inheritdoc />
    public async Task<Notification?> GetByIdAsync(Guid id)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<NotificationEntity>()
            .Where(x => x.Id == id)
            .Single();

        return response?.ToNotification();
    }

    /// <inheritdoc />
    public async Task<bool> MarkAsReadAsync(Guid id)
    {
        var client = await GetAuthenticatedClientAsync();

        try
        {
            await client
                .From<NotificationEntity>()
                .Where(x => x.Id == id)
                .Set(x => x.IsRead, true)
                .Update();

            return true;
        }
        catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    /// <inheritdoc />
    public async Task<int> MarkAllAsReadAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<NotificationEntity>()
            .Where(x => x.UserId == userId && x.IsRead == false)
            .Set(x => x.IsRead, true)
            .Update();

        return response.Models.Count;
    }

    /// <inheritdoc />
    public async Task<bool> DeleteAsync(Guid id)
    {
        var client = await GetAuthenticatedClientAsync();

        try
        {
            await client
                .From<NotificationEntity>()
                .Where(x => x.Id == id)
                .Delete();

            return true;
        }
        catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    private async Task<List<Notification>> FetchNotificationsAsync(
        Supabase.Client client,
        Guid userId,
        int limit,
        int offset)
    {
        var response = await client
            .From<NotificationEntity>()
            .Where(x => x.UserId == userId)
            .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending)
            .Range(offset, offset + limit - 1)
            .Get();

        return response.Models.Select(e => e.ToNotification()).ToList();
    }

    private static async Task<int> GetTotalCountAsync(Supabase.Client client, Guid userId)
    {
        var countResponse = await client
            .From<NotificationEntity>()
            .Where(x => x.UserId == userId)
            .Count(Supabase.Postgrest.Constants.CountType.Exact);

        return countResponse;
    }

    private static async Task<int> GetUnreadCountInternalAsync(Supabase.Client client, Guid userId)
    {
        var countResponse = await client
            .From<NotificationEntity>()
            .Where(x => x.UserId == userId && x.IsRead == false)
            .Count(Supabase.Postgrest.Constants.CountType.Exact);

        return countResponse;
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
