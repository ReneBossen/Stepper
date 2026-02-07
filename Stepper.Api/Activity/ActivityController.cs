using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Stepper.Api.Activity.DTOs;
using Stepper.Api.Common.Extensions;
using Stepper.Api.Common.Models;

namespace Stepper.Api.Activity;

/// <summary>
/// Controller for activity feed operations.
/// </summary>
[ApiController]
[Route("api/v1/activity")]
[Authorize]
public class ActivityController : ControllerBase
{
    private readonly IActivityService _activityService;

    /// <summary>
    /// Initializes a new instance of the <see cref="ActivityController"/> class.
    /// </summary>
    /// <param name="activityService">The activity service.</param>
    public ActivityController(IActivityService activityService)
    {
        ArgumentNullException.ThrowIfNull(activityService);
        _activityService = activityService;
    }

    /// <summary>
    /// Gets the activity feed for the current user.
    /// Returns activities from the user and their friends, ordered by most recent.
    /// </summary>
    /// <param name="limit">Maximum number of items to return (default: 20, max: 100).</param>
    /// <param name="offset">Number of items to skip for pagination (default: 0).</param>
    /// <returns>The paginated activity feed.</returns>
    [HttpGet("feed")]
    public async Task<ActionResult<ApiResponse<ActivityFeedResponse>>> GetFeed(
        [FromQuery] int limit = 20,
        [FromQuery] int offset = 0)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<ActivityFeedResponse>.ErrorResponse("User is not authenticated."));
        }

        var result = await _activityService.GetFeedAsync(userId.Value, limit, offset);
        return Ok(ApiResponse<ActivityFeedResponse>.SuccessResponse(result));
    }

    /// <summary>
    /// Gets a single activity item by ID.
    /// </summary>
    /// <param name="id">The unique identifier of the activity.</param>
    /// <returns>The activity item.</returns>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ActivityItemResponse>>> GetActivityItem(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<ActivityItemResponse>.ErrorResponse("User is not authenticated."));
        }

        var result = await _activityService.GetByIdAsync(userId.Value, id);
        return Ok(ApiResponse<ActivityItemResponse>.SuccessResponse(result));
    }
}
