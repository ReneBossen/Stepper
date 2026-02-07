namespace Stepper.Api.Notifications.DTOs;

/// <summary>
/// Response DTO for a single notification.
/// </summary>
public record NotificationResponse
{
    /// <summary>
    /// Gets the notification ID.
    /// </summary>
    public Guid Id { get; init; }

    /// <summary>
    /// Gets the user ID.
    /// </summary>
    public Guid UserId { get; init; }

    /// <summary>
    /// Gets the notification type as a string.
    /// </summary>
    public string Type { get; init; } = string.Empty;

    /// <summary>
    /// Gets the notification title.
    /// </summary>
    public string Title { get; init; } = string.Empty;

    /// <summary>
    /// Gets the notification message.
    /// </summary>
    public string Message { get; init; } = string.Empty;

    /// <summary>
    /// Gets whether the notification has been read.
    /// </summary>
    public bool IsRead { get; init; }

    /// <summary>
    /// Gets additional metadata as a JSON string.
    /// </summary>
    public string? Data { get; init; }

    /// <summary>
    /// Gets the creation timestamp.
    /// </summary>
    public DateTime CreatedAt { get; init; }
}
