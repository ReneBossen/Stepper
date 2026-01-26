namespace WalkingApp.Api.Users.DTOs;

/// <summary>
/// Request model for updating a user profile.
/// Preferences are updated separately via the /users/me/preferences endpoint.
/// </summary>
public class UpdateProfileRequest
{
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public bool? OnboardingCompleted { get; set; }
}
