using Stepper.Api.Friends.DTOs;
using Stepper.Api.Users;

namespace Stepper.Api.Friends;

/// <summary>
/// Service implementation for friend business logic.
/// </summary>
public class FriendService : IFriendService
{
    private readonly IFriendRepository _friendRepository;
    private readonly IUserRepository _userRepository;

    public FriendService(
        IFriendRepository friendRepository,
        IUserRepository userRepository)
    {
        ArgumentNullException.ThrowIfNull(friendRepository);
        ArgumentNullException.ThrowIfNull(userRepository);

        _friendRepository = friendRepository;
        _userRepository = userRepository;
    }

    /// <inheritdoc />
    public async Task<FriendRequestResponse> SendFriendRequestAsync(Guid userId, SendFriendRequestRequest request)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        ArgumentNullException.ThrowIfNull(request);

        if (request.FriendUserId == Guid.Empty)
        {
            throw new ArgumentException("Friend user ID cannot be empty.");
        }

        if (userId == request.FriendUserId)
        {
            throw new ArgumentException("Cannot send friend request to yourself.");
        }

        // Check if target user exists
        var targetUser = await _userRepository.GetByIdAsync(request.FriendUserId);
        if (targetUser == null)
        {
            throw new KeyNotFoundException($"User not found: {request.FriendUserId}");
        }

        // Check if friendship already exists
        var existingFriendship = await _friendRepository.GetFriendshipAsync(userId, request.FriendUserId);
        if (existingFriendship != null)
        {
            throw new InvalidOperationException($"A friendship or request already exists with status: {existingFriendship.Status}");
        }

        var friendship = await _friendRepository.SendRequestAsync(userId, request.FriendUserId);

        var requesterProfile = await _userRepository.GetByIdAsync(userId);

