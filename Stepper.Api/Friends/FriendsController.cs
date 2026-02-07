using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Stepper.Api.Common.Extensions;
using Stepper.Api.Common.Models;
using Stepper.Api.Friends.DTOs;

namespace Stepper.Api.Friends;

/// <summary>
/// Controller for friend-related operations.
/// </summary>
[ApiController]
[Authorize]
[Route("api/v1/friends")]
public class FriendsController : ControllerBase
{
    private readonly IFriendService _friendService;

    public FriendsController(IFriendService friendService)
    {
        ArgumentNullException.ThrowIfNull(friendService);
        _friendService = friendService;
    }

    /// <summary>
    /// Sends a friend request to another user.
    /// </summary>
    /// <param name="request">The friend request details.</param>
    /// <returns>The created friend request.</returns>
    [HttpPost("requests")]
    public async Task<ActionResult<ApiResponse<FriendRequestResponse>>> SendFriendRequest(
        [FromBody] SendFriendRequestRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<FriendRequestResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _friendService.SendFriendRequestAsync(userId.Value, request);
            return Ok(ApiResponse<FriendRequestResponse>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<FriendRequestResponse>.ErrorResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<FriendRequestResponse>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<FriendRequestResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<FriendRequestResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Gets all pending incoming friend requests for the current user.
    /// </summary>
    /// <returns>List of pending incoming friend requests.</returns>
    [HttpGet("requests/incoming")]
    public async Task<ActionResult<ApiResponse<List<FriendRequestResponse>>>> GetPendingRequests()
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<List<FriendRequestResponse>>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _friendService.GetPendingRequestsAsync(userId.Value);
            return Ok(ApiResponse<List<FriendRequestResponse>>.SuccessResponse(result));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<List<FriendRequestResponse>>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Gets all pending outgoing friend requests sent by the current user.
    /// </summary>
    /// <returns>List of pending outgoing friend requests.</returns>
    [HttpGet("requests/outgoing")]
    public async Task<ActionResult<ApiResponse<List<FriendRequestResponse>>>> GetSentRequests()
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<List<FriendRequestResponse>>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _friendService.GetSentRequestsAsync(userId.Value);
            return Ok(ApiResponse<List<FriendRequestResponse>>.SuccessResponse(result));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<List<FriendRequestResponse>>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Accepts a friend request.
    /// </summary>
    /// <param name="requestId">The ID of the friend request to accept.</param>
    /// <returns>The updated friend request.</returns>
    [HttpPost("requests/{requestId}/accept")]
    public async Task<ActionResult<ApiResponse<FriendRequestResponse>>> AcceptRequest(Guid requestId)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<FriendRequestResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _friendService.AcceptRequestAsync(userId.Value, requestId);
            return Ok(ApiResponse<FriendRequestResponse>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<FriendRequestResponse>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<FriendRequestResponse>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<FriendRequestResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<FriendRequestResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Rejects a friend request.
    /// </summary>
    /// <param name="requestId">The ID of the friend request to reject.</param>
    /// <returns>The updated friend request.</returns>
    [HttpPost("requests/{requestId}/reject")]
    public async Task<ActionResult<ApiResponse<FriendRequestResponse>>> RejectRequest(Guid requestId)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<FriendRequestResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _friendService.RejectRequestAsync(userId.Value, requestId);
            return Ok(ApiResponse<FriendRequestResponse>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<FriendRequestResponse>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<FriendRequestResponse>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<FriendRequestResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<FriendRequestResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Cancels an outgoing friend request.
    /// </summary>
    /// <param name="requestId">The ID of the friend request to cancel.</param>
    /// <returns>No content.</returns>
    [HttpDelete("requests/{requestId}")]
    public async Task<ActionResult<ApiResponse<object>>> CancelRequest(Guid requestId)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<object>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            await _friendService.CancelRequestAsync(userId.Value, requestId);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<object>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Gets the list of friends for the current user.
    /// </summary>
    /// <returns>The friend list.</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<FriendListResponse>>> GetFriends()
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<FriendListResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _friendService.GetFriendsAsync(userId.Value);
            return Ok(ApiResponse<FriendListResponse>.SuccessResponse(result));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<FriendListResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Gets a specific friend's profile.
    /// </summary>
    /// <param name="friendId">The ID of the friend.</param>
    /// <returns>The friend's profile.</returns>
    [HttpGet("{friendId}")]
    public async Task<ActionResult<ApiResponse<FriendResponse>>> GetFriend(Guid friendId)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<FriendResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _friendService.GetFriendAsync(userId.Value, friendId);
            return Ok(ApiResponse<FriendResponse>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<FriendResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<FriendResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Removes a friend.
    /// </summary>
    /// <param name="friendId">The ID of the friend to remove.</param>
    /// <returns>No content.</returns>
    [HttpDelete("{friendId}")]
    public async Task<ActionResult<ApiResponse<object>>> RemoveFriend(Guid friendId)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<object>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            await _friendService.RemoveFriendAsync(userId.Value, friendId);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }
}
