using Supabase;
using WalkingApp.Api.Common.Database;

namespace WalkingApp.Api.Friends;

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
            Status = "pending",
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
            .Where(x => x.AddresseeId == userId && x.Status == "pending")
            .Get();

        return response.Models.Select(e => e.ToFriendship()).ToList();
    }

    /// <inheritdoc />
    public async Task<List<Friendship>> GetSentRequestsAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<FriendshipEntity>()
            .Where(x => x.RequesterId == userId && x.Status == "pending")
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

        if (existing.Status != "pending")
        {
            throw new InvalidOperationException($"Cannot accept request with status: {existing.Status}");
        }

        existing.Status = "accepted";
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

        if (existing.Status != "pending")
        {
            throw new InvalidOperationException($"Cannot reject request with status: {existing.Status}");
        }

        existing.Status = "rejected";

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
            .Where(x => x.RequesterId == userId && x.Status == "accepted")
            .Get();

        // Get friendships where user is addressee
        var asAddressee = await client
            .From<FriendshipEntity>()
            .Where(x => x.AddresseeId == userId && x.Status == "accepted")
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
    public async Task<Friendship> BlockUserAsync(Guid userId, Guid blockedUserId)
    {
        var client = await GetAuthenticatedClientAsync();

        // Check if friendship already exists
        var existing = await GetFriendshipAsync(userId, blockedUserId);

        if (existing != null)
        {
            // Update existing friendship to blocked
            var entity = await client
                .From<FriendshipEntity>()
                .Where(x => x.Id == existing.Id)
                .Single();

            if (entity != null)
            {
                entity.Status = "blocked";

                var response = await client
                    .From<FriendshipEntity>()
                    .Update(entity);

                var updated = response.Models.FirstOrDefault();
                if (updated == null)
                {
                    throw new InvalidOperationException("Failed to block user.");
                }

                return updated.ToFriendship();
            }
        }

        // Create new blocked relationship
        var newEntity = new FriendshipEntity
        {
            Id = Guid.NewGuid(),
            RequesterId = userId,
            AddresseeId = blockedUserId,
            Status = "blocked",
            CreatedAt = DateTime.UtcNow
        };

        var createResponse = await client
            .From<FriendshipEntity>()
            .Insert(newEntity);

        var created = createResponse.Models.FirstOrDefault();
        if (created == null)
        {
            throw new InvalidOperationException("Failed to block user.");
        }

        return created.ToFriendship();
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
