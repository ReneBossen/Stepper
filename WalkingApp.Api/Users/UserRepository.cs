using Supabase;
using WalkingApp.Api.Common.Database;

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
