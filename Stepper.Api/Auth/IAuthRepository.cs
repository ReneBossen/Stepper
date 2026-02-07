using Supabase.Gotrue;

namespace Stepper.Api.Auth;

/// <summary>
/// Repository interface for Supabase authentication operations.
/// Abstracts direct Supabase client interactions from the service layer.
/// </summary>
public interface IAuthRepository
{
    /// <summary>
    /// Signs up a new user with optional metadata.
    /// </summary>
    /// <param name="email">The user's email address.</param>
    /// <param name="password">The user's password.</param>
    /// <param name="metadata">Optional user metadata (e.g., display_name).</param>
    /// <returns>The session from Supabase, or null if sign-up requires email confirmation.</returns>
    Task<Session?> SignUpAsync(string email, string password, Dictionary<string, object>? metadata = null);

    /// <summary>
    /// Signs in a user with email and password.
    /// </summary>
    /// <param name="email">The user's email address.</param>
    /// <param name="password">The user's password.</param>
    /// <returns>The session from Supabase.</returns>
    Task<Session?> SignInAsync(string email, string password);

    /// <summary>
    /// Signs out a user by invalidating their session.
    /// </summary>
    /// <param name="accessToken">The access token of the session to invalidate.</param>
    Task SignOutAsync(string accessToken);

    /// <summary>
    /// Refreshes a session using a refresh token.
    /// </summary>
    /// <param name="refreshToken">The refresh token to use.</param>
    /// <returns>The refreshed session from Supabase.</returns>
    Task<Session?> RefreshSessionAsync(string refreshToken);

    /// <summary>
    /// Sends a password reset email to the specified address.
    /// </summary>
    /// <param name="email">The email address to send the reset link to.</param>
    Task ResetPasswordForEmailAsync(string email);

    /// <summary>
    /// Exchanges a password reset code for a session.
    /// </summary>
    /// <param name="code">The reset code from the email link.</param>
    /// <returns>The session from Supabase.</returns>
    Task<Session?> ExchangeCodeForSessionAsync(string code);

    /// <summary>
    /// Updates the password for an authenticated user.
    /// </summary>
    /// <param name="accessToken">The access token of the authenticated user.</param>
    /// <param name="newPassword">The new password to set.</param>
    Task UpdateUserPasswordAsync(string accessToken, string newPassword);

    /// <summary>
    /// Retrieves the email address of the authenticated user from their access token.
    /// </summary>
    /// <param name="accessToken">The access token of the authenticated user.</param>
    /// <returns>The user's email address, or null if the user cannot be resolved.</returns>
    Task<string?> GetUserEmailAsync(string accessToken);
}
