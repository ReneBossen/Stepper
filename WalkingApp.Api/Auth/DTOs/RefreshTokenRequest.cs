namespace WalkingApp.Api.Auth.DTOs;

/// <summary>
/// Request model for refreshing an access token.
/// </summary>
/// <param name="RefreshToken">The refresh token to exchange for a new access token.</param>
public record RefreshTokenRequest(
    string RefreshToken
);
