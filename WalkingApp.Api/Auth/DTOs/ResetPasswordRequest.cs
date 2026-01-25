namespace WalkingApp.Api.Auth.DTOs;

/// <summary>
/// Request model for completing a password reset.
/// </summary>
/// <param name="Token">The password reset token from the email link.</param>
/// <param name="NewPassword">The new password to set.</param>
public record ResetPasswordRequest(
    string Token,
    string NewPassword
);
