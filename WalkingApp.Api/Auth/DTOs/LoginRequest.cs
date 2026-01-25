namespace WalkingApp.Api.Auth.DTOs;

/// <summary>
/// Request model for user login.
/// </summary>
/// <param name="Email">The user's email address.</param>
/// <param name="Password">The user's password.</param>
public record LoginRequest(
    string Email,
    string Password
);
