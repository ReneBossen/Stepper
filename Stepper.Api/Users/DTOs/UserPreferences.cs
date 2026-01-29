namespace Stepper.Api.Users.DTOs;

/// <summary>
/// User preferences stored as JSON in the users table.
/// </summary>
public class UserPreferences
{
    /// <summary>
    /// The unit of measurement for distance ('metric' or 'imperial').
    /// </summary>
    public string Units { get; set; } = "metric";

    /// <summary>
    /// The user's daily step goal.
    /// </summary>
    public int DailyStepGoal { get; set; } = 10000;

    /// <summary>
    /// Notification-related settings.
    /// </summary>
    public NotificationSettings Notifications { get; set; } = new();

    /// <summary>
    /// Privacy-related settings.
    /// </summary>
    public PrivacySettings Privacy { get; set; } = new();
}

/// <summary>
/// Notification-related user preferences.
/// </summary>
public class NotificationSettings
{
    /// <summary>
    /// Whether daily reminder notifications are enabled.
    /// </summary>
    public bool DailyReminder { get; set; } = true;

    /// <summary>
    /// Whether friend request notifications are enabled.
    /// </summary>
    public bool FriendRequests { get; set; } = true;

    /// <summary>
    /// Whether group invite notifications are enabled.
    /// </summary>
    public bool GroupInvites { get; set; } = true;

    /// <summary>
    /// Whether achievement notifications are enabled.
    /// </summary>
    public bool Achievements { get; set; } = true;
}

/// <summary>
/// Privacy-related user preferences.
/// </summary>
public class PrivacySettings
{
    /// <summary>
    /// Whether to show step data to friends.
    /// </summary>
    public bool ShowStepsToFriends { get; set; } = true;

    /// <summary>
    /// Whether to show group activity.
    /// </summary>
    public bool ShowGroupActivity { get; set; } = true;

    /// <summary>
    /// Whether to allow friend requests.
    /// </summary>
    public bool AllowFriendRequests { get; set; } = true;

    /// <summary>
    /// Whether the user's profile is private (hides from public searches).
    /// </summary>
    public bool PrivateProfile { get; set; } = false;
}
