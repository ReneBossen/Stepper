namespace WalkingApp.Api.Friends;

/// <summary>
/// Repository interface for friend data access.
/// </summary>
public interface IFriendRepository
{
    /// <summary>
    /// Sends a friend request from one user to another.
    /// </summary>
    /// <param name="requesterId">The ID of the user sending the request.</param>
    /// <param name="addresseeId">The ID of the user receiving the request.</param>
    /// <returns>The created friendship.</returns>
    Task<Friendship> SendRequestAsync(Guid requesterId, Guid addresseeId);

    /// <summary>
    /// Gets all pending incoming friend requests for a user.
    /// </summary>
    /// <param name="userId">The ID of the user.</param>
    /// <returns>List of pending incoming friend requests.</returns>
    Task<List<Friendship>> GetPendingRequestsAsync(Guid userId);

    /// <summary>
    /// Gets all pending outgoing friend requests sent by a user.
    /// </summary>
    /// <param name="userId">The ID of the user.</param>
    /// <returns>List of pending outgoing friend requests.</returns>
    Task<List<Friendship>> GetSentRequestsAsync(Guid userId);

    /// <summary>
    /// Accepts a friend request.
    /// </summary>
    /// <param name="requestId">The ID of the friend request.</param>
    /// <param name="userId">The ID of the user accepting the request (must be addressee).</param>
    /// <returns>The updated friendship.</returns>
    Task<Friendship> AcceptRequestAsync(Guid requestId, Guid userId);

    /// <summary>
    /// Rejects a friend request.
    /// </summary>
    /// <param name="requestId">The ID of the friend request.</param>
    /// <param name="userId">The ID of the user rejecting the request (must be addressee).</param>
    /// <returns>The updated friendship.</returns>
    Task<Friendship> RejectRequestAsync(Guid requestId, Guid userId);

    /// <summary>
    /// Gets all accepted friends for a user.
    /// </summary>
    /// <param name="userId">The ID of the user.</param>
    /// <returns>List of accepted friendships.</returns>
    Task<List<Friendship>> GetFriendsAsync(Guid userId);

    /// <summary>
    /// Gets a specific friendship between two users.
    /// </summary>
    /// <param name="userId">The ID of one user.</param>
    /// <param name="friendId">The ID of the other user.</param>
    /// <returns>The friendship, or null if not found.</returns>
    Task<Friendship?> GetFriendshipAsync(Guid userId, Guid friendId);

    /// <summary>
    /// Removes a friendship between two users.
    /// </summary>
    /// <param name="userId">The ID of one user.</param>
    /// <param name="friendId">The ID of the other user.</param>
    Task RemoveFriendAsync(Guid userId, Guid friendId);

    /// <summary>
    /// Blocks a user.
    /// </summary>
    /// <param name="userId">The ID of the user doing the blocking.</param>
    /// <param name="blockedUserId">The ID of the user being blocked.</param>
    /// <returns>The created/updated friendship with blocked status.</returns>
    Task<Friendship> BlockUserAsync(Guid userId, Guid blockedUserId);

    /// <summary>
    /// Cancels an outgoing friend request.
    /// </summary>
    /// <param name="requestId">The ID of the friend request.</param>
    /// <param name="userId">The ID of the user canceling the request (must be requester).</param>
    Task CancelRequestAsync(Guid requestId, Guid userId);
}
