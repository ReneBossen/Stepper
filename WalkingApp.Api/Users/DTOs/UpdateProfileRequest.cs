namespace WalkingApp.Api.Users.DTOs;

public class UpdateProfileRequest
{
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public UserPreferences? Preferences { get; set; }
    public bool? OnboardingCompleted { get; set; }
}
