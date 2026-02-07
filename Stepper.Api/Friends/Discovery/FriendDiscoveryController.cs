using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Stepper.Api.Common.Extensions;
using Stepper.Api.Common.Models;
using Stepper.Api.Friends.Discovery.DTOs;

namespace Stepper.Api.Friends.Discovery;

/// <summary>
/// Controller for friend discovery operations.
/// </summary>
[ApiController]
[Authorize]
[Route("api/v1/friends/discovery")]
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

        var result = await _discoveryService.SearchUsersAsync(userId.Value, query);
        return Ok(ApiResponse<SearchUsersResponse>.SuccessResponse(result));
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

        var result = await _discoveryService.GetMyQrCodeAsync(userId.Value);
        return Ok(ApiResponse<QrCodeResponse>.SuccessResponse(result));
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

        var result = await _discoveryService.GetUserByQrCodeAsync(qrCodeId);
        return Ok(ApiResponse<UserSearchResult>.SuccessResponse(result));
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

        var result = await _discoveryService.GenerateInviteLinkAsync(userId.Value, request);
        return Ok(ApiResponse<GenerateInviteLinkResponse>.SuccessResponse(result));
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

        await _discoveryService.RedeemInviteCodeAsync(userId.Value, request.Code);
        return Ok(ApiResponse<object>.SuccessResponse(new { message = "Friend request sent successfully." }));
    }
}
