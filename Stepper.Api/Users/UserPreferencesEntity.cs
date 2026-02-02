using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Stepper.Api.Users;

/// <summary>
/// Entity model for Supabase user_preferences table.
/// Maps to the typed columns in the user_preferences table.
/// </summary>
[Table("user_preferences")]
public class UserPreferencesEntity : BaseModel
{
    /// <summary>
    /// The user ID (references users.id).
    /// </summary>
    [PrimaryKey("id", true)]
    public Guid Id { get; set; }

    /// <summary>
    /// Daily step goal.
    /// </summary>
    [Column("daily_step_goal")]
    public int DailyStepGoal { get; set; } = 10000;

    /// <summary>
    /// Unit of measurement for distance ('metric' or 'imperial').
    /// </summary>
    [Column("units")]
    public string Units { get; set; } = "metric";

    /// <summary>
    /// Whether notifications are enabled globally.
    /// </summary>
    [Column("notifications_enabled")]
    public bool NotificationsEnabled { get; set; } = true;

    /// <summary>
    /// Whether to notify on friend requests.
    /// </summary>
    [Column("notify_friend_requests")]
    public bool NotifyFriendRequests { get; set; } = true;

    /// <summary>
    /// Whether to notify when friend requests are accepted.
    /// </summary>
    [Column("notify_friend_accepted")]
    public bool NotifyFriendAccepted { get; set; } = true;

    /// <summary>
    /// Whether to notify on group invites.
    /// </summary>
    [Column("notify_group_invites")]
    public bool NotifyGroupInvites { get; set; } = true;

    /// <summary>
    /// Whether to notify on achievements.
    /// </summary>
    [Column("notify_achievements")]
    public bool NotifyAchievements { get; set; } = true;

    /// <summary>
    /// Whether to send daily reminder notifications.
    /// </summary>
    [Column("notify_daily_reminder")]
    public bool NotifyDailyReminder { get; set; } = true;

    /// <summary>
    /// Time of day for daily reminder (nullable).
    /// </summary>
    [Column("daily_reminder_time")]
    public TimeOnly? DailyReminderTime { get; set; }

    /// <summary>
    /// Profile visibility setting ('public', 'friends', 'private').
    /// </summary>
    [Column("privacy_profile_visibility")]
    public string PrivacyProfileVisibility { get; set; } = "public";

    /// <summary>
    /// Who can find the user ('public', 'friends', 'private').
    /// </summary>
    [Column("privacy_find_me")]
    public string PrivacyFindMe { get; set; } = "public";

    /// <summary>
    /// Who can see the user's steps ('public', 'friends', 'partial', 'private').
    /// </summary>
    [Column("privacy_show_steps")]
    public string PrivacyShowSteps { get; set; } = "partial";

    /// <summary>
    /// Timestamp when preferences were created.
    /// </summary>
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Timestamp when preferences were last updated.
    /// </summary>
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
