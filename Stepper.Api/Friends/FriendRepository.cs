using Supabase;
using Stepper.Api.Common.Constants;
using Stepper.Api.Common.Database;

namespace Stepper.Api.Friends;

/// <summary>
/// Repository implementation for friend data access using Supabase.
/// </summary>
public class FriendRepository : IFriendRepository
{
    private readonly ISupabaseClientFactory _clientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public FriendRepository(
        ISupabaseClientFactory clientFactory,
        IHttpContextAccessor httpContextAccessor)
    {
        ArgumentNullException.ThrowIfNull(clientFactory);
        ArgumentNullException.ThrowIfNull(httpContextAccessor);

        _clientFactory = clientFactory;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <inheritdoc />
    public async Task<Friendship> SendRequestAsync(Guid requesterId, Guid addresseeId)
    {
        var client = await GetAuthenticatedClientAsync();

        var entity = new FriendshipEntity
        {
            Id = Guid.NewGuid(),
            RequesterId = requesterId,
            AddresseeId = addresseeId,
            Status = FriendshipStatusStrings.Pending,
            CreatedAt = DateTime.UtcNow
        };

        var response = await client
            .From<FriendshipEntity>()
            .Insert(entity);

        var created = response.Models.FirstOrDefault();
        if (created == null)
        {
            throw new InvalidOperationException("Failed to create friend request.");
        }

        return created.ToFriendship();
    }

    /// <inheritdoc />
    public async Task<List<Friendship>> GetPendingRequestsAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<FriendshipEntity>()
            .Where(x => x.AddresseeId == userId && x.Status == FriendshipStatusStrings.Pending)
            .Get();

        return response.Models.Select(e => e.ToFriendship()).ToList();
    }

    /// <inheritdoc />
    public async Task<List<Friendship>> GetSentRequestsAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<FriendshipEntity>()
            .Where(x => x.RequesterId == userId && x.Status == FriendshipStatusStrings.Pending)
            .Get();

        return response.Models.Select(e => e.ToFriendship()).ToList();
    }

    /// <inheritdoc />
    public async Task<Friendship> AcceptRequestAsync(Guid requestId, Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        // First, get the existing request to verify addressee
        var existing = await client
            .From<FriendshipEntity>()
            .Where(x => x.Id == requestId)
            .Single();

        if (existing == null)
        {
            throw new KeyNotFoundException($"Friend request not found: {requestId}");
        }

        if (existing.AddresseeId != userId)
        {
            throw new UnauthorizedAccessException("Only the addressee can accept this request.");
        }

        if (existing.Status != FriendshipStatusStrings.Pending)
        {
            throw new InvalidOperationException($"Cannot accept request with status: {existing.Status}");
        }

        existing.Status = FriendshipStatusStrings.Accepted;
        existing.AcceptedAt = DateTime.UtcNow;

        var response = await client
            .From<FriendshipEntity>()
            .Update(existing);

        var updated = response.Models.FirstOrDefault();
        if (updated == null)
        {
            throw new InvalidOperationException("Failed to accept friend request.");
        }

        return updated.ToFriendship();
    }

    /// <inheritdoc />
    public async Task<Friendship> RejectRequestAsync(Guid requestId, Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        // First, get the existing request to verify addressee
        var existing = await client
            .From<FriendshipEntity>()
            .Where(x => x.Id == requestId)
            .Single();

        if (existing == null)
        {
            throw new KeyNotFoundException($"Friend request not found: {requestId}");
        }

        if (existing.AddresseeId != userId)
        {
            throw new UnauthorizedAccessException("Only the addressee can reject this request.");
        }

        if (existing.Status != FriendshipStatusStrings.Pending)
        {
            throw new InvalidOperationException($"Cannot reject request with status: {existing.Status}");
        }

        existing.Status = FriendshipStatusStrings.Rejected;

        var response = await client
            .From<FriendshipEntity>()
            .Update(existing);

        var updated = response.Models.FirstOrDefault();
        if (updated == null)
        {
            throw new InvalidOperationException("Failed to reject friend request.");
        }

        return updated.ToFriendship();
    }

    /// <inheritdoc />
    public async Task<List<Friendship>> GetFriendsAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        // Get friendships where user is requester
        var asRequester = await client
            .From<FriendshipEntity>()
            .Where(x => x.RequesterId == userId && x.Status == FriendshipStatusStrings.Accepted)
            .Get();

        // Get friendships where user is addressee
        var asAddressee = await client
            .From<FriendshipEntity>()
            .Where(x => x.AddresseeId == userId && x.Status == FriendshipStatusStrings.Accepted)
            .Get();

        var allFriendships = asRequester.Models
            .Concat(asAddressee.Models)
            .Select(e => e.ToFriendship())
            .ToList();

        return allFriendships;
    }

    /// <inheritdoc />
    public async Task<Friendship?> GetFriendshipAsync(Guid userId, Guid friendId)
    {
        var client = await GetAuthenticatedClientAsync();

        // Check direction 1: userId -> friendId
        var direction1 = await client
            .From<FriendshipEntity>()
            .Where(x => x.RequesterId == userId && x.AddresseeId == friendId)
            .Get();

        var entity = direction1.Models.FirstOrDefault();
        if (entity != null)
        {
            return entity.ToFriendship();
        }

        // Check direction 2: friendId -> userId
        var direction2 = await client
            .From<FriendshipEntity>()
            .Where(x => x.RequesterId == friendId && x.AddresseeId == userId)
            .Get();

        entity = direction2.Models.FirstOrDefault();
        return entity?.ToFriendship();
    }

    /// <inheritdoc />
    public async Task RemoveFriendAsync(Guid userId, Guid friendId)
    {
        var client = await GetAuthenticatedClientAsync();

        // Find the friendship using GetFriendshipAsync
        var friendship = await GetFriendshipAsync(userId, friendId);
        if (friendship == null)
        {
            throw new KeyNotFoundException($"Friendship not found between users {userId} and {friendId}");
        }

        await client
            .From<FriendshipEntity>()
            .Where(x => x.Id == friendship.Id)
            .Delete();
    }

    /// <inheritdoc />
    public async Task CancelRequestAsync(Guid requestId, Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var existing = await client
            .From<FriendshipEntity>()
            .Where(x => x.Id == requestId)
            .Single();

        if (existing == null)
        {
            throw new KeyNotFoundException($"Friend request not found: {requestId}");
        }

        if (existing.RequesterId != userId)
        {
            throw new UnauthorizedAccessException("Only the requester can cancel this request.");
        }

        if (existing.Status != FriendshipStatusStrings.Pending)
        {
            throw new InvalidOperationException($"Cannot cancel request with status: {existing.Status}");
        }

        await client
            .From<FriendshipEntity>()
            .Where(x => x.Id == requestId)
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
