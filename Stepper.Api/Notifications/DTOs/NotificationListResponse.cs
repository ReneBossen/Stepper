namespace Stepper.Api.Notifications.DTOs;

/// <summary>
/// Response DTO for a paginated list of notifications.
/// </summary>
public record NotificationListResponse
{
    /// <summary>
    /// Gets the list of notifications.
    /// </summary>
    public List<NotificationResponse> Items { get; init; } = new();

    /// <summary>
    /// Gets the total count of notifications.
    /// </summary>
    public int TotalCount { get; init; }

    /// <summary>
    /// Gets the count of unread notifications.
    /// </summary>
    public int UnreadCount { get; init; }

    /// <summary>
    /// Gets whether there are more notifications to load.
    /// </summary>
    public bool HasMore { get; init; }
}
