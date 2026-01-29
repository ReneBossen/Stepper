namespace Stepper.Api.Activity;

/// <summary>
/// Repository interface for activity feed data access.
/// </summary>
public interface IActivityRepository
{
    /// <summary>
    /// Gets activity feed items for a user and their friends.
    /// </summary>
    /// <param name="userId">The ID of the current user.</param>
    /// <param name="friendIds">The list of friend IDs to include in the feed.</param>
    /// <param name="limit">Maximum number of items to return.</param>
    /// <param name="offset">Number of items to skip for pagination.</param>
    /// <returns>List of activity items ordered by creation time descending.</returns>
    Task<List<ActivityItem>> GetFeedAsync(Guid userId, List<Guid> friendIds, int limit, int offset);

    /// <summary>
    /// Gets the total count of activity feed items for a user and their friends.
    /// </summary>
    /// <param name="userId">The ID of the current user.</param>
    /// <param name="friendIds">The list of friend IDs to include in the count.</param>
    /// <returns>The total count of activities.</returns>
    Task<int> GetFeedCountAsync(Guid userId, List<Guid> friendIds);

    /// <summary>
    /// Gets a single activity item by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the activity.</param>
    /// <returns>The activity item, or null if not found.</returns>
    Task<ActivityItem?> GetByIdAsync(Guid id);
}
