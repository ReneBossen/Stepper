using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

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

    [Column("qr_code_id")]
    public string QrCodeId { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [Column("onboarding_completed")]
    public bool OnboardingCompleted { get; set; }

    /// <summary>
    /// Maps the entity to a domain model.
    /// </summary>
    /// <returns>The User domain model.</returns>
    public User ToUser()
    {
        return new User
        {
            Id = Id,
            DisplayName = DisplayName,
            AvatarUrl = AvatarUrl,
            QrCodeId = QrCodeId,
            CreatedAt = CreatedAt,
            UpdatedAt = UpdatedAt,
            OnboardingCompleted = OnboardingCompleted
        };
    }

    /// <summary>
    /// Creates an entity from a domain model.
    /// </summary>
    /// <param name="user">The User domain model.</param>
    /// <returns>The UserEntity.</returns>
    public static UserEntity FromUser(User user)
    {
        return new UserEntity
        {
            Id = user.Id,
            DisplayName = user.DisplayName,
            AvatarUrl = user.AvatarUrl,
            QrCodeId = user.QrCodeId,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            OnboardingCompleted = user.OnboardingCompleted
        };
    }
}
