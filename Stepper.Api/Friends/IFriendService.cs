using Stepper.Api.Friends.DTOs;

namespace Stepper.Api.Friends;

/// <summary>
/// Service interface for friend business logic.
/// </summary>
public interface IFriendService
{
    /// <summary>
    /// Sends a friend request to another user.
    /// </summary>
    /// <param name="userId">The ID of the user sending the request.</param>
    /// <param name="request">The friend request details.</param>
    /// <returns>The created friend request response.</returns>
    Task<FriendRequestResponse> SendFriendRequestAsync(Guid userId, SendFriendRequestRequest request);

    /// <summary>
    /// Gets all pending incoming friend requests for a user.
    /// </summary>
    /// <param name="userId">The ID of the user.</param>
    /// <returns>List of pending incoming friend requests.</returns>
    Task<List<FriendRequestResponse>> GetPendingRequestsAsync(Guid userId);

    /// <summary>
    /// Gets all pending outgoing friend requests sent by a user.
    /// </summary>
    /// <param name="userId">The ID of the user.</param>
    /// <returns>List of pending outgoing friend requests.</returns>
    Task<List<FriendRequestResponse>> GetSentRequestsAsync(Guid userId);

    /// <summary>
    /// Accepts a friend request.
    /// </summary>
    /// <param name="userId">The ID of the user accepting the request.</param>
    /// <param name="requestId">The ID of the friend request.</param>
    /// <returns>The updated friend request response.</returns>
    Task<FriendRequestResponse> AcceptRequestAsync(Guid userId, Guid requestId);

    /// <summary>
    /// Rejects a friend request.
    /// </summary>
    /// <param name="userId">The ID of the user rejecting the request.</param>
    /// <param name="requestId">The ID of the friend request.</param>
    /// <returns>The updated friend request response.</returns>
    Task<FriendRequestResponse> RejectRequestAsync(Guid userId, Guid requestId);

    /// <summary>
    /// Gets the list of friends for a user.
    /// </summary>
    /// <param name="userId">The ID of the user.</param>
    /// <returns>The friend list response.</returns>
    Task<FriendListResponse> GetFriendsAsync(Guid userId);

    /// <summary>
    /// Removes a friendship.
    /// </summary>
    /// <param name="userId">The ID of the user removing the friend.</param>
    /// <param name="friendId">The ID of the friend to remove.</param>
    Task RemoveFriendAsync(Guid userId, Guid friendId);

    /// <summary>
    /// Gets a specific friend's profile.
    /// </summary>
    /// <param name="userId">The ID of the user requesting the friend's profile.</param>
    /// <param name="friendId">The ID of the friend.</param>
    /// <returns>The friend's profile.</returns>
    Task<FriendResponse> GetFriendAsync(Guid userId, Guid friendId);

    /// <summary>
    /// Cancels an outgoing friend request.
    /// </summary>
    /// <param name="userId">The ID of the user canceling the request.</param>
    /// <param name="requestId">The ID of the friend request to cancel.</param>
    Task CancelRequestAsync(Guid userId, Guid requestId);
}
