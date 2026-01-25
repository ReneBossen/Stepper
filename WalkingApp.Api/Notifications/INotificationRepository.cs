namespace WalkingApp.Api.Notifications;

/// <summary>
/// Repository interface for notification data access.
/// </summary>
public interface INotificationRepository
{
    /// <summary>
    /// Gets paginated notifications for a user.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="limit">Maximum number of notifications to return.</param>
    /// <param name="offset">Number of notifications to skip.</param>
    /// <returns>A tuple containing the notifications, total count, and unread count.</returns>
    Task<(List<Notification> Notifications, int TotalCount, int UnreadCount)> GetAllAsync(
        Guid userId,
        int limit,
        int offset);

    /// <summary>
    /// Gets the count of unread notifications for a user.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>The count of unread notifications.</returns>
    Task<int> GetUnreadCountAsync(Guid userId);

    /// <summary>
    /// Gets a notification by ID.
    /// </summary>
    /// <param name="id">The notification ID.</param>
    /// <returns>The notification, or null if not found.</returns>
    Task<Notification?> GetByIdAsync(Guid id);

    /// <summary>
    /// Marks a notification as read.
    /// </summary>
    /// <param name="id">The notification ID.</param>
    /// <returns>True if updated, false if not found.</returns>
    Task<bool> MarkAsReadAsync(Guid id);

    /// <summary>
    /// Marks all notifications as read for a user.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>The number of notifications marked as read.</returns>
    Task<int> MarkAllAsReadAsync(Guid userId);

    /// <summary>
    /// Deletes a notification by ID.
    /// </summary>
    /// <param name="id">The notification ID.</param>
    /// <returns>True if deleted, false if not found.</returns>
    Task<bool> DeleteAsync(Guid id);
}
