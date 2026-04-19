namespace Stepper.Api.Users.DTOs;

/// <summary>
/// Request model for updating user preferences.
/// All fields are optional - only non-null values will be updated.
/// </summary>
/// <param name="NotificationsEnabled">Whether notifications are enabled for daily reminders.</param>
/// <param name="DailyStepGoal">The user's daily step goal (must be positive if provided).</param>
/// <param name="DistanceUnit">The unit of measurement for distance ('metric' or 'imperial').</param>
/// <param name="PrivacyProfileVisibility">Who can view the profile: 'public', 'partial', or 'private'.</param>
/// <param name="PrivacyFindMe">Who can find the user via search: 'public', 'partial', or 'private'.</param>
/// <param name="PrivacyShowSteps">Who can view the user's step/activity data: 'public', 'partial', or 'private'.</param>
public record UpdateUserPreferencesRequest(
    bool? NotificationsEnabled,
    int? DailyStepGoal,
    string? DistanceUnit,
    string? PrivacyProfileVisibility,
    string? PrivacyFindMe,
    string? PrivacyShowSteps
);
