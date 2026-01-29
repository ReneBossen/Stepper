using Stepper.Api.Groups.DTOs;

namespace Stepper.Api.Groups;

/// <summary>
/// Service interface for group business logic.
/// </summary>
public interface IGroupService
{
    /// <summary>
    /// Creates a new group with the user as owner.
    /// </summary>
    /// <param name="userId">The ID of the user creating the group.</param>
    /// <param name="request">The group creation request.</param>
    /// <returns>The created group response.</returns>
    Task<GroupResponse> CreateGroupAsync(Guid userId, CreateGroupRequest request);

    /// <summary>
    /// Gets a group by ID if the user is a member.
    /// </summary>
    /// <param name="userId">The ID of the requesting user.</param>
    /// <param name="groupId">The ID of the group.</param>
    /// <returns>The group response.</returns>
    Task<GroupResponse> GetGroupAsync(Guid userId, Guid groupId);

    /// <summary>
    /// Gets all groups the user is a member of.
    /// </summary>
    /// <param name="userId">The ID of the user.</param>
    /// <returns>The list of groups.</returns>
    Task<GroupListResponse> GetUserGroupsAsync(Guid userId);

    /// <summary>
    /// Updates a group (admin/owner only).
    /// </summary>
    /// <param name="userId">The ID of the user updating the group.</param>
    /// <param name="groupId">The ID of the group.</param>
    /// <param name="request">The update request.</param>
    /// <returns>The updated group response.</returns>
    Task<GroupResponse> UpdateGroupAsync(Guid userId, Guid groupId, UpdateGroupRequest request);

    /// <summary>
    /// Deletes a group (owner only).
    /// </summary>
    /// <param name="userId">The ID of the user deleting the group.</param>
    /// <param name="groupId">The ID of the group.</param>
    Task DeleteGroupAsync(Guid userId, Guid groupId);

    /// <summary>
    /// Joins a group (public or with valid join code).
    /// </summary>
    /// <param name="userId">The ID of the user joining.</param>
    /// <param name="groupId">The ID of the group.</param>
    /// <param name="request">The join request (contains join code for private groups).</param>
    /// <returns>The group response.</returns>
    Task<GroupResponse> JoinGroupAsync(Guid userId, Guid groupId, JoinGroupRequest request);

    /// <summary>
    /// Leaves a group.
    /// </summary>
    /// <param name="userId">The ID of the user leaving.</param>
    /// <param name="groupId">The ID of the group.</param>
    Task LeaveGroupAsync(Guid userId, Guid groupId);

    /// <summary>
    /// Invites a member to the group (admin/owner only).
    /// </summary>
    /// <param name="userId">The ID of the user inviting.</param>
    /// <param name="groupId">The ID of the group.</param>
    /// <param name="request">The invite request.</param>
    /// <returns>The group membership response.</returns>
    Task<GroupMemberResponse> InviteMemberAsync(Guid userId, Guid groupId, InviteMemberRequest request);

    /// <summary>
    /// Removes a member from the group (admin/owner only).
    /// </summary>
    /// <param name="userId">The ID of the user removing the member.</param>
    /// <param name="groupId">The ID of the group.</param>
    /// <param name="targetUserId">The ID of the member to remove.</param>
    Task RemoveMemberAsync(Guid userId, Guid groupId, Guid targetUserId);

    /// <summary>
    /// Gets all members of a group.
    /// </summary>
    /// <param name="userId">The ID of the requesting user.</param>
    /// <param name="groupId">The ID of the group.</param>
    /// <returns>List of group members.</returns>
    Task<List<GroupMemberResponse>> GetMembersAsync(Guid userId, Guid groupId);

    /// <summary>
    /// Gets the leaderboard for a group's current competition period.
    /// </summary>
    /// <param name="userId">The ID of the requesting user.</param>
    /// <param name="groupId">The ID of the group.</param>
    /// <returns>The leaderboard response.</returns>
    Task<LeaderboardResponse> GetLeaderboardAsync(Guid userId, Guid groupId);

    /// <summary>
    /// Regenerates the join code for a private group (admin/owner only).
    /// </summary>
    /// <param name="userId">The ID of the user regenerating the code.</param>
    /// <param name="groupId">The ID of the group.</param>
    /// <returns>The updated group response.</returns>
    Task<GroupResponse> RegenerateJoinCodeAsync(Guid userId, Guid groupId);

    /// <summary>
    /// Searches for public groups by name, excluding groups the user is already a member of.
    /// </summary>
    /// <param name="userId">The ID of the requesting user.</param>
    /// <param name="query">The search query (partial match on name).</param>
    /// <param name="limit">Maximum number of results to return.</param>
    /// <returns>List of matching public groups.</returns>
    Task<List<GroupSearchResponse>> SearchPublicGroupsAsync(Guid userId, string query, int limit);

    /// <summary>
    /// Gets a list of public groups, excluding groups the user is already a member of.
    /// </summary>
    /// <param name="userId">The ID of the requesting user.</param>
    /// <param name="limit">Maximum number of results to return.</param>
    /// <returns>List of public groups.</returns>
    Task<List<GroupSearchResponse>> GetPublicGroupsAsync(Guid userId, int limit);

    /// <summary>
    /// Joins a group using an invite code.
    /// </summary>
    /// <param name="userId">The ID of the user joining.</param>
    /// <param name="code">The invite code.</param>
    /// <returns>The group response.</returns>
    Task<GroupResponse> JoinByCodeAsync(Guid userId, string code);

    /// <summary>
    /// Updates a member's role in a group (owner only for admin promotion, admin/owner for member changes).
    /// </summary>
    /// <param name="userId">The ID of the user updating the role.</param>
    /// <param name="groupId">The ID of the group.</param>
    /// <param name="targetUserId">The ID of the member whose role is being updated.</param>
    /// <param name="newRole">The new role.</param>
    /// <returns>The updated member response.</returns>
    Task<GroupMemberResponse> UpdateMemberRoleAsync(Guid userId, Guid groupId, Guid targetUserId, MemberRole newRole);

    /// <summary>
    /// Gets members of a group filtered by status.
    /// </summary>
    /// <param name="userId">The ID of the requesting user.</param>
    /// <param name="groupId">The ID of the group.</param>
    /// <param name="status">Optional status filter (e.g., "pending").</param>
    /// <returns>List of group members.</returns>
    Task<List<GroupMemberResponse>> GetMembersAsync(Guid userId, Guid groupId, string? status);

    /// <summary>
    /// Approves a pending member's request to join the group (admin/owner only).
    /// </summary>
    /// <param name="userId">The ID of the user approving.</param>
    /// <param name="groupId">The ID of the group.</param>
    /// <param name="targetUserId">The ID of the pending member.</param>
    /// <returns>The approved member response.</returns>
    Task<GroupMemberResponse> ApproveMemberAsync(Guid userId, Guid groupId, Guid targetUserId);
}
