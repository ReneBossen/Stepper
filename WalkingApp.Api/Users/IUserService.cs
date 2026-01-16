using WalkingApp.Api.Users.DTOs;

namespace WalkingApp.Api.Users;

/// <summary>
/// Service interface for user business logic.
/// </summary>
public interface IUserService
{
    /// <summary>
    /// Gets the user profile for the specified user.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>The user profile response.</returns>
    Task<GetProfileResponse> GetProfileAsync(Guid userId);

    /// <summary>
    /// Updates the user profile.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="request">The update profile request.</param>
    /// <returns>The updated user profile response.</returns>
    Task<GetProfileResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);

    /// <summary>
    /// Ensures a user profile exists, creating it if necessary.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>The user profile response.</returns>
    Task<GetProfileResponse> EnsureProfileExistsAsync(Guid userId);
}
