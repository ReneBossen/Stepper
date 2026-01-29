namespace Stepper.Api.Users.DTOs;

/// <summary>
/// Response model containing user preferences.
/// </summary>
/// <param name="NotificationsEnabled">Whether notifications are enabled for daily reminders.</param>
/// <param name="DailyStepGoal">The user's daily step goal.</param>
/// <param name="DistanceUnit">The unit of measurement for distance ('metric' or 'imperial').</param>
/// <param name="PrivateProfile">Whether the user's profile is private.</param>
public record UserPreferencesResponse(
    bool NotificationsEnabled,
    int DailyStepGoal,
    string DistanceUnit,
    bool PrivateProfile
);
