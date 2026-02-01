namespace Stepper.Api.Users.DTOs;

/// <summary>
/// Main response containing all user data for GDPR data export.
/// </summary>
/// <param name="ExportMetadata">Metadata about the export.</param>
/// <param name="Profile">User profile information.</param>
/// <param name="Preferences">User preferences and settings.</param>
/// <param name="StepHistory">All step entries for the user.</param>
/// <param name="Friendships">All friendships for the user.</param>
/// <param name="GroupMemberships">All group memberships for the user.</param>
/// <param name="ActivityFeed">All activity feed items for the user.</param>
/// <param name="Notifications">All notifications for the user.</param>
public record UserDataExportResponse(
    ExportMetadata ExportMetadata,
    ExportedProfile Profile,
    ExportedPreferences Preferences,
    List<ExportedStepEntry> StepHistory,
    List<ExportedFriendship> Friendships,
    List<ExportedGroupMembership> GroupMemberships,
    List<ExportedActivityItem> ActivityFeed,
    List<ExportedNotification> Notifications
);

/// <summary>
/// Metadata about the data export.
/// </summary>
/// <param name="ExportedAt">Timestamp when the export was generated.</param>
/// <param name="UserId">The ID of the user whose data was exported.</param>
/// <param name="DataFormat">Format version identifier for the export.</param>
public record ExportMetadata(
    DateTime ExportedAt,
    Guid UserId,
    string DataFormat
);

/// <summary>
/// Exported user profile data.
/// </summary>
/// <param name="Id">The user's unique identifier.</param>
/// <param name="Email">The user's email address.</param>
/// <param name="DisplayName">The user's display name.</param>
/// <param name="AvatarUrl">URL to the user's avatar image.</param>
/// <param name="QrCodeId">The user's QR code identifier for friend discovery.</param>
/// <param name="OnboardingCompleted">Whether the user has completed onboarding.</param>
/// <param name="CreatedAt">When the user account was created.</param>
public record ExportedProfile(
    Guid Id,
    string? Email,
    string DisplayName,
    string? AvatarUrl,
    string QrCodeId,
    bool OnboardingCompleted,
    DateTime CreatedAt
);

/// <summary>
/// Exported user preferences data.
/// </summary>
/// <param name="DailyStepGoal">The user's daily step goal.</param>
/// <param name="Units">Unit of measurement (metric or imperial).</param>
/// <param name="NotificationsEnabled">Whether notifications are globally enabled.</param>
/// <param name="NotifyDailyReminder">Whether daily reminder notifications are enabled.</param>
/// <param name="NotifyFriendRequests">Whether friend request notifications are enabled.</param>
/// <param name="NotifyGroupInvites">Whether group invite notifications are enabled.</param>
/// <param name="NotifyAchievements">Whether achievement notifications are enabled.</param>
/// <param name="PrivacyProfileVisibility">Profile visibility setting (public, friends, private).</param>
/// <param name="PrivacyFindMe">Who can find the user (public, friends, private).</param>
/// <param name="PrivacyShowSteps">Who can see the user's steps (public, friends, partial, private).</param>
public record ExportedPreferences(
    int DailyStepGoal,
    string Units,
    bool NotificationsEnabled,
    bool NotifyDailyReminder,
    bool NotifyFriendRequests,
    bool NotifyGroupInvites,
    bool NotifyAchievements,
    string PrivacyProfileVisibility,
    string PrivacyFindMe,
    string PrivacyShowSteps
);

/// <summary>
/// Exported step entry data.
/// </summary>
/// <param name="Date">The date of the step entry.</param>
/// <param name="StepCount">Number of steps recorded.</param>
/// <param name="DistanceMeters">Distance in meters, if available.</param>
/// <param name="Source">Source of the step data (e.g., healthkit, manual).</param>
/// <param name="RecordedAt">When the entry was recorded.</param>
public record ExportedStepEntry(
    DateOnly Date,
    int StepCount,
    double? DistanceMeters,
    string? Source,
    DateTime RecordedAt
);

/// <summary>
/// Exported friendship data.
/// </summary>
/// <param name="FriendId">The friend's user ID.</param>
/// <param name="FriendDisplayName">The friend's display name.</param>
/// <param name="Status">Current status of the friendship.</param>
/// <param name="InitiatedByMe">Whether the current user initiated the friendship.</param>
/// <param name="CreatedAt">When the friendship was created.</param>
public record ExportedFriendship(
    Guid FriendId,
    string FriendDisplayName,
    string Status,
    bool InitiatedByMe,
    DateTime CreatedAt
);

/// <summary>
/// Exported group membership data.
/// </summary>
/// <param name="GroupId">The group's unique identifier.</param>
/// <param name="GroupName">The name of the group.</param>
/// <param name="Role">The user's role in the group.</param>
/// <param name="JoinedAt">When the user joined the group.</param>
public record ExportedGroupMembership(
    Guid GroupId,
    string GroupName,
    string Role,
    DateTime JoinedAt
);

/// <summary>
/// Exported activity feed item data.
/// </summary>
/// <param name="Id">The activity's unique identifier.</param>
/// <param name="Type">The type of activity.</param>
/// <param name="Message">Human-readable message describing the activity.</param>
/// <param name="CreatedAt">When the activity was created.</param>
public record ExportedActivityItem(
    Guid Id,
    string Type,
    string Message,
    DateTime CreatedAt
);

/// <summary>
/// Exported notification data.
/// </summary>
/// <param name="Id">The notification's unique identifier.</param>
/// <param name="Type">The type of notification.</param>
/// <param name="Title">The notification title.</param>
/// <param name="Body">The notification body/message.</param>
/// <param name="CreatedAt">When the notification was created.</param>
/// <param name="ReadAt">When the notification was read, if applicable.</param>
public record ExportedNotification(
    Guid Id,
    string Type,
    string Title,
    string Body,
    DateTime CreatedAt,
    DateTime? ReadAt
);