        return new FriendRequestResponse
        {
            Id = friendship.Id,
            RequesterId = friendship.RequesterId,
            RequesterDisplayName = requesterProfile?.DisplayName ?? "Unknown",
            RequesterAvatarUrl = requesterProfile?.AvatarUrl,
            Status = friendship.Status.ToString().ToLowerInvariant(),
            CreatedAt = friendship.CreatedAt
        };
    }

    /// <inheritdoc />
    public async Task<List<FriendRequestResponse>> GetPendingRequestsAsync(Guid userId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        var friendships = await _friendRepository.GetPendingRequestsAsync(userId);

        if (friendships.Count == 0)
        {
            return new List<FriendRequestResponse>();
        }

        // Batch fetch all requester profiles
        var requesterIds = friendships.Select(f => f.RequesterId).Distinct().ToList();
        var userProfiles = await _userRepository.GetByIdsAsync(requesterIds);
        var userDict = userProfiles.ToDictionary(u => u.Id);

        var responses = new List<FriendRequestResponse>();

        foreach (var friendship in friendships)
        {
            var requesterProfile = userDict.GetValueOrDefault(friendship.RequesterId);

            responses.Add(new FriendRequestResponse
            {
                Id = friendship.Id,
                RequesterId = friendship.RequesterId,
                RequesterDisplayName = requesterProfile?.DisplayName ?? "Unknown",
                RequesterAvatarUrl = requesterProfile?.AvatarUrl,
                Status = friendship.Status.ToString().ToLowerInvariant(),
                CreatedAt = friendship.CreatedAt
            });
        }

        return responses;
    }

    /// <inheritdoc />
    public async Task<List<FriendRequestResponse>> GetSentRequestsAsync(Guid userId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        var friendships = await _friendRepository.GetSentRequestsAsync(userId);

        if (friendships.Count == 0)
        {
            return new List<FriendRequestResponse>();
        }

        // Batch fetch all addressee profiles
        var addresseeIds = friendships.Select(f => f.AddresseeId).Distinct().ToList();
        var userProfiles = await _userRepository.GetByIdsAsync(addresseeIds);
        var userDict = userProfiles.ToDictionary(u => u.Id);

        var responses = new List<FriendRequestResponse>();

        foreach (var friendship in friendships)
        {
            var addresseeProfile = userDict.GetValueOrDefault(friendship.AddresseeId);

            responses.Add(new FriendRequestResponse
            {
                Id = friendship.Id,
                RequesterId = friendship.RequesterId,
                RequesterDisplayName = addresseeProfile?.DisplayName ?? "Unknown",
                RequesterAvatarUrl = addresseeProfile?.AvatarUrl,
                Status = friendship.Status.ToString().ToLowerInvariant(),
                CreatedAt = friendship.CreatedAt
            });
        }

        return responses;
    }

    /// <inheritdoc />
    public async Task<FriendRequestResponse> AcceptRequestAsync(Guid userId, Guid requestId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (requestId == Guid.Empty)
        {
            throw new ArgumentException("Request ID cannot be empty.", nameof(requestId));
        }

        var friendship = await _friendRepository.AcceptRequestAsync(requestId, userId);

        var requesterProfile = await _userRepository.GetByIdAsync(friendship.RequesterId);

        return new FriendRequestResponse
        {
            Id = friendship.Id,
            RequesterId = friendship.RequesterId,
            RequesterDisplayName = requesterProfile?.DisplayName ?? "Unknown",
            RequesterAvatarUrl = requesterProfile?.AvatarUrl,
            Status = friendship.Status.ToString().ToLowerInvariant(),
            CreatedAt = friendship.CreatedAt
        };
    }

    /// <inheritdoc />
    public async Task<FriendRequestResponse> RejectRequestAsync(Guid userId, Guid requestId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (requestId == Guid.Empty)
        {
            throw new ArgumentException("Request ID cannot be empty.", nameof(requestId));
        }

        var friendship = await _friendRepository.RejectRequestAsync(requestId, userId);

        var requesterProfile = await _userRepository.GetByIdAsync(friendship.RequesterId);

        return new FriendRequestResponse
        {
            Id = friendship.Id,
            RequesterId = friendship.RequesterId,
            RequesterDisplayName = requesterProfile?.DisplayName ?? "Unknown",
            RequesterAvatarUrl = requesterProfile?.AvatarUrl,
            Status = friendship.Status.ToString().ToLowerInvariant(),
            CreatedAt = friendship.CreatedAt
        };
    }

    /// <inheritdoc />
    public async Task<FriendListResponse> GetFriendsAsync(Guid userId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        var friendships = await _friendRepository.GetFriendsAsync(userId);

        if (friendships.Count == 0)
        {
            return new FriendListResponse
            {
                Friends = new List<FriendResponse>(),
                TotalCount = 0
            };
        }

        // Determine friend IDs and batch fetch their profiles
        var friendIds = friendships.Select(f =>
            f.RequesterId == userId ? f.AddresseeId : f.RequesterId
        ).Distinct().ToList();

        var userProfiles = await _userRepository.GetByIdsAsync(friendIds);
        var userDict = userProfiles.ToDictionary(u => u.Id);

        var friendResponses = new List<FriendResponse>();

        foreach (var friendship in friendships)
        {
            var friendId = friendship.RequesterId == userId
                ? friendship.AddresseeId
                : friendship.RequesterId;

            var friendProfile = userDict.GetValueOrDefault(friendId);

            if (friendProfile != null)
            {
                friendResponses.Add(new FriendResponse
                {
                    UserId = friendId,
                    DisplayName = friendProfile.DisplayName,
                    AvatarUrl = friendProfile.AvatarUrl,
                    FriendsSince = friendship.AcceptedAt ?? friendship.CreatedAt
                });
            }
        }

        return new FriendListResponse
        {
            Friends = friendResponses,
            TotalCount = friendResponses.Count
        };
    }

    /// <inheritdoc />
    public async Task RemoveFriendAsync(Guid userId, Guid friendId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (friendId == Guid.Empty)
        {
            throw new ArgumentException("Friend ID cannot be empty.", nameof(friendId));
        }

        await _friendRepository.RemoveFriendAsync(userId, friendId);
    }

    /// <inheritdoc />
    public async Task<FriendResponse> GetFriendAsync(Guid userId, Guid friendId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (friendId == Guid.Empty)
        {
            throw new ArgumentException("Friend ID cannot be empty.", nameof(friendId));
        }

        // Verify friendship exists and is accepted
        var friendship = await _friendRepository.GetFriendshipAsync(userId, friendId);
        if (friendship == null || friendship.Status != FriendshipStatus.Accepted)
        {
            throw new KeyNotFoundException("Friend not found.");
        }

        var friendProfile = await _userRepository.GetByIdAsync(friendId);
        if (friendProfile == null)
        {
            throw new KeyNotFoundException($"Friend profile not found: {friendId}");
        }

        return new FriendResponse
        {
            UserId = friendId,
            DisplayName = friendProfile.DisplayName,
            AvatarUrl = friendProfile.AvatarUrl,
            FriendsSince = friendship.AcceptedAt ?? friendship.CreatedAt
        };
    }

    /// <inheritdoc />
    public async Task CancelRequestAsync(Guid userId, Guid requestId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (requestId == Guid.Empty)
        {
            throw new ArgumentException("Request ID cannot be empty.", nameof(requestId));
        }

        await _friendRepository.CancelRequestAsync(requestId, userId);
    }
}
