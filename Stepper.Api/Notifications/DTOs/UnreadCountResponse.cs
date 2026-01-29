namespace Stepper.Api.Notifications.DTOs;

/// <summary>
/// Response DTO for unread notification count.
/// </summary>
public class UnreadCountResponse
{
    /// <summary>
    /// Gets or sets the count of unread notifications.
    /// </summary>
    public int Count { get; set; }
}
