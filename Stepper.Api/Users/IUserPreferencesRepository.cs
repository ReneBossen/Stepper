namespace Stepper.Api.Users;

/// <summary>
/// Repository interface for user preferences data access.
/// </summary>
public interface IUserPreferencesRepository
{
    /// <summary>
    /// Gets user preferences by user ID.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>The user preferences entity, or null if not found.</returns>
    Task<UserPreferencesEntity?> GetByUserIdAsync(Guid userId);

    /// <summary>
    /// Creates a new user preferences record with default values.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>The created user preferences entity.</returns>
    Task<UserPreferencesEntity> CreateAsync(Guid userId);

    /// <summary>
    /// Updates an existing user preferences record.
    /// </summary>
    /// <param name="preferences">The user preferences entity to update.</param>
    /// <returns>The updated user preferences entity.</returns>
    Task<UserPreferencesEntity> UpdateAsync(UserPreferencesEntity preferences);
}
