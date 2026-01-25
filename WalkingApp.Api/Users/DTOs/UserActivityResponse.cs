namespace WalkingApp.Api.Users.DTOs;

/// <summary>
/// Response model containing weekly activity summary.
/// </summary>
public class UserActivityResponse
{
    /// <summary>
    /// Total steps taken in the last 7 days.
    /// </summary>
    public int TotalSteps { get; set; }

    /// <summary>
    /// Total distance in meters for the last 7 days.
    /// </summary>
    public double TotalDistanceMeters { get; set; }

    /// <summary>
    /// Average steps per day over the last 7 days.
    /// </summary>
    public int AverageStepsPerDay { get; set; }

    /// <summary>
    /// Current streak of consecutive days with activity.
    /// </summary>
    public int CurrentStreak { get; set; }
}
