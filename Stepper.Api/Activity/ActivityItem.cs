namespace Stepper.Api.Activity;

/// <summary>
/// Domain model representing an activity feed item.
/// </summary>
public class ActivityItem
{
    /// <summary>
    /// The unique identifier of the activity.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// The ID of the user who generated this activity.
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// The type of activity (e.g., steps_recorded, friend_added, group_joined).
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// A human-readable message describing the activity.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Additional metadata for the activity as a JSON string.
    /// </summary>
    public string? Metadata { get; set; }

    /// <summary>
    /// When the activity was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// The ID of a related user, if applicable.
    /// </summary>
    public Guid? RelatedUserId { get; set; }

    /// <summary>
    /// The ID of a related group, if applicable.
    /// </summary>
    public Guid? RelatedGroupId { get; set; }
}
