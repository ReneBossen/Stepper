namespace Stepper.Api.Notifications;

/// <summary>
/// Represents the type of notification.
/// </summary>
public enum NotificationType
{
    /// <summary>
    /// A general notification.
    /// </summary>
    General,

    /// <summary>
    /// A friend request notification.
    /// </summary>
    FriendRequest,

    /// <summary>
    /// A friend request accepted notification.
    /// </summary>
    FriendAccepted,

    /// <summary>
    /// A group invitation notification.
    /// </summary>
    GroupInvite,

    /// <summary>
    /// A goal achieved notification.
    /// </summary>
    GoalAchieved
}
