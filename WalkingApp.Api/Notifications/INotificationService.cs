using WalkingApp.Api.Notifications.DTOs;

namespace WalkingApp.Api.Notifications;

/// <summary>
/// Service interface for notification business logic.
/// </summary>
public interface INotificationService
{
    /// <summary>
    /// Gets all notifications for a user with pagination.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="limit">Maximum number of notifications to return (default: 20).</param>
    /// <param name="offset">Number of notifications to skip (default: 0).</param>
    /// <returns>The paginated notification list response.</returns>
    Task<NotificationListResponse> GetAllAsync(Guid userId, int limit = 20, int offset = 0);

    /// <summary>
    /// Gets the count of unread notifications for a user.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>The unread count response.</returns>
    Task<UnreadCountResponse> GetUnreadCountAsync(Guid userId);

    /// <summary>
    /// Marks a notification as read.
    /// </summary>
    /// <param name="userId">The user ID (for authorization).</param>
    /// <param name="notificationId">The notification ID.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task MarkAsReadAsync(Guid userId, Guid notificationId);

    /// <summary>
    /// Marks all notifications as read for a user.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task MarkAllAsReadAsync(Guid userId);

    /// <summary>
    /// Deletes a notification.
    /// </summary>
    /// <param name="userId">The user ID (for authorization).</param>
    /// <param name="notificationId">The notification ID.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task DeleteAsync(Guid userId, Guid notificationId);
}
