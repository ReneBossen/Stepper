namespace WalkingApp.Api.Notifications.DTOs;

/// <summary>
/// Response DTO for a paginated list of notifications.
/// </summary>
public class NotificationListResponse
{
    /// <summary>
    /// Gets or sets the list of notifications.
    /// </summary>
    public List<NotificationResponse> Items { get; set; } = new();

    /// <summary>
    /// Gets or sets the total count of notifications.
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// Gets or sets the count of unread notifications.
    /// </summary>
    public int UnreadCount { get; set; }

    /// <summary>
    /// Gets or sets whether there are more notifications to load.
    /// </summary>
    public bool HasMore { get; set; }
}
