namespace Stepper.Api.Users.DTOs;

/// <summary>
/// Request model for updating a user profile.
/// Preferences are updated separately via the /users/me/preferences endpoint.
/// </summary>
public record UpdateProfileRequest
{
    public string DisplayName { get; init; } = string.Empty;
    public string? AvatarUrl { get; init; }
    public bool? OnboardingCompleted { get; init; }
}
