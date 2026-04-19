using Stepper.Api.Common.Models;

namespace Stepper.Api.Groups;

/// <summary>
/// Repository interface for group data access.
/// </summary>
public interface IGroupRepository
{
    /// <summary>
    /// Creates a new group.
    /// </summary>
    /// <param name="group">The group to create.</param>
    /// <returns>The created group.</returns>
    Task<Group> CreateAsync(Group group);

    /// <summary>
    /// Atomically creates a group, its owner membership, and its join code via
    /// the <c>create_group_with_owner</c> Supabase RPC. Required because the
    /// RLS policies on <c>group_memberships</c> and <c>group_join_codes</c>
    /// prevent the authenticated client from performing the three inserts
    /// separately. The caller is identified server-side via <c>auth.uid()</c>.
    /// </summary>
    /// <param name="input">The group fields supplied by the caller.</param>
    /// <returns>The ID of the newly created group.</returns>
    Task<Guid> CreateGroupWithOwnerAsync(CreateGroupInput input);

    /// <summary>
    /// Gets a group by ID.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    /// <returns>The group, or null if not found.</returns>
    Task<Group?> GetByIdAsync(Guid groupId);

    /// <summary>
    /// Gets all groups a user is a member of, including pending-approval rows.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>List of groups with the user's role and membership status in each.</returns>
    Task<List<(Group Group, MemberRole Role, MembershipStatus Status)>> GetUserGroupsAsync(Guid userId);

    /// <summary>
    /// Updates a group.
    /// </summary>
    /// <param name="group">The group to update.</param>
    /// <returns>The updated group.</returns>
    Task<Group> UpdateAsync(Group group);

    /// <summary>
    /// Deletes a group.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    /// <returns>True if deleted, false if not found.</returns>
    Task<bool> DeleteAsync(Guid groupId);

    /// <summary>
    /// Gets all members of a group.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    /// <returns>List of group memberships.</returns>
    Task<List<GroupMembership>> GetMembersAsync(Guid groupId);

    /// <summary>
    /// Adds a member to a group.
    /// </summary>
    /// <param name="membership">The group membership to create.</param>
    /// <returns>The created group membership.</returns>
    Task<GroupMembership> AddMemberAsync(GroupMembership membership);

    /// <summary>
    /// Removes a member from a group.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    /// <param name="userId">The user ID.</param>
    /// <returns>True if removed, false if not found.</returns>
    Task<bool> RemoveMemberAsync(Guid groupId, Guid userId);

    /// <summary>
    /// Updates a member's role in a group.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    /// <param name="userId">The user ID.</param>
    /// <param name="role">The new role.</param>
    /// <returns>The updated group membership.</returns>
    Task<GroupMembership> UpdateMemberRoleAsync(Guid groupId, Guid userId, MemberRole role);

    /// <summary>
    /// Gets a group by join code, looking up from the group_join_codes table.
    /// </summary>
    /// <param name="joinCode">The join code.</param>
    /// <returns>The group, or null if not found.</returns>
    Task<Group?> GetByJoinCodeAsync(string joinCode);

    /// <summary>
    /// Gets the join code for a group from the group_join_codes table.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    /// <returns>The join code, or null if none exists.</returns>
    Task<string?> GetJoinCodeAsync(Guid groupId);

    /// <summary>
    /// Creates a join code record for a group in the group_join_codes table.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    /// <param name="joinCode">The join code to store.</param>
    Task CreateJoinCodeAsync(Guid groupId, string joinCode);

    /// <summary>
    /// Updates the join code for a group in the group_join_codes table.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    /// <param name="joinCode">The new join code.</param>
    Task UpdateJoinCodeAsync(Guid groupId, string joinCode);

    /// <summary>
    /// Deletes the join code for a group from the group_join_codes table.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    Task DeleteJoinCodeAsync(Guid groupId);

