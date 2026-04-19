namespace Stepper.Api.Common;

/// <summary>
/// Helpers for resolving the current calendar week (Monday to Sunday).
/// </summary>
public static class WeekRange
{
    /// <summary>
    /// Returns the Monday and Sunday bounding the calendar week that contains today (UTC).
    /// </summary>
    public static (DateOnly Start, DateOnly End) GetCurrentWeek()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var dayOfWeek = today.DayOfWeek;

        var daysFromMonday = dayOfWeek == DayOfWeek.Sunday ? 6 : (int)dayOfWeek - 1;
        var monday = today.AddDays(-daysFromMonday);
        var sunday = monday.AddDays(6);

        return (monday, sunday);
    }
}
