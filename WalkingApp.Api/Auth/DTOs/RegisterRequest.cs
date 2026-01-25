namespace WalkingApp.Api.Auth.DTOs;

/// <summary>
/// Request model for user registration.
/// </summary>
/// <param name="Email">The user's email address.</param>
/// <param name="Password">The user's password.</param>
/// <param name="DisplayName">The user's display name.</param>
public record RegisterRequest(
    string Email,
    string Password,
    string DisplayName
);
