using System.Text.Json;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Stepper.Api.Notifications;

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
    public object? Data { get; set; }

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
            Data = SerializeData(Data),
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
            Data = DeserializeData(notification.Data),
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

    /// <summary>
    /// Serializes the JSONB data object to a JSON string.
    /// </summary>
    /// <param name="data">The data object from Supabase JSONB column.</param>
    /// <returns>A JSON string representation, or null if data is null.</returns>
    private static string? SerializeData(object? data)
    {
        if (data is null)
        {
            return null;
        }

        // If it's already a string, return it directly
        if (data is string stringData)
        {
            return string.IsNullOrEmpty(stringData) ? null : stringData;
        }

        // Serialize the object to a JSON string
        return JsonSerializer.Serialize(data);
    }

    /// <summary>
    /// Deserializes a JSON string to an object for Supabase JSONB column.
    /// </summary>
    /// <param name="jsonString">The JSON string from the domain model.</param>
    /// <returns>A deserialized object, or null if the string is null or empty.</returns>
    private static object? DeserializeData(string? jsonString)
    {
        if (string.IsNullOrEmpty(jsonString))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<JsonElement>(jsonString);
        }
        catch (JsonException)
        {
            // If deserialization fails, return the string as-is
            // This handles cases where the data might not be valid JSON
            return jsonString;
        }
    }
}
