using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace WalkingApp.Api.Notifications;

/// <summary>
/// Entity model for Supabase notifications table.
/// </summary>
[Table("notifications")]
internal class NotificationEntity : BaseModel
{
    [PrimaryKey("id", false)]
    public Guid Id { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("type")]
    public string Type { get; set; } = "general";

    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("message")]
    public string Message { get; set; } = string.Empty;

    [Column("is_read")]
    public bool IsRead { get; set; }

    [Column("data")]
    public string? Data { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Converts this entity to a domain model.
    /// </summary>
    /// <returns>The domain notification model.</returns>
    public Notification ToNotification()
    {
        return new Notification
        {
            Id = Id,
            UserId = UserId,
            Type = ParseNotificationType(Type),
            Title = Title,
            Message = Message,
            IsRead = IsRead,
            Data = Data,
            CreatedAt = CreatedAt,
            UpdatedAt = UpdatedAt
        };
    }

    /// <summary>
    /// Creates an entity from a domain model.
    /// </summary>
    /// <param name="notification">The domain notification.</param>
    /// <returns>The entity model.</returns>
    public static NotificationEntity FromNotification(Notification notification)
    {
        ArgumentNullException.ThrowIfNull(notification);

        return new NotificationEntity
        {
            Id = notification.Id,
            UserId = notification.UserId,
            Type = ConvertNotificationType(notification.Type),
            Title = notification.Title,
            Message = notification.Message,
            IsRead = notification.IsRead,
            Data = notification.Data,
            CreatedAt = notification.CreatedAt,
            UpdatedAt = notification.UpdatedAt
        };
    }

    private static NotificationType ParseNotificationType(string type)
    {
        return type switch
        {
            "friend_request" => NotificationType.FriendRequest,
            "friend_accepted" => NotificationType.FriendAccepted,
            "group_invite" => NotificationType.GroupInvite,
            "goal_achieved" => NotificationType.GoalAchieved,
            _ => NotificationType.General
        };
    }

    private static string ConvertNotificationType(NotificationType type)
    {
        return type switch
        {
            NotificationType.FriendRequest => "friend_request",
            NotificationType.FriendAccepted => "friend_accepted",
            NotificationType.GroupInvite => "group_invite",
            NotificationType.GoalAchieved => "goal_achieved",
            _ => "general"
        };
    }
}
