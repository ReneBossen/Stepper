namespace WalkingApp.Api.Auth.DTOs;

/// <summary>
/// Request model for changing the authenticated user's password.
/// </summary>
/// <param name="CurrentPassword">The user's current password for verification.</param>
/// <param name="NewPassword">The new password to set.</param>
public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword
);
