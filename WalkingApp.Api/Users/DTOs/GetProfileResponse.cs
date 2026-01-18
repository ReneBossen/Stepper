namespace WalkingApp.Api.Users.DTOs;

public class GetProfileResponse
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public UserPreferences Preferences { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public bool OnboardingCompleted { get; set; }
}
