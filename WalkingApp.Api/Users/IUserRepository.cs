namespace WalkingApp.Api.Users;

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
}
