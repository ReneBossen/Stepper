namespace Stepper.Api.Auth.DTOs;

/// <summary>
/// Response model for authentication operations.
/// </summary>
/// <param name="AccessToken">The JWT access token.</param>
/// <param name="RefreshToken">The refresh token for obtaining new access tokens.</param>
/// <param name="ExpiresIn">The number of seconds until the access token expires.</param>
/// <param name="User">Information about the authenticated user.</param>
public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    long ExpiresIn,
    AuthUserInfo User
);

/// <summary>
/// User information included in authentication responses.
/// </summary>
/// <param name="Id">The user's unique identifier.</param>
/// <param name="Email">The user's email address.</param>
/// <param name="DisplayName">The user's display name, if set.</param>
public record AuthUserInfo(
    Guid Id,
    string Email,
    string? DisplayName
);
