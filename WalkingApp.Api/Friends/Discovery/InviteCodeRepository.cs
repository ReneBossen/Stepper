using Supabase;
using WalkingApp.Api.Common.Database;

namespace WalkingApp.Api.Friends.Discovery;

/// <summary>
/// Repository implementation for invite code data access using Supabase.
/// </summary>
public class InviteCodeRepository : IInviteCodeRepository
{
    private readonly ISupabaseClientFactory _clientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public InviteCodeRepository(
        ISupabaseClientFactory clientFactory,
        IHttpContextAccessor httpContextAccessor)
    {
        ArgumentNullException.ThrowIfNull(clientFactory);
        ArgumentNullException.ThrowIfNull(httpContextAccessor);

        _clientFactory = clientFactory;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <inheritdoc />
    public async Task<InviteCode> CreateAsync(InviteCode inviteCode)
    {
        var client = await GetAuthenticatedClientAsync();

        var entity = InviteCodeEntity.FromInviteCode(inviteCode);

        var response = await client
            .From<InviteCodeEntity>()
            .Insert(entity);

        var created = response.Models.FirstOrDefault();
        if (created == null)
        {
            throw new InvalidOperationException("Failed to create invite code.");
        }

        return created.ToInviteCode();
    }

    /// <inheritdoc />
    public async Task<InviteCode?> GetByCodeAsync(string code)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<InviteCodeEntity>()
            .Where(x => x.Code == code)
            .Get();

        var entity = response.Models.FirstOrDefault();
        return entity?.ToInviteCode();
    }

    /// <inheritdoc />
    public async Task<List<InviteCode>> GetByUserIdAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<InviteCodeEntity>()
            .Where(x => x.UserId == userId)
            .Get();

        return response.Models.Select(e => e.ToInviteCode()).ToList();
    }

    /// <inheritdoc />
    public async Task<InviteCode> UpdateAsync(InviteCode inviteCode)
    {
        var client = await GetAuthenticatedClientAsync();

        var entity = InviteCodeEntity.FromInviteCode(inviteCode);

        var response = await client
            .From<InviteCodeEntity>()
            .Update(entity);

        var updated = response.Models.FirstOrDefault();
        if (updated == null)
        {
            throw new InvalidOperationException("Failed to update invite code.");
        }

        return updated.ToInviteCode();
    }

    /// <inheritdoc />
    public async Task DeleteAsync(Guid id)
    {
        var client = await GetAuthenticatedClientAsync();

        await client
            .From<InviteCodeEntity>()
            .Where(x => x.Id == id)
            .Delete();
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
