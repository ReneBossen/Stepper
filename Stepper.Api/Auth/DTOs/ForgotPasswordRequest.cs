namespace Stepper.Api.Auth.DTOs;

/// <summary>
/// Request model for initiating a password reset.
/// </summary>
/// <param name="Email">The email address associated with the account.</param>
public record ForgotPasswordRequest(
    string Email
);
