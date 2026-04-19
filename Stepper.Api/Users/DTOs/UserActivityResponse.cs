namespace Stepper.Api.Users.DTOs;

/// <summary>
/// Response model containing the current week's activity summary (Monday to Sunday).
/// </summary>
public record UserActivityResponse
{
    /// <summary>
    /// Total steps taken so far in the current week (Monday to Sunday).
    /// </summary>
    public int TotalSteps { get; init; }

    /// <summary>
    /// Total distance in meters for the current week (Monday to Sunday).
    /// </summary>
    public double TotalDistanceMeters { get; init; }

    /// <summary>
    /// Average steps per day over the days in the current week that have recorded
    /// activity. Excludes future days and days with zero steps so the value reflects
    /// the user's actual averaged activity, not a divide-by-7.
    /// </summary>
    public int AverageStepsPerDay { get; init; }

    /// <summary>
    /// Current streak of consecutive days with activity.
    /// </summary>
    public int CurrentStreak { get; init; }
}
