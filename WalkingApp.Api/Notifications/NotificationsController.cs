using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WalkingApp.Api.Common.Extensions;
using WalkingApp.Api.Common.Models;
using WalkingApp.Api.Notifications.DTOs;

namespace WalkingApp.Api.Notifications;

/// <summary>
/// Controller for notification endpoints.
/// </summary>
[ApiController]
[Route("api/v1/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        ArgumentNullException.ThrowIfNull(notificationService);
        _notificationService = notificationService;
    }

    /// <summary>
    /// Gets all notifications for the authenticated user with pagination.
    /// </summary>
    /// <param name="limit">Maximum number of notifications to return (default: 20, max: 100).</param>
    /// <param name="offset">Number of notifications to skip (default: 0).</param>
    /// <returns>A paginated list of notifications.</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<NotificationListResponse>>> GetAll(
        [FromQuery] int limit = 20,
        [FromQuery] int offset = 0)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<NotificationListResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _notificationService.GetAllAsync(userId.Value, limit, offset);
            return Ok(ApiResponse<NotificationListResponse>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<NotificationListResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<NotificationListResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Gets the count of unread notifications for the authenticated user.
    /// </summary>
    /// <returns>The unread notification count.</returns>
    [HttpGet("unread/count")]
    public async Task<ActionResult<ApiResponse<UnreadCountResponse>>> GetUnreadCount()
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<UnreadCountResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _notificationService.GetUnreadCountAsync(userId.Value);
            return Ok(ApiResponse<UnreadCountResponse>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<UnreadCountResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<UnreadCountResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Marks a specific notification as read.
    /// </summary>
    /// <param name="id">The notification ID.</param>
    /// <returns>No content on success.</returns>
    [HttpPut("{id}/read")]
    public async Task<ActionResult<ApiResponse<object>>> MarkAsRead(Guid id)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<object>.ErrorResponse("User is not authenticated."));
        }

        if (id == Guid.Empty)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse("Notification ID cannot be empty."));
        }

        try
        {
            await _notificationService.MarkAsReadAsync(userId.Value, id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Marks all notifications as read for the authenticated user.
    /// </summary>
    /// <returns>No content on success.</returns>
    [HttpPut("read-all")]
    public async Task<ActionResult<ApiResponse<object>>> MarkAllAsRead()
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<object>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            await _notificationService.MarkAllAsReadAsync(userId.Value);
            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Deletes a specific notification.
    /// </summary>
    /// <param name="id">The notification ID.</param>
    /// <returns>No content on success.</returns>
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<object>.ErrorResponse("User is not authenticated."));
        }

        if (id == Guid.Empty)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse("Notification ID cannot be empty."));
        }

        try
        {
            await _notificationService.DeleteAsync(userId.Value, id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }
}
