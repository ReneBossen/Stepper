using Stepper.Api.Users.DTOs;

namespace Stepper.Api.Users;

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

    /// <summary>
    /// Gets the user preferences for the specified user.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>The user preferences response.</returns>
    Task<UserPreferencesResponse> GetPreferencesAsync(Guid userId);

    /// <summary>
    /// Updates the user preferences.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="request">The update preferences request.</param>
    /// <returns>The updated user preferences response.</returns>
    Task<UserPreferencesResponse> UpdatePreferencesAsync(Guid userId, UpdateUserPreferencesRequest request);

    /// <summary>
    /// Uploads a new avatar image for the user.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="fileStream">The file stream containing the image data.</param>
    /// <param name="fileName">The original file name.</param>
    /// <param name="contentType">The MIME content type of the file.</param>
    /// <returns>The avatar upload response containing the new URL.</returns>
    Task<AvatarUploadResponse> UploadAvatarAsync(Guid userId, Stream fileStream, string fileName, string contentType);

    /// <summary>
    /// Gets user statistics including friends count, groups count, and badges count.
    /// </summary>
    /// <param name="userId">The user ID to get stats for.</param>
    /// <returns>The user statistics response.</returns>
    Task<UserStatsResponse> GetUserStatsAsync(Guid userId);

    /// <summary>
    /// Gets weekly activity summary including total steps, distance, average, and streak.
    /// </summary>
    /// <param name="userId">The user ID to get activity for.</param>
    /// <returns>The user activity response.</returns>
    Task<UserActivityResponse> GetUserActivityAsync(Guid userId);

    /// <summary>
    /// Gets groups that are shared between the current user and another user.
    /// </summary>
    /// <param name="currentUserId">The current authenticated user ID.</param>
    /// <param name="otherUserId">The other user ID to find mutual groups with.</param>
    /// <returns>List of mutual groups.</returns>
    Task<List<MutualGroupResponse>> GetMutualGroupsAsync(Guid currentUserId, Guid otherUserId);
}
