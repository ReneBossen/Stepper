using Supabase;
using WalkingApp.Api.Common.Database;
using Postgrest.Attributes;
using Postgrest.Models;
using WalkingApp.Api.Users.DTOs;
using System.Text.Json;

namespace WalkingApp.Api.Users;

/// <summary>
/// Repository implementation for user data access using Supabase.
/// </summary>
public class UserRepository : IUserRepository
{
    private readonly ISupabaseClientFactory _clientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public UserRepository(
        ISupabaseClientFactory clientFactory,
        IHttpContextAccessor httpContextAccessor)
    {
        ArgumentNullException.ThrowIfNull(clientFactory);
        ArgumentNullException.ThrowIfNull(httpContextAccessor);

        _clientFactory = clientFactory;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <inheritdoc />
    public async Task<User?> GetByIdAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<UserEntity>()
            .Where(x => x.Id == userId)
            .Single();

        return response?.ToUser();
    }

    /// <inheritdoc />
    public async Task<User> CreateAsync(User user)
    {
        ArgumentNullException.ThrowIfNull(user);

        var client = await GetAuthenticatedClientAsync();

        var entity = UserEntity.FromUser(user);
        var response = await client
            .From<UserEntity>()
            .Insert(entity);

        var created = response.Models.FirstOrDefault();
        if (created == null)
        {
            throw new InvalidOperationException("Failed to create user profile.");
        }

        return created.ToUser();
    }

    /// <inheritdoc />
    public async Task<User> UpdateAsync(User user)
    {
        ArgumentNullException.ThrowIfNull(user);

        var client = await GetAuthenticatedClientAsync();

        var entity = UserEntity.FromUser(user);
        var response = await client
            .From<UserEntity>()
            .Update(entity);

        var updated = response.Models.FirstOrDefault();
        if (updated == null)
        {
            throw new InvalidOperationException("Failed to update user profile.");
        }

        return updated.ToUser();
    }

    private async Task<Client> GetAuthenticatedClientAsync()
    {
        var token = _httpContextAccessor.HttpContext?.Items["SupabaseToken"] as string;

        if (string.IsNullOrEmpty(token))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        return await _clientFactory.CreateClientAsync(token);
    }
}

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
