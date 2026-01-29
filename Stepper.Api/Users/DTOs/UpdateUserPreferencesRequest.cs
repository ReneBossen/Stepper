namespace Stepper.Api.Users.DTOs;

/// <summary>
/// Request model for updating user preferences.
/// All fields are optional - only non-null values will be updated.
/// </summary>
/// <param name="NotificationsEnabled">Whether notifications are enabled for daily reminders.</param>
/// <param name="DailyStepGoal">The user's daily step goal (must be positive if provided).</param>
/// <param name="DistanceUnit">The unit of measurement for distance ('metric' or 'imperial').</param>
/// <param name="PrivateProfile">Whether the user's profile is private.</param>
public record UpdateUserPreferencesRequest(
    bool? NotificationsEnabled,
    int? DailyStepGoal,
    string? DistanceUnit,
    bool? PrivateProfile
);
