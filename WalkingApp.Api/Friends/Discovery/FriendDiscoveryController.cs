using Microsoft.AspNetCore.Mvc;
using WalkingApp.Api.Common.Extensions;
using WalkingApp.Api.Common.Models;
using WalkingApp.Api.Friends.Discovery.DTOs;

namespace WalkingApp.Api.Friends.Discovery;

/// <summary>
/// Controller for friend discovery operations.
/// </summary>
[ApiController]
[Route("api/friends/discovery")]
public class FriendDiscoveryController : ControllerBase
{
    private readonly IFriendDiscoveryService _discoveryService;

    public FriendDiscoveryController(IFriendDiscoveryService discoveryService)
    {
        ArgumentNullException.ThrowIfNull(discoveryService);
        _discoveryService = discoveryService;
    }

    /// <summary>
    /// Searches for users by display name.
    /// </summary>
    /// <param name="query">The search query string.</param>
    /// <returns>List of users matching the search query with friendship status.</returns>
    [HttpGet("search")]
    public async Task<ActionResult<ApiResponse<SearchUsersResponse>>> SearchUsers([FromQuery] string query)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<SearchUsersResponse>.ErrorResponse("User is not authenticated."));
        }

        if (string.IsNullOrWhiteSpace(query))
        {
            return BadRequest(ApiResponse<SearchUsersResponse>.ErrorResponse("Search query cannot be empty."));
        }

        try
        {
            var result = await _discoveryService.SearchUsersAsync(userId.Value, query);
            return Ok(ApiResponse<SearchUsersResponse>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<SearchUsersResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<SearchUsersResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Gets the current user's QR code for friend discovery.
    /// </summary>
    /// <returns>QR code data including image and deep link.</returns>
    [HttpGet("qr-code")]
    public async Task<ActionResult<ApiResponse<QrCodeResponse>>> GetMyQrCode()
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<QrCodeResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _discoveryService.GetMyQrCodeAsync(userId.Value);
            return Ok(ApiResponse<QrCodeResponse>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<QrCodeResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<QrCodeResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Gets a user's information by their QR code ID.
    /// </summary>
    /// <param name="qrCodeId">The QR code identifier.</param>
    /// <returns>User information.</returns>
    [HttpGet("qr-code/{qrCodeId}")]
    public async Task<ActionResult<ApiResponse<UserSearchResult>>> GetUserByQrCode(string qrCodeId)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<UserSearchResult>.ErrorResponse("User is not authenticated."));
        }

        if (string.IsNullOrWhiteSpace(qrCodeId))
        {
            return BadRequest(ApiResponse<UserSearchResult>.ErrorResponse("QR code ID cannot be empty."));
        }

        try
        {
            var result = await _discoveryService.GetUserByQrCodeAsync(qrCodeId);
            return Ok(ApiResponse<UserSearchResult>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<UserSearchResult>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<UserSearchResult>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Generates a shareable invite link.
    /// </summary>
    /// <param name="request">Link generation parameters.</param>
    /// <returns>Generated invite link data.</returns>
    [HttpPost("invite-links")]
    public async Task<ActionResult<ApiResponse<GenerateInviteLinkResponse>>> GenerateInviteLink(
        [FromBody] GenerateInviteLinkRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<GenerateInviteLinkResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _discoveryService.GenerateInviteLinkAsync(userId.Value, request);
            return Ok(ApiResponse<GenerateInviteLinkResponse>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<GenerateInviteLinkResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<GenerateInviteLinkResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Redeems an invite code (from QR or share link) and sends a friend request.
    /// </summary>
    /// <param name="request">The invite code redemption request.</param>
    /// <returns>No content on success.</returns>
    [HttpPost("redeem")]
    public async Task<ActionResult<ApiResponse<object>>> RedeemInviteCode(
        [FromBody] RedeemInviteCodeRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<object>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            await _discoveryService.RedeemInviteCodeAsync(userId.Value, request.Code);
            return Ok(ApiResponse<object>.SuccessResponse(new { message = "Friend request sent successfully." }));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
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
