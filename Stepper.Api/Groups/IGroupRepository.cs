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
    /// Gets a group by ID.
    /// </summary>
    /// <param name="groupId">The group ID.</param>
    /// <returns>The group, or null if not found.</returns>
    Task<Group?> GetByIdAsync(Guid groupId);

    /// <summary>
    /// Gets all groups a user is a member of.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>List of groups with the user's role in each.</returns>
    Task<List<(Group Group, MemberRole Role)>> GetUserGroupsAsync(Guid userId);

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
    /// Gets a group by join code.
    /// Reserved for future use (e.g., POST /api/groups/join-by-code endpoint).
    /// Currently, joining requires knowing the group ID and providing the join code for validation.
    /// </summary>
    /// <param name="joinCode">The join code.</param>
    /// <returns>The group, or null if not found.</returns>
    Task<Group?> GetByJoinCodeAsync(string joinCode);

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
}
