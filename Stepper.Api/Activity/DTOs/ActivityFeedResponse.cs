namespace Stepper.Api.Activity.DTOs;

/// <summary>
/// Response containing a paginated activity feed.
/// </summary>
/// <param name="Items">The list of activity items.</param>
/// <param name="TotalCount">The total number of activities available.</param>
/// <param name="HasMore">Indicates if there are more activities to load.</param>
public record ActivityFeedResponse(
    List<ActivityItemResponse> Items,
    int TotalCount,
    bool HasMore
);

/// <summary>
/// A single activity item in the feed.
/// </summary>
/// <param name="Id">The unique identifier of the activity.</param>
/// <param name="UserId">The ID of the user who generated this activity.</param>
/// <param name="UserName">The display name of the user who generated this activity.</param>
/// <param name="UserAvatarUrl">The avatar URL of the user who generated this activity.</param>
/// <param name="Type">The type of activity (e.g., steps_recorded, friend_added).</param>
/// <param name="Message">A human-readable message describing the activity.</param>
/// <param name="Metadata">Additional metadata for the activity as a JSON object.</param>
/// <param name="CreatedAt">When the activity was created.</param>
/// <param name="RelatedUserId">The ID of a related user, if applicable.</param>
/// <param name="RelatedGroupId">The ID of a related group, if applicable.</param>
public record ActivityItemResponse(
    Guid Id,
    Guid UserId,
    string UserName,
    string? UserAvatarUrl,
    string Type,
    string Message,
    object? Metadata,
    DateTime CreatedAt,
    Guid? RelatedUserId,
    Guid? RelatedGroupId
);
