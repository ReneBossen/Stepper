using Microsoft.AspNetCore.Mvc;
using WalkingApp.Api.Common.Extensions;
using WalkingApp.Api.Common.Models;
using WalkingApp.Api.Users.DTOs;

namespace WalkingApp.Api.Users;

/// <summary>
/// Controller for user profile management endpoints.
/// </summary>
[ApiController]
[Route("api/v1/users")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        ArgumentNullException.ThrowIfNull(userService);
        _userService = userService;
    }

    /// <summary>
    /// Gets the authenticated user's profile.
    /// </summary>
    /// <returns>The user's profile.</returns>
    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<GetProfileResponse>>> GetMyProfile()
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<GetProfileResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var profile = await _userService.EnsureProfileExistsAsync(userId.Value);
            return Ok(ApiResponse<GetProfileResponse>.SuccessResponse(profile));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<GetProfileResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Updates the authenticated user's profile.
    /// </summary>
    /// <param name="request">The profile update request.</param>
    /// <returns>The updated profile.</returns>
    [HttpPut("me")]
    public async Task<ActionResult<ApiResponse<GetProfileResponse>>> UpdateMyProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<GetProfileResponse>.ErrorResponse("User is not authenticated."));
        }

        if (request == null)
        {
            return BadRequest(ApiResponse<GetProfileResponse>.ErrorResponse("Request body cannot be null."));
        }

        try
        {
            var profile = await _userService.UpdateProfileAsync(userId.Value, request);
            return Ok(ApiResponse<GetProfileResponse>.SuccessResponse(profile));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<GetProfileResponse>.ErrorResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<GetProfileResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<GetProfileResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Gets a public profile by user ID (for friends feature).
    /// </summary>
    /// <param name="id">The user ID.</param>
    /// <returns>The user's public profile.</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<GetProfileResponse>>> GetProfileById(Guid id)
    {
        var currentUserId = User.GetUserId();

        if (currentUserId == null)
        {
            return Unauthorized(ApiResponse<GetProfileResponse>.ErrorResponse("User is not authenticated."));
        }

        if (id == Guid.Empty)
        {
            return BadRequest(ApiResponse<GetProfileResponse>.ErrorResponse("User ID cannot be empty."));
        }

        try
        {
            var profile = await _userService.GetProfileAsync(id);
            return Ok(ApiResponse<GetProfileResponse>.SuccessResponse(profile));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<GetProfileResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<GetProfileResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }
}
