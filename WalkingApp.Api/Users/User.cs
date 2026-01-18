using WalkingApp.Api.Users.DTOs;

namespace WalkingApp.Api.Users;

public class User
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// Unique cryptographically random identifier used for QR code generation in friend discovery.
    /// </summary>
    public string QrCodeId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public UserPreferences Preferences { get; set; } = new();
    public bool OnboardingCompleted { get; set; }
}
