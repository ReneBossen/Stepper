namespace Stepper.Api.Users;

/// <summary>
/// Repository interface for user data access.
/// </summary>
public interface IUserRepository
{
    /// <summary>
    /// Gets a user profile by ID.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>The user profile, or null if not found.</returns>
    Task<User?> GetByIdAsync(Guid userId);

    /// <summary>
    /// Creates a new user profile.
    /// </summary>
    /// <param name="user">The user profile to create.</param>
    /// <returns>The created user profile.</returns>
    Task<User> CreateAsync(User user);

    /// <summary>
    /// Updates an existing user profile.
    /// </summary>
    /// <param name="user">The user profile to update.</param>
    /// <returns>The updated user profile.</returns>
    Task<User> UpdateAsync(User user);

    /// <summary>
    /// Gets multiple user profiles by their IDs in a single query.
    /// </summary>
    /// <param name="userIds">The list of user IDs to fetch.</param>
    /// <returns>List of user profiles found. Users not found are excluded from the result.</returns>
    Task<List<User>> GetByIdsAsync(List<Guid> userIds);

    /// <summary>
    /// Gets the count of accepted friendships for a user.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>The number of accepted friends.</returns>
    Task<int> GetFriendsCountAsync(Guid userId);

    /// <summary>
    /// Gets the count of groups the user is a member of.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>The number of groups.</returns>
    Task<int> GetGroupsCountAsync(Guid userId);

    /// <summary>
    /// Gets step entries for a user within a date range.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="startDate">The start date (inclusive).</param>
    /// <param name="endDate">The end date (inclusive).</param>
    /// <returns>List of step entries in the date range.</returns>
    Task<List<(int StepCount, double? DistanceMeters, DateOnly Date)>> GetStepEntriesForRangeAsync(Guid userId, DateOnly startDate, DateOnly endDate);

    /// <summary>
    /// Gets all dates with activity for a user to calculate streaks.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>List of dates with activity, ordered descending.</returns>
    Task<List<DateOnly>> GetActivityDatesAsync(Guid userId);

    /// <summary>
    /// Gets group IDs that a user is a member of.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>List of group IDs.</returns>
    Task<List<Guid>> GetUserGroupIdsAsync(Guid userId);

    /// <summary>
    /// Gets groups by their IDs.
    /// </summary>
    /// <param name="groupIds">The list of group IDs.</param>
    /// <returns>List of tuples containing group ID and name.</returns>
    Task<List<(Guid Id, string Name)>> GetGroupsByIdsAsync(List<Guid> groupIds);
}
