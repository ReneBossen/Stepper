namespace Stepper.Api.Friends.DTOs;

/// <summary>
/// Response DTO for a friend's step data.
/// </summary>
public class FriendStepsResponse
{
    /// <summary>
    /// The user ID of the friend.
    /// </summary>
    public Guid FriendId { get; set; }

    /// <summary>
    /// The display name of the friend.
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// The total steps for today.
    /// </summary>
    public int TodaySteps { get; set; }

    /// <summary>
    /// The total steps for the current week.
    /// </summary>
    public int WeeklySteps { get; set; }
}
