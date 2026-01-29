using Stepper.Api.Auth.DTOs;

namespace Stepper.Api.Auth;

/// <summary>
/// Service interface for authentication operations.
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Registers a new user with the provided credentials.
    /// </summary>
    /// <param name="request">The registration request containing email, password, and display name.</param>
    /// <returns>The authentication response with tokens and user info.</returns>
    Task<AuthResponse> RegisterAsync(RegisterRequest request);

    /// <summary>
    /// Authenticates a user with email and password.
    /// </summary>
    /// <param name="request">The login request containing email and password.</param>
    /// <returns>The authentication response with tokens and user info.</returns>
    Task<AuthResponse> LoginAsync(LoginRequest request);

    /// <summary>
    /// Logs out the user by invalidating the current session.
    /// </summary>
    /// <param name="accessToken">The current access token to invalidate.</param>
    Task LogoutAsync(string accessToken);

    /// <summary>
    /// Refreshes an expired access token using a refresh token.
    /// </summary>
    /// <param name="request">The refresh token request.</param>
    /// <returns>The authentication response with new tokens.</returns>
    Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request);

    /// <summary>
    /// Initiates a password reset by sending a reset email.
    /// </summary>
    /// <param name="request">The forgot password request containing the user's email.</param>
    Task ForgotPasswordAsync(ForgotPasswordRequest request);

    /// <summary>
    /// Completes a password reset using the reset token.
    /// </summary>
    /// <param name="request">The reset password request containing the token and new password.</param>
    Task ResetPasswordAsync(ResetPasswordRequest request);

    /// <summary>
    /// Changes the authenticated user's password after verifying the current password.
    /// </summary>
    /// <param name="accessToken">The current access token for authentication.</param>
    /// <param name="request">The change password request containing current and new passwords.</param>
    Task ChangePasswordAsync(string accessToken, ChangePasswordRequest request);
}
