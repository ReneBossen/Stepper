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
}
