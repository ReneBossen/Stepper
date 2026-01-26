namespace WalkingApp.Api.Users.DTOs;

/// <summary>
/// Response model for getting a user profile.
/// Preferences are fetched separately via the /users/me/preferences endpoint.
/// </summary>
public class GetProfileResponse
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool OnboardingCompleted { get; set; }
}
