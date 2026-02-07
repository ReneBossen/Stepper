using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Stepper.Api.Common.Extensions;
using Stepper.Api.Common.Models;
using Stepper.Api.Users.DTOs;

namespace Stepper.Api.Users;

/// <summary>
/// Controller for user profile management endpoints.
/// </summary>
[ApiController]
[Authorize]
[Route("api/v1/users")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(IUserService userService, ILogger<UsersController> logger)
    {
        ArgumentNullException.ThrowIfNull(userService);
        ArgumentNullException.ThrowIfNull(logger);
        _userService = userService;
        _logger = logger;
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

        var profile = await _userService.EnsureProfileExistsAsync(userId.Value);
        return Ok(ApiResponse<GetProfileResponse>.SuccessResponse(profile));
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

        var profile = await _userService.UpdateProfileAsync(userId.Value, request);
        return Ok(ApiResponse<GetProfileResponse>.SuccessResponse(profile));
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

        var profile = await _userService.GetProfileAsync(id);
        return Ok(ApiResponse<GetProfileResponse>.SuccessResponse(profile));
    }

    /// <summary>
    /// Gets the authenticated user's preferences.
    /// </summary>
    /// <returns>The user's preferences.</returns>
    [HttpGet("me/preferences")]
    public async Task<ActionResult<ApiResponse<UserPreferencesResponse>>> GetMyPreferences()
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<UserPreferencesResponse>.ErrorResponse("User is not authenticated."));
        }

        var preferences = await _userService.GetPreferencesAsync(userId.Value);
        return Ok(ApiResponse<UserPreferencesResponse>.SuccessResponse(preferences));
    }

    /// <summary>
    /// Updates the authenticated user's preferences.
    /// </summary>
    /// <param name="request">The preferences update request.</param>
    /// <returns>The updated preferences.</returns>
    [HttpPut("me/preferences")]
    public async Task<ActionResult<ApiResponse<UserPreferencesResponse>>> UpdateMyPreferences([FromBody] UpdateUserPreferencesRequest request)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<UserPreferencesResponse>.ErrorResponse("User is not authenticated."));
        }

        if (request == null)
        {
            return BadRequest(ApiResponse<UserPreferencesResponse>.ErrorResponse("Request body cannot be null."));
        }

        var preferences = await _userService.UpdatePreferencesAsync(userId.Value, request);
        return Ok(ApiResponse<UserPreferencesResponse>.SuccessResponse(preferences));
    }

    /// <summary>
    /// Exports all user data for GDPR data portability compliance.
    /// </summary>
    /// <remarks>
    /// Returns a complete export of the authenticated user's data including:
    /// profile, preferences, step history, friendships, group memberships,
    /// activity feed, and notifications. This endpoint supports GDPR Article 20
    /// (Right to Data Portability).
    /// </remarks>
    /// <returns>Complete user data export in JSON format.</returns>
    [HttpGet("me/data-export")]
    public async Task<ActionResult<ApiResponse<UserDataExportResponse>>> ExportMyData()
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<UserDataExportResponse>.ErrorResponse("User is not authenticated."));
        }

        var exportData = await _userService.ExportUserDataAsync(userId.Value);
        return Ok(ApiResponse<UserDataExportResponse>.SuccessResponse(exportData));
    }

    /// <summary>
    /// Uploads a new avatar image for the authenticated user.
    /// </summary>
    /// <param name="file">The image file to upload.</param>
    /// <returns>The avatar upload response containing the new URL.</returns>
    [HttpPost("me/avatar")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<AvatarUploadResponse>>> UploadAvatar(IFormFile file)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<AvatarUploadResponse>.ErrorResponse("User is not authenticated."));
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<AvatarUploadResponse>.ErrorResponse("No file was provided."));
        }

        using var stream = file.OpenReadStream();
        var response = await _userService.UploadAvatarAsync(
            userId.Value,
            stream,
            file.FileName,
            file.ContentType);

        return Ok(ApiResponse<AvatarUploadResponse>.SuccessResponse(response));
    }

    /// <summary>
    /// Gets user statistics including friends count, groups count, and badges count.
    /// </summary>
    /// <remarks>
    /// Authorization is handled by Supabase Row Level Security (RLS) policies.
    /// Users can only view statistics for themselves or their accepted friends.
    /// RLS policies restrict data access based on friendship status in the database.
    /// </remarks>
    /// <param name="id">The user ID.</param>
    /// <returns>The user statistics.</returns>
    [HttpGet("{id}/stats")]
    public async Task<ActionResult<ApiResponse<UserStatsResponse>>> GetUserStats(Guid id)
    {
        var currentUserId = User.GetUserId();

        if (currentUserId == null)
        {
            return Unauthorized(ApiResponse<UserStatsResponse>.ErrorResponse("User is not authenticated."));
        }

        if (id == Guid.Empty)
        {
            return BadRequest(ApiResponse<UserStatsResponse>.ErrorResponse("User ID cannot be empty."));
        }

        var stats = await _userService.GetUserStatsAsync(id);
        return Ok(ApiResponse<UserStatsResponse>.SuccessResponse(stats));
    }

    /// <summary>
    /// Gets weekly activity summary for a user.
    /// </summary>
    /// <remarks>
    /// Authorization is handled by Supabase Row Level Security (RLS) policies.
    /// Users can only view activity for themselves or their accepted friends.
    /// RLS policies restrict data access based on friendship status in the database.
    /// </remarks>
    /// <param name="id">The user ID.</param>
    /// <returns>The weekly activity summary.</returns>
    [HttpGet("{id}/activity")]
    public async Task<ActionResult<ApiResponse<UserActivityResponse>>> GetUserActivity(Guid id)
    {
        var currentUserId = User.GetUserId();

        if (currentUserId == null)
        {
            return Unauthorized(ApiResponse<UserActivityResponse>.ErrorResponse("User is not authenticated."));
        }

        if (id == Guid.Empty)
        {
            return BadRequest(ApiResponse<UserActivityResponse>.ErrorResponse("User ID cannot be empty."));
        }

        var activity = await _userService.GetUserActivityAsync(id);
        return Ok(ApiResponse<UserActivityResponse>.SuccessResponse(activity));
    }

    /// <summary>
    /// Gets groups that are shared between the current user and another user.
    /// </summary>
    /// <remarks>
    /// Authorization is handled by Supabase Row Level Security (RLS) policies.
    /// Users can only view mutual groups with their accepted friends.
    /// RLS policies restrict data access based on friendship status in the database.
    /// </remarks>
    /// <param name="id">The other user ID.</param>
    /// <returns>List of mutual groups.</returns>
    [HttpGet("{id}/mutual-groups")]
    public async Task<ActionResult<ApiResponse<List<MutualGroupResponse>>>> GetMutualGroups(Guid id)
    {
        var currentUserId = User.GetUserId();

        if (currentUserId == null)
        {
            return Unauthorized(ApiResponse<List<MutualGroupResponse>>.ErrorResponse("User is not authenticated."));
        }

        if (id == Guid.Empty)
        {
            return BadRequest(ApiResponse<List<MutualGroupResponse>>.ErrorResponse("User ID cannot be empty."));
        }

        var mutualGroups = await _userService.GetMutualGroupsAsync(currentUserId.Value, id);
        return Ok(ApiResponse<List<MutualGroupResponse>>.SuccessResponse(mutualGroups));
    }
}
