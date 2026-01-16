using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using WalkingApp.Api.Users.DTOs;
using System.Text.Json;

namespace WalkingApp.Api.Users;

/// <summary>
/// Entity model for Supabase users table.
/// </summary>
[Table("users")]
internal class UserEntity : BaseModel
{
    [PrimaryKey("id", false)]
    public Guid Id { get; set; }

    [Column("display_name")]
    public string DisplayName { get; set; } = string.Empty;

    [Column("avatar_url")]
    public string? AvatarUrl { get; set; }

    [Column("preferences")]
    public string PreferencesJson { get; set; } = "{}";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    public User ToUser()
    {
        var preferences = string.IsNullOrWhiteSpace(PreferencesJson)
            ? new UserPreferences()
            : JsonSerializer.Deserialize<UserPreferences>(PreferencesJson) ?? new UserPreferences();

        return new User
        {
            Id = Id,
            DisplayName = DisplayName,
            AvatarUrl = AvatarUrl,
            Preferences = preferences,
            CreatedAt = CreatedAt,
            UpdatedAt = UpdatedAt
        };
    }

    public static UserEntity FromUser(User user)
    {
        return new UserEntity
        {
            Id = user.Id,
            DisplayName = user.DisplayName,
            AvatarUrl = user.AvatarUrl,
            PreferencesJson = JsonSerializer.Serialize(user.Preferences),
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }
}
