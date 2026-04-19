namespace Stepper.Api.Steps.DTOs;

/// <summary>
/// Response DTO containing comprehensive step statistics.
/// </summary>
public record StepStatsResponse(
    /// <summary>Today's total step count.</summary>
    int TodaySteps,
    /// <summary>Today's total distance in meters.</summary>
    double TodayDistance,
    /// <summary>This week's total step count (Monday to Sunday).</summary>
    int WeekSteps,
    /// <summary>This week's total distance in meters.</summary>
    double WeekDistance,
    /// <summary>
    /// Average steps per day over the days in the current week (Monday to Sunday)
    /// that have recorded activity. Excludes future days and days with zero steps so
    /// the value reflects the user's actual averaged activity, not a divide-by-7.
    /// </summary>
    int WeekAverage,
    /// <summary>This month's total step count.</summary>
    int MonthSteps,
    /// <summary>This month's total distance in meters.</summary>
    double MonthDistance,
    /// <summary>Current consecutive days meeting the daily goal.</summary>
    int CurrentStreak,
    /// <summary>Longest streak of consecutive days meeting the daily goal.</summary>
    int LongestStreak,
    /// <summary>User's daily step goal.</summary>
    int DailyGoal
);
