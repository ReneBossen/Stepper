using Supabase;
using WalkingApp.Api.Common.Database;

namespace WalkingApp.Api.Users;

/// <summary>
/// Repository implementation for user preferences data access using Supabase.
/// </summary>
public class UserPreferencesRepository : IUserPreferencesRepository
{
    private readonly ISupabaseClientFactory _clientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public UserPreferencesRepository(
        ISupabaseClientFactory clientFactory,
        IHttpContextAccessor httpContextAccessor)
    {
        ArgumentNullException.ThrowIfNull(clientFactory);
        ArgumentNullException.ThrowIfNull(httpContextAccessor);

        _clientFactory = clientFactory;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <inheritdoc />
    public async Task<UserPreferencesEntity?> GetByUserIdAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<UserPreferencesEntity>()
            .Where(x => x.Id == userId)
            .Single();

        return response;
    }

    /// <inheritdoc />
    public async Task<UserPreferencesEntity> CreateAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var entity = new UserPreferencesEntity
        {
            Id = userId,
            DailyStepGoal = 10000,
            Units = "metric",
            NotificationsEnabled = true,
            NotifyFriendRequests = true,
            NotifyFriendAccepted = true,
            NotifyGroupInvites = true,
            NotifyAchievements = true,
            NotifyDailyReminder = true,
            DailyReminderTime = null,
            PrivacyProfileVisibility = "public",
            PrivacyFindMe = "public",
            PrivacyShowSteps = "partial"
        };

        var response = await client
            .From<UserPreferencesEntity>()
            .Insert(entity);

        var created = response.Models.FirstOrDefault();
        if (created == null)
        {
            throw new InvalidOperationException("Failed to create user preferences.");
        }

        return created;
    }

    /// <inheritdoc />
    public async Task<UserPreferencesEntity> UpdateAsync(UserPreferencesEntity preferences)
    {
        ArgumentNullException.ThrowIfNull(preferences);

        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<UserPreferencesEntity>()
            .Update(preferences);

        var updated = response.Models.FirstOrDefault();
        if (updated == null)
        {
            throw new InvalidOperationException("Failed to update user preferences.");
        }

        return updated;
    }

    private async Task<Client> GetAuthenticatedClientAsync()
    {
        if (_httpContextAccessor.HttpContext?.Items.TryGetValue("SupabaseToken", out var tokenObj) != true)
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        var token = tokenObj as string;
        if (string.IsNullOrEmpty(token))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        return await _clientFactory.CreateClientAsync(token);
    }
}
