namespace Stepper.Api.Users.DTOs;

/// <summary>
/// Response model for getting a user profile.
/// Preferences are fetched separately via the /users/me/preferences endpoint.
/// </summary>
public record GetProfileResponse
{
    public Guid Id { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string? AvatarUrl { get; init; }
    public DateTime CreatedAt { get; init; }
    public bool OnboardingCompleted { get; init; }
}
