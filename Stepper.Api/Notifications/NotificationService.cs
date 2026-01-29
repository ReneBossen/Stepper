using Stepper.Api.Notifications.DTOs;

namespace Stepper.Api.Notifications;

/// <summary>
/// Service implementation for notification business logic.
/// </summary>
public class NotificationService : INotificationService
{
    private const int DefaultLimit = 20;
    private const int MaxLimit = 100;
    private const int MinOffset = 0;

    private readonly INotificationRepository _repository;

    public NotificationService(INotificationRepository repository)
    {
        ArgumentNullException.ThrowIfNull(repository);
        _repository = repository;
    }

    /// <inheritdoc />
    public async Task<NotificationListResponse> GetAllAsync(Guid userId, int limit = DefaultLimit, int offset = 0)
    {
        ValidateUserId(userId);
        var (normalizedLimit, normalizedOffset) = NormalizePaginationParams(limit, offset);

        var (notifications, totalCount, unreadCount) = await _repository.GetAllAsync(
            userId,
            normalizedLimit,
            normalizedOffset);

        return BuildListResponse(notifications, totalCount, unreadCount, normalizedLimit, normalizedOffset);
    }

    /// <inheritdoc />
    public async Task<UnreadCountResponse> GetUnreadCountAsync(Guid userId)
    {
        ValidateUserId(userId);

        var count = await _repository.GetUnreadCountAsync(userId);

        return new UnreadCountResponse { Count = count };
    }

    /// <inheritdoc />
    public async Task MarkAsReadAsync(Guid userId, Guid notificationId)
    {
        ValidateUserId(userId);
        ValidateNotificationId(notificationId);

        var notification = await GetNotificationWithOwnershipCheck(userId, notificationId);

        if (notification.IsRead)
        {
            return;
        }

        await _repository.MarkAsReadAsync(notificationId);
    }

    /// <inheritdoc />
    public async Task MarkAllAsReadAsync(Guid userId)
    {
        ValidateUserId(userId);

        await _repository.MarkAllAsReadAsync(userId);
    }

    /// <inheritdoc />
    public async Task DeleteAsync(Guid userId, Guid notificationId)
    {
        ValidateUserId(userId);
        ValidateNotificationId(notificationId);

        await GetNotificationWithOwnershipCheck(userId, notificationId);

        await _repository.DeleteAsync(notificationId);
    }

    private async Task<Notification> GetNotificationWithOwnershipCheck(Guid userId, Guid notificationId)
    {
        var notification = await _repository.GetByIdAsync(notificationId);

        EnsureNotificationExists(notification, notificationId);
        EnsureUserOwnsNotification(notification!, userId);

        return notification!;
    }

    private static void ValidateUserId(Guid userId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }
    }

    private static void ValidateNotificationId(Guid notificationId)
    {
        if (notificationId == Guid.Empty)
        {
            throw new ArgumentException("Notification ID cannot be empty.", nameof(notificationId));
        }
    }

    private static (int Limit, int Offset) NormalizePaginationParams(int limit, int offset)
    {
        var normalizedLimit = limit < 1 ? DefaultLimit : Math.Min(limit, MaxLimit);
        var normalizedOffset = Math.Max(offset, MinOffset);

        return (normalizedLimit, normalizedOffset);
    }

    private static void EnsureNotificationExists(Notification? notification, Guid notificationId)
    {
        if (notification == null)
        {
            throw new KeyNotFoundException($"Notification not found with ID: {notificationId}");
        }
    }

    private static void EnsureUserOwnsNotification(Notification notification, Guid userId)
    {
        if (notification.UserId != userId)
        {
            throw new UnauthorizedAccessException("You do not have permission to access this notification.");
        }
    }

    private static NotificationListResponse BuildListResponse(
        List<Notification> notifications,
        int totalCount,
        int unreadCount,
        int limit,
        int offset)
    {
        var items = notifications.Select(MapToResponse).ToList();
        var hasMore = offset + items.Count < totalCount;

        return new NotificationListResponse
        {
            Items = items,
            TotalCount = totalCount,
            UnreadCount = unreadCount,
            HasMore = hasMore
        };
    }

    private static NotificationResponse MapToResponse(Notification notification)
    {
        return new NotificationResponse
        {
            Id = notification.Id,
            UserId = notification.UserId,
            Type = ConvertTypeToString(notification.Type),
            Title = notification.Title,
            Message = notification.Message,
            IsRead = notification.IsRead,
            Data = notification.Data,
            CreatedAt = notification.CreatedAt
        };
    }

    private static string ConvertTypeToString(NotificationType type)
    {
        return type switch
        {
            NotificationType.FriendRequest => "friend_request",
            NotificationType.FriendAccepted => "friend_accepted",
            NotificationType.GroupInvite => "group_invite",
            NotificationType.GoalAchieved => "goal_achieved",
            _ => "general"
        };
    }
}
