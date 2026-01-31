using System.Text.Json;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Stepper.Api.Activity;

/// <summary>
/// Entity model for Supabase activity_feed table mapping.
/// </summary>
[Table("activity_feed")]
internal class ActivityItemEntity : BaseModel
{
    [PrimaryKey("id")]
    public Guid Id { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("type")]
    public string Type { get; set; } = string.Empty;

    [Column("message")]
    public string Message { get; set; } = string.Empty;

    [Column("metadata")]
    public JsonElement? Metadata { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("related_user_id")]
    public Guid? RelatedUserId { get; set; }

    [Column("related_group_id")]
    public Guid? RelatedGroupId { get; set; }

    /// <summary>
    /// Converts the entity to a domain ActivityItem model.
    /// </summary>
    /// <returns>The domain model.</returns>
    public ActivityItem ToActivityItem()
    {
        return new ActivityItem
        {
            Id = Id,
            UserId = UserId,
            Type = Type,
            Message = Message,
            Metadata = ConvertMetadataToObject(Metadata),
            CreatedAt = CreatedAt,
            RelatedUserId = RelatedUserId,
            RelatedGroupId = RelatedGroupId
        };
    }

    private static object? ConvertMetadataToObject(JsonElement? metadata)
    {
        if (!metadata.HasValue || metadata.Value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        return metadata.Value;
    }

    /// <summary>
    /// Creates an entity from a domain ActivityItem model.
    /// </summary>
    /// <param name="activityItem">The domain model.</param>
    /// <returns>The entity.</returns>
    public static ActivityItemEntity FromActivityItem(ActivityItem activityItem)
    {
        return new ActivityItemEntity
        {
            Id = activityItem.Id,
            UserId = activityItem.UserId,
            Type = activityItem.Type,
            Message = activityItem.Message,
            Metadata = ConvertObjectToJsonElement(activityItem.Metadata),
            CreatedAt = activityItem.CreatedAt,
            RelatedUserId = activityItem.RelatedUserId,
            RelatedGroupId = activityItem.RelatedGroupId
        };
    }

    private static JsonElement? ConvertObjectToJsonElement(object? metadata)
    {
        if (metadata == null)
        {
            return null;
        }

        if (metadata is JsonElement jsonElement)
        {
            return jsonElement;
        }

        var json = JsonSerializer.Serialize(metadata);
        return JsonSerializer.Deserialize<JsonElement>(json);
    }
}
