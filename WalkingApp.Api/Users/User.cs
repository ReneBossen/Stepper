namespace WalkingApp.Api.Users;

/// <summary>
/// Domain model representing a user profile.
/// </summary>
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
    public bool OnboardingCompleted { get; set; }
}
