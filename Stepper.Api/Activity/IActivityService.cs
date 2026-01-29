using Stepper.Api.Activity.DTOs;

namespace Stepper.Api.Activity;

/// <summary>
/// Service interface for activity feed business logic.
/// </summary>
public interface IActivityService
{
    /// <summary>
    /// Gets the activity feed for a user, including their own activities and their friends' activities.
    /// </summary>
    /// <param name="userId">The ID of the user requesting the feed.</param>
    /// <param name="limit">Maximum number of items to return (default: 20).</param>
    /// <param name="offset">Number of items to skip for pagination (default: 0).</param>
    /// <returns>The paginated activity feed response.</returns>
    Task<ActivityFeedResponse> GetFeedAsync(Guid userId, int limit = 20, int offset = 0);

    /// <summary>
    /// Gets a single activity item by its unique identifier.
    /// </summary>
    /// <param name="userId">The ID of the user requesting the activity.</param>
    /// <param name="activityId">The unique identifier of the activity.</param>
    /// <returns>The activity item response.</returns>
    /// <exception cref="KeyNotFoundException">Thrown when the activity is not found.</exception>
    Task<ActivityItemResponse> GetByIdAsync(Guid userId, Guid activityId);
}
