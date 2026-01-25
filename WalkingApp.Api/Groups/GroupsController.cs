using Microsoft.AspNetCore.Mvc;
using WalkingApp.Api.Common.Extensions;
using WalkingApp.Api.Common.Models;
using WalkingApp.Api.Groups.DTOs;

namespace WalkingApp.Api.Groups;

/// <summary>
/// Controller for group-related operations.
/// </summary>
[ApiController]
[Route("api/v1/groups")]
public class GroupsController : ControllerBase
{
    private readonly IGroupService _groupService;

    public GroupsController(IGroupService groupService)
    {
        ArgumentNullException.ThrowIfNull(groupService);
        _groupService = groupService;
    }

    /// <summary>
    /// Creates a new group with the current user as owner.
    /// </summary>
    /// <param name="request">The group creation request.</param>
    /// <returns>The created group.</returns>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<GroupResponse>>> CreateGroup(
        [FromBody] CreateGroupRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<GroupResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _groupService.CreateGroupAsync(userId.Value, request);
            return Ok(ApiResponse<GroupResponse>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<GroupResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<GroupResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Gets all groups the current user is a member of.
    /// </summary>
    /// <returns>List of groups.</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<GroupListResponse>>> GetUserGroups()
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<GroupListResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _groupService.GetUserGroupsAsync(userId.Value);
            return Ok(ApiResponse<GroupListResponse>.SuccessResponse(result));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<GroupListResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Gets a specific group by ID.
    /// </summary>
    /// <param name="id">The group ID.</param>
    /// <returns>The group details.</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<GroupResponse>>> GetGroup(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<GroupResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _groupService.GetGroupAsync(userId.Value, id);
            return Ok(ApiResponse<GroupResponse>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<GroupResponse>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<GroupResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<GroupResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Updates a group (admin/owner only).
    /// </summary>
    /// <param name="id">The group ID.</param>
    /// <param name="request">The update request.</param>
    /// <returns>The updated group.</returns>
    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<GroupResponse>>> UpdateGroup(
        Guid id,
        [FromBody] UpdateGroupRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<GroupResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _groupService.UpdateGroupAsync(userId.Value, id, request);
            return Ok(ApiResponse<GroupResponse>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<GroupResponse>.ErrorResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<GroupResponse>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<GroupResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<GroupResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Deletes a group (owner only).
    /// </summary>
    /// <param name="id">The group ID.</param>
    /// <returns>Success or error response.</returns>
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteGroup(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<object>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            await _groupService.DeleteGroupAsync(userId.Value, id);
            return Ok(ApiResponse<object>.SuccessResponse(new { message = "Group deleted successfully" }));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<object>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Joins a group (public or with valid join code).
    /// </summary>
    /// <param name="id">The group ID.</param>
    /// <param name="request">The join request (contains join code for private groups).</param>
    /// <returns>The joined group.</returns>
    [HttpPost("{id}/join")]
    public async Task<ActionResult<ApiResponse<GroupResponse>>> JoinGroup(
        Guid id,
        [FromBody] JoinGroupRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<GroupResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _groupService.JoinGroupAsync(userId.Value, id, request);
            return Ok(ApiResponse<GroupResponse>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<GroupResponse>.ErrorResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<GroupResponse>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<GroupResponse>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<GroupResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<GroupResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Leaves a group.
    /// </summary>
    /// <param name="id">The group ID.</param>
    /// <returns>Success or error response.</returns>
    [HttpPost("{id}/leave")]
    public async Task<ActionResult<ApiResponse<object>>> LeaveGroup(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<object>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            await _groupService.LeaveGroupAsync(userId.Value, id);
            return Ok(ApiResponse<object>.SuccessResponse(new { message = "Left group successfully" }));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.ErrorResponse(ex.Message));
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
    /// Gets all members of a group.
    /// </summary>
    /// <param name="id">The group ID.</param>
    /// <returns>List of group members.</returns>
    [HttpGet("{id}/members")]
    public async Task<ActionResult<ApiResponse<List<GroupMemberResponse>>>> GetMembers(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<List<GroupMemberResponse>>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _groupService.GetMembersAsync(userId.Value, id);
            return Ok(ApiResponse<List<GroupMemberResponse>>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<List<GroupMemberResponse>>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<List<GroupMemberResponse>>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<List<GroupMemberResponse>>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Invites a member to the group (admin/owner only).
    /// </summary>
    /// <param name="id">The group ID.</param>
    /// <param name="request">The invite request.</param>
    /// <returns>The invited member details.</returns>
    [HttpPost("{id}/members")]
    public async Task<ActionResult<ApiResponse<GroupMemberResponse>>> InviteMember(
        Guid id,
        [FromBody] InviteMemberRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<GroupMemberResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _groupService.InviteMemberAsync(userId.Value, id, request);
            return Ok(ApiResponse<GroupMemberResponse>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<GroupMemberResponse>.ErrorResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<GroupMemberResponse>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<GroupMemberResponse>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<GroupMemberResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<GroupMemberResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Removes a member from the group (admin/owner only).
    /// </summary>
    /// <param name="id">The group ID.</param>
    /// <param name="userId">The member's user ID.</param>
    /// <returns>Success or error response.</returns>
    [HttpDelete("{id}/members/{userId}")]
    public async Task<ActionResult<ApiResponse<object>>> RemoveMember(Guid id, Guid userId)
    {
        var currentUserId = User.GetUserId();
        if (currentUserId == null)
        {
            return Unauthorized(ApiResponse<object>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            await _groupService.RemoveMemberAsync(currentUserId.Value, id, userId);
            return Ok(ApiResponse<object>.SuccessResponse(new { message = "Member removed successfully" }));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
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
    /// Gets the leaderboard for a group's current competition period.
    /// </summary>
    /// <param name="id">The group ID.</param>
    /// <returns>The leaderboard.</returns>
    [HttpGet("{id}/leaderboard")]
    public async Task<ActionResult<ApiResponse<LeaderboardResponse>>> GetLeaderboard(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<LeaderboardResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _groupService.GetLeaderboardAsync(userId.Value, id);
            return Ok(ApiResponse<LeaderboardResponse>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<LeaderboardResponse>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<LeaderboardResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<LeaderboardResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    /// <summary>
    /// Regenerates the join code for a private group (admin/owner only).
    /// </summary>
    /// <param name="id">The group ID.</param>
    /// <returns>The updated group with new join code.</returns>
    [HttpPost("{id}/regenerate-code")]
    public async Task<ActionResult<ApiResponse<GroupResponse>>> RegenerateJoinCode(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<GroupResponse>.ErrorResponse("User is not authenticated."));
        }

        try
        {
            var result = await _groupService.RegenerateJoinCodeAsync(userId.Value, id);
            return Ok(ApiResponse<GroupResponse>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<GroupResponse>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<GroupResponse>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<GroupResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<GroupResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }
}
