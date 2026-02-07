namespace Stepper.Api.Notifications.DTOs;

/// <summary>
/// Response DTO for unread notification count.
/// </summary>
public record UnreadCountResponse
{
    /// <summary>
    /// Gets the count of unread notifications.
    /// </summary>
    public int Count { get; init; }
}
