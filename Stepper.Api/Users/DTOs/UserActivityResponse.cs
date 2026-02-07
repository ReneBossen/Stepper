namespace Stepper.Api.Users.DTOs;

/// <summary>
/// Response model containing weekly activity summary.
/// </summary>
public record UserActivityResponse
{
    /// <summary>
    /// Total steps taken in the last 7 days.
    /// </summary>
    public int TotalSteps { get; init; }

    /// <summary>
    /// Total distance in meters for the last 7 days.
    /// </summary>
    public double TotalDistanceMeters { get; init; }

    /// <summary>
    /// Average steps per day over the last 7 days.
    /// </summary>
    public int AverageStepsPerDay { get; init; }

    /// <summary>
    /// Current streak of consecutive days with activity.
    /// </summary>
    public int CurrentStreak { get; init; }
}
