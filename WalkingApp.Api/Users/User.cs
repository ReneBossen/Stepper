using WalkingApp.Api.Users.DTOs;

namespace WalkingApp.Api.Users;

public class User
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public UserPreferences Preferences { get; set; } = new();
}