    /// <summary>
    /// Gets a user's membership in a group.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    /// <param name="userId">The user ID.</param>
    /// <returns>The group membership, or null if not found.</returns>
    Task<GroupMembership?> GetMembershipAsync(Guid groupId, Guid userId);

    /// <summary>
    /// Gets the leaderboard for a group within a date range.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    /// <param name="period">The date range for the leaderboard.</param>
    /// <returns>List of leaderboard entries.</returns>
    Task<List<LeaderboardEntry>> GetLeaderboardAsync(Guid groupId, DateRange period);

    /// <summary>
    /// Gets the count of members in a group.
    /// Note: Member count is calculated on-demand via query to ensure real-time accuracy.
    /// For MVP, this trade-off (extra query vs. consistency) is acceptable.
    /// Future optimization: Consider database trigger to maintain cached count in groups table.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    /// <returns>The member count.</returns>
    Task<int> GetMemberCountAsync(Guid groupId);

    /// <summary>
    /// Searches public groups by name.
    /// </summary>
    /// <param name="query">The search query (partial match on name).</param>
    /// <param name="limit">Maximum number of results to return.</param>
    /// <returns>List of matching public groups.</returns>
    Task<List<Group>> SearchPublicGroupsAsync(string query, int limit);

    /// <summary>
    /// Gets public groups ordered by most recently created.
    /// </summary>
    /// <param name="limit">Maximum number of results to return.</param>
    /// <returns>List of public groups.</returns>
    Task<List<Group>> GetPublicGroupsAsync(int limit);

    /// <summary>
    /// Gets all group memberships for a user with full group details.
    /// Used for data export to include JoinedAt dates.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>List of tuples containing group, role, and join date.</returns>
    Task<List<(Group Group, MemberRole Role, DateTime JoinedAt)>> GetUserGroupMembershipsWithDetailsAsync(Guid userId);

    /// <summary>
    /// Joins the caller to a group identified by an invite code via the
    /// <c>join_group_by_code</c> SECURITY DEFINER RPC. The RPC enforces
    /// already-member, max_members, and require_approval.
    /// </summary>
    /// <param name="code">The invite code.</param>
    /// <returns>The joined group ID and the resulting membership status.</returns>
    Task<(Guid GroupId, MembershipStatus Status)> JoinGroupByCodeAsync(string code);

    /// <summary>
    /// Joins the caller to a public group via the <c>join_public_group</c>
    /// SECURITY DEFINER RPC. Rejects private groups and enforces max_members
    /// and require_approval.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    /// <returns>The joined group ID and the resulting membership status.</returns>
    Task<(Guid GroupId, MembershipStatus Status)> JoinPublicGroupAsync(Guid groupId);

    /// <summary>
    /// Promotes a pending membership row to active. Authorized via RLS:
    /// only owners and admins of the group can perform the UPDATE.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    /// <param name="userId">The pending user ID.</param>
    /// <returns>The updated membership.</returns>
    Task<GroupMembership> ApproveMembershipAsync(Guid groupId, Guid userId);

    /// <summary>
    /// Gets all members of a group, optionally filtered by membership status.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    /// <param name="status">Optional status filter. Pass null to return all.</param>
    /// <returns>List of group memberships.</returns>
    Task<List<GroupMembership>> GetMembersAsync(Guid groupId, MembershipStatus? status);

    /// <summary>
    /// Admin-only direct add of a user to a group via the <c>admin_add_member</c>
    /// SECURITY DEFINER RPC. Caller must be an active owner/admin of the group.
    /// Enforces max_members and already-member server-side.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    /// <param name="userId">The user to add.</param>
    /// <returns>The new membership id.</returns>
    Task<Guid> AdminAddMemberAsync(Guid groupId, Guid userId);

    /// <summary>
    /// Removes the caller from a group via the <c>leave_group</c> SECURITY
    /// DEFINER RPC. Enforces: caller must be a member; if owner, must be the
    /// only active member (prevents orphaning groups).
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    Task LeaveGroupAsync(Guid groupId);
}
