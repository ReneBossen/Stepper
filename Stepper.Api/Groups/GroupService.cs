using System.Security.Cryptography;
using Stepper.Api.Common.Models;
using Stepper.Api.Groups.DTOs;
using Stepper.Api.Users;
using User = Stepper.Api.Users.User;

namespace Stepper.Api.Groups;

/// <summary>
/// Service implementation for group business logic.
/// </summary>
public class GroupService : IGroupService
{
    private readonly IGroupRepository _groupRepository;
    private readonly IUserRepository _userRepository;
    private const int MinGroupNameLength = 2;
    private const int MaxGroupNameLength = 50;
    private const int JoinCodeLength = 8;

    public GroupService(
        IGroupRepository groupRepository,
        IUserRepository userRepository)
    {
        ArgumentNullException.ThrowIfNull(groupRepository);
        ArgumentNullException.ThrowIfNull(userRepository);

        _groupRepository = groupRepository;
        _userRepository = userRepository;
    }

    /// <inheritdoc />
    public async Task<GroupResponse> CreateGroupAsync(Guid userId, CreateGroupRequest request)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        ArgumentNullException.ThrowIfNull(request);

        // Validate group name
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Group name cannot be empty.");
        }

        if (request.Name.Length < MinGroupNameLength || request.Name.Length > MaxGroupNameLength)
        {
            throw new ArgumentException($"Group name must be between {MinGroupNameLength} and {MaxGroupNameLength} characters.");
        }

        ValidateMaxMembers(request.MaxMembers);

        // Atomic create: group + owner membership + join code row, via
        // SECURITY DEFINER RPC. Id, CreatedById, and CreatedAt are assigned
        // server-side (auth.uid() and NOW()).
        var input = new CreateGroupInput(
            Name: request.Name.Trim(),
            Description: request.Description?.Trim(),
            IsPublic: request.IsPublic,
            PeriodType: request.PeriodType,
            MaxMembers: request.MaxMembers,
            JoinCode: GenerateJoinCode());

        var newGroupId = await _groupRepository.CreateGroupWithOwnerAsync(input);

        var createdGroup = await _groupRepository.GetByIdAsync(newGroupId)
            ?? throw new InvalidOperationException("Failed to retrieve created group.");

        return await MapToGroupResponseAsync(createdGroup, MemberRole.Owner);
    }

    /// <inheritdoc />
    public async Task<GroupResponse> GetGroupAsync(Guid userId, Guid groupId)
    {
        ValidateUserId(userId);
        ValidateGroupId(groupId);

        var group = await _groupRepository.GetByIdAsync(groupId);
        if (group == null)
        {
            throw new KeyNotFoundException($"Group not found: {groupId}");
        }

        var membership = await _groupRepository.GetMembershipAsync(groupId, userId);
        if (membership == null && !group.IsPublic)
        {
            throw new UnauthorizedAccessException("You are not a member of this group.");
        }

        if (membership == null)
        {
            // Non-member viewing a public group — no role/status to report.
            return await MapToGroupResponseAsync(group, MemberRole.Member, status: null);
        }

        return await MapToGroupResponseAsync(group, membership.Role, membership.Status);
    }

    /// <inheritdoc />
    public async Task<GroupListResponse> GetUserGroupsAsync(Guid userId)
    {
        ValidateUserId(userId);

        var groupsWithRoles = await _groupRepository.GetUserGroupsAsync(userId);

        var groupResponses = new List<GroupResponse>();
        foreach (var (group, role, status) in groupsWithRoles)
        {
            groupResponses.Add(await MapToGroupResponseAsync(group, role, status));
        }

        return new GroupListResponse
        {
            Groups = groupResponses
        };
    }

    /// <inheritdoc />
    public async Task<GroupResponse> UpdateGroupAsync(Guid userId, Guid groupId, UpdateGroupRequest request)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (groupId == Guid.Empty)
        {
            throw new ArgumentException("Group ID cannot be empty.", nameof(groupId));
        }

        ArgumentNullException.ThrowIfNull(request);

        // Validate group name
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Group name cannot be empty.");
        }

        if (request.Name.Length < MinGroupNameLength || request.Name.Length > MaxGroupNameLength)
        {
            throw new ArgumentException($"Group name must be between {MinGroupNameLength} and {MaxGroupNameLength} characters.");
        }

        var group = await GetGroupOrThrowAsync(groupId);
        var membership = await GetActiveMembershipOrThrowAsync(groupId, userId);
        EnsureAdminRole(membership, "update the group");

        if (request.MaxMembers.HasValue)
        {
            ValidateMaxMembers(request.MaxMembers.Value);
            group.MaxMembers = request.MaxMembers.Value;
        }

        group.Name = request.Name.Trim();
        group.Description = request.Description?.Trim();
        group.IsPublic = request.IsPublic;

        var updatedGroup = await _groupRepository.UpdateAsync(group);

        var existingJoinCode = await _groupRepository.GetJoinCodeAsync(updatedGroup.Id);
        if (existingJoinCode == null)
        {
            var newCode = GenerateJoinCode();
            await _groupRepository.CreateJoinCodeAsync(updatedGroup.Id, newCode);
        }

        return await MapToGroupResponseAsync(updatedGroup, membership.Role);
    }

    /// <inheritdoc />
    public async Task DeleteGroupAsync(Guid userId, Guid groupId)
    {
        ValidateUserId(userId);
        ValidateGroupId(groupId);

        await GetGroupOrThrowAsync(groupId);
        var membership = await GetActiveMembershipOrThrowAsync(groupId, userId);

        if (membership.Role != MemberRole.Owner)
        {
            throw new UnauthorizedAccessException("Only the group owner can delete the group.");
        }

        await _groupRepository.DeleteAsync(groupId);
    }

    /// <inheritdoc />
    public async Task<GroupResponse> JoinGroupAsync(Guid userId, Guid groupId, JoinGroupRequest request)
    {
        ValidateUserId(userId);
        ValidateGroupId(groupId);
        ArgumentNullException.ThrowIfNull(request);

        // Private groups: delegate entirely to the join_group_by_code RPC path
        // so all validation lives in one place.
        if (!string.IsNullOrWhiteSpace(request.JoinCode))
        {
            return await JoinByCodeAsync(userId, request.JoinCode!);
        }

        // Public group path: SECURITY DEFINER RPC enforces is_public,
        // max_members, already-member, and require_approval.
        var (joinedGroupId, status) = await _groupRepository.JoinPublicGroupAsync(groupId);

        var refreshedGroup = await GetRefreshedGroupAsync(joinedGroupId);
        return await MapToGroupResponseAsync(refreshedGroup, MemberRole.Member, status);
    }

    /// <inheritdoc />
    public async Task LeaveGroupAsync(Guid userId, Guid groupId)
    {
        ValidateUserId(userId);
        ValidateGroupId(groupId);

        // The leave_group SECURITY DEFINER RPC enforces membership, owner
        // check, and active-member count server-side. TranslateRpcException
        // in the repository maps PostgreSQL error codes to the semantic .NET
        // exception types the middleware expects.
        await _groupRepository.LeaveGroupAsync(groupId);
    }

    /// <inheritdoc />
    public async Task<GroupMemberResponse> InviteMemberAsync(Guid userId, Guid groupId, InviteMemberRequest request)
    {
        ValidateUserId(userId);
        ValidateGroupId(groupId);
        ArgumentNullException.ThrowIfNull(request);

        if (request.UserId == Guid.Empty)
        {
            throw new ArgumentException("User ID to invite cannot be empty.");
        }

        await GetGroupOrThrowAsync(groupId);
        var membership = await GetActiveMembershipOrThrowAsync(groupId, userId);
        EnsureAdminRole(membership, "invite members");

        var userToInvite = await _userRepository.GetByIdAsync(request.UserId);
        if (userToInvite == null)
        {
            throw new KeyNotFoundException($"User not found: {request.UserId}");
        }

        // admin_add_member RPC enforces max_members and already-member checks
        await _groupRepository.AdminAddMemberAsync(groupId, request.UserId);

        var createdMembership = await _groupRepository.GetMembershipAsync(groupId, request.UserId)
            ?? throw new InvalidOperationException("Failed to retrieve added membership.");

        return MapToMemberResponse(createdMembership, userToInvite);
    }

    /// <inheritdoc />
    public async Task RemoveMemberAsync(Guid userId, Guid groupId, Guid targetUserId)
    {
        ValidateUserId(userId);
        ValidateGroupId(groupId);
        ValidateTargetUserId(targetUserId);

        await GetGroupOrThrowAsync(groupId);
        var membership = await GetActiveMembershipOrThrowAsync(groupId, userId);
        EnsureAdminRole(membership, "remove members");

        var targetMembership = await _groupRepository.GetMembershipAsync(groupId, targetUserId);
        if (targetMembership == null)
        {
            throw new InvalidOperationException("User is not a member of this group.");
        }

        if (targetMembership.Role == MemberRole.Owner)
        {
            throw new UnauthorizedAccessException("Cannot remove the group owner.");
        }

        if (membership.Role == MemberRole.Admin && targetMembership.Role == MemberRole.Admin)
        {
            throw new UnauthorizedAccessException("Admins cannot remove other admins.");
        }

        await _groupRepository.RemoveMemberAsync(groupId, targetUserId);
    }

    /// <inheritdoc />
    public Task<List<GroupMemberResponse>> GetMembersAsync(Guid userId, Guid groupId)
    {
        return GetMembersAsync(userId, groupId, status: null);
    }

    /// <inheritdoc />
    public async Task<LeaderboardResponse> GetLeaderboardAsync(Guid userId, Guid groupId)
    {
        ValidateUserId(userId);
        ValidateGroupId(groupId);

        var group = await GetGroupOrThrowAsync(groupId);
        _ = await GetActiveMembershipOrThrowAsync(groupId, userId);

        var (startDate, endDate) = CalculateCompetitionPeriod(group.PeriodType, DateTime.UtcNow);

        var dateRange = new DateRange
        {
            StartDate = startDate,
            EndDate = endDate
        };

        var entries = await _groupRepository.GetLeaderboardAsync(groupId, dateRange);

        return new LeaderboardResponse
        {
            GroupId = groupId,
            PeriodStart = startDate.ToDateTime(TimeOnly.MinValue),
            PeriodEnd = endDate.ToDateTime(TimeOnly.MaxValue),
            Entries = entries
        };
    }

    /// <inheritdoc />
    public async Task<GroupResponse> RegenerateJoinCodeAsync(Guid userId, Guid groupId)
    {
        ValidateUserId(userId);
        ValidateGroupId(groupId);

        var group = await GetGroupOrThrowAsync(groupId);
        var membership = await GetActiveMembershipOrThrowAsync(groupId, userId);
        EnsureAdminRole(membership, "regenerate the join code");

        var newJoinCode = GenerateJoinCode();
        await _groupRepository.UpdateJoinCodeAsync(groupId, newJoinCode);

        group.JoinCode = newJoinCode;

        return await MapToGroupResponseAsync(group, membership.Role);
    }

    private async Task<GroupResponse> MapToGroupResponseAsync(
        Group group,
        MemberRole role,
        MembershipStatus? status = MembershipStatus.Active)
    {
        // Fetch join code from separate table if not already on domain model.
        // Pending members and non-members cannot read group_join_codes under
        // RLS, so skip the lookup entirely for them.
        string? joinCode = null;
        if (status == MembershipStatus.Active && (role == MemberRole.Owner || role == MemberRole.Admin))
        {
            joinCode = group.JoinCode ?? await _groupRepository.GetJoinCodeAsync(group.Id);
        }

        return new GroupResponse
        {
            Id = group.Id,
            Name = group.Name,
            Description = group.Description,
            IsPublic = group.IsPublic,
            PeriodType = group.PeriodType,
            MemberCount = group.MemberCount,
            MaxMembers = group.MaxMembers,
            JoinCode = joinCode,
            Role = role,
            Status = status,
            CreatedAt = group.CreatedAt
        };
    }

    private static string GenerateJoinCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous characters
        var randomBytes = new byte[JoinCodeLength];
        RandomNumberGenerator.Fill(randomBytes);

        var code = new char[JoinCodeLength];
        for (int i = 0; i < JoinCodeLength; i++)
        {
            code[i] = chars[randomBytes[i] % chars.Length];
        }

        return new string(code);
    }

    private static (DateOnly StartDate, DateOnly EndDate) CalculateCompetitionPeriod(CompetitionPeriodType periodType, DateTime referenceDate)
    {
        var date = DateOnly.FromDateTime(referenceDate);

        return periodType switch
        {
            CompetitionPeriodType.Daily => (date, date),
            CompetitionPeriodType.Weekly => CalculateWeeklyPeriod(date),
            CompetitionPeriodType.Monthly => CalculateMonthlyPeriod(date),
            CompetitionPeriodType.Custom => (date, date), // For MVP, treat custom as daily
            _ => throw new ArgumentException($"Unknown period type: {periodType}")
        };
    }

    private static (DateOnly StartDate, DateOnly EndDate) CalculateWeeklyPeriod(DateOnly date)
    {
        // Find the start of the week (Monday)
        var dayOfWeek = (int)date.DayOfWeek;
        var daysFromMonday = dayOfWeek == 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
        var startDate = date.AddDays(-daysFromMonday);
        var endDate = startDate.AddDays(6);

        return (startDate, endDate);
    }

    private static (DateOnly StartDate, DateOnly EndDate) CalculateMonthlyPeriod(DateOnly date)
    {
        var startDate = new DateOnly(date.Year, date.Month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        return (startDate, endDate);
    }

    /// <inheritdoc />
    public async Task<List<GroupSearchResponse>> SearchPublicGroupsAsync(Guid userId, string query, int limit)
    {
        ValidateUserId(userId);
        ValidateSearchQuery(query);
        ValidateSearchLimit(limit);

        var groups = await _groupRepository.SearchPublicGroupsAsync(query, limit);
        var filtered = await ExcludeUserGroups(userId, groups);

        return filtered.Select(MapToGroupSearchResponse).ToList();
    }

    /// <inheritdoc />
    public async Task<List<GroupSearchResponse>> GetPublicGroupsAsync(Guid userId, int limit)
    {
        ValidateUserId(userId);
        ValidateSearchLimit(limit);

        var groups = await _groupRepository.GetPublicGroupsAsync(limit);
        var filtered = await ExcludeUserGroups(userId, groups);

        return filtered.Select(MapToGroupSearchResponse).ToList();
    }

    /// <inheritdoc />
    public async Task<GroupResponse> JoinByCodeAsync(Guid userId, string code)
    {
        ValidateUserId(userId);
        ValidateJoinCode(code);

        // SECURITY DEFINER RPC bypasses RLS on group_join_codes (members-only
        // SELECT) and group_memberships (no direct INSERT), and enforces
        // already-member, max_members, and require_approval server-side.
        var (groupId, status) = await _groupRepository.JoinGroupByCodeAsync(code);

        var refreshedGroup = await GetRefreshedGroupAsync(groupId);
        return await MapToGroupResponseAsync(refreshedGroup, MemberRole.Member, status);
    }

    /// <inheritdoc />
    public async Task<GroupMemberResponse> UpdateMemberRoleAsync(
        Guid userId,
        Guid groupId,
        Guid targetUserId,
        MemberRole newRole)
    {
        ValidateUserId(userId);
        ValidateGroupId(groupId);
        ValidateTargetUserId(targetUserId);

        _ = await GetGroupOrThrowAsync(groupId);
        var userMembership = await GetActiveMembershipOrThrowAsync(groupId, userId);
        var targetMembership = await GetTargetMembershipOrThrowAsync(groupId, targetUserId);

        ValidateRoleChangePermissions(userMembership, targetMembership, newRole);

        var updatedMembership = await _groupRepository.UpdateMemberRoleAsync(groupId, targetUserId, newRole);
        var targetUser = await _userRepository.GetByIdAsync(targetUserId);

        return MapToMemberResponse(updatedMembership, targetUser);
    }

    /// <inheritdoc />
    public async Task<List<GroupMemberResponse>> GetMembersAsync(Guid userId, Guid groupId, string? status)
    {
        ValidateUserId(userId);
        ValidateGroupId(groupId);

        _ = await GetGroupOrThrowAsync(groupId);
        var membership = await GetActiveMembershipOrThrowAsync(groupId, userId);

        // Only admins/owners can see pending members
        MembershipStatus? statusFilter = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            statusFilter = ParseStatusFilter(status);
            if (statusFilter == MembershipStatus.Pending &&
                membership.Role != MemberRole.Owner && membership.Role != MemberRole.Admin)
            {
                throw new UnauthorizedAccessException("Only owners and admins can view pending members.");
            }
        }

        var memberships = await _groupRepository.GetMembersAsync(groupId, statusFilter);

        if (memberships.Count == 0)
        {
            return new List<GroupMemberResponse>();
        }

        var userIds = memberships.Select(m => m.UserId).ToList();
        var users = await _userRepository.GetByIdsAsync(userIds);
        var userDict = (users ?? new List<User>()).ToDictionary(u => u.Id);

        var responses = new List<GroupMemberResponse>();
        foreach (var m in memberships)
        {
            userDict.TryGetValue(m.UserId, out var user);
            responses.Add(MapToMemberResponse(m, user));
        }

        return responses;
    }

    /// <inheritdoc />
    public async Task<GroupMemberResponse> ApproveMemberAsync(Guid userId, Guid groupId, Guid targetUserId)
    {
        ValidateUserId(userId);
        ValidateGroupId(groupId);
        ValidateTargetUserId(targetUserId);

        await GetGroupOrThrowAsync(groupId);
        var userMembership = await GetActiveMembershipOrThrowAsync(groupId, userId);

        EnsureCanApproveMember(userMembership);

        var targetMembership = await GetTargetMembershipOrThrowAsync(groupId, targetUserId);

        if (targetMembership.Status != MembershipStatus.Pending)
        {
            throw new InvalidOperationException("Target membership is not pending approval.");
        }

        var approved = await _groupRepository.ApproveMembershipAsync(groupId, targetUserId);
        var targetUser = await _userRepository.GetByIdAsync(targetUserId);
        return MapToMemberResponse(approved, targetUser);
    }

    private static MembershipStatus ParseStatusFilter(string status)
    {
        return status.Trim().ToLowerInvariant() switch
        {
            "active" => MembershipStatus.Active,
            "pending" => MembershipStatus.Pending,
            _ => throw new ArgumentException($"Unknown status filter: {status}", nameof(status))
        };
    }

    private async Task<GroupMembership> GetActiveMembershipOrThrowAsync(Guid groupId, Guid userId)
    {
        var membership = await _groupRepository.GetMembershipAsync(groupId, userId);
        if (membership == null || membership.Status != MembershipStatus.Active)
        {
            throw new UnauthorizedAccessException("You are not an active member of this group.");
        }
        return membership;
    }

    private static void EnsureAdminRole(GroupMembership membership, string action)
    {
        if (membership.Role != MemberRole.Owner && membership.Role != MemberRole.Admin)
        {
            throw new UnauthorizedAccessException($"Only group owners and admins can {action}.");
        }
    }

    // Validation helper methods
    private static void ValidateUserId(Guid userId)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
    }

    private static void ValidateGroupId(Guid groupId)
    {
        if (groupId == Guid.Empty)
            throw new ArgumentException("Group ID cannot be empty.", nameof(groupId));
    }

    private static void ValidateTargetUserId(Guid targetUserId)
    {
        if (targetUserId == Guid.Empty)
            throw new ArgumentException("Target user ID cannot be empty.", nameof(targetUserId));
    }

    private static void ValidateMaxMembers(int maxMembers)
    {
        if (maxMembers < 1 || maxMembers > 50)
            throw new ArgumentException("Maximum members must be between 1 and 50.", nameof(maxMembers));
    }

    private static void ValidateSearchQuery(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            throw new ArgumentException("Search query cannot be empty.", nameof(query));
    }

    private static void ValidateSearchLimit(int limit)
    {
        if (limit <= 0 || limit > 100)
            throw new ArgumentException("Limit must be between 1 and 100.", nameof(limit));
    }

    private static void ValidateJoinCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Join code cannot be empty.", nameof(code));
    }

    private async Task<Group> GetRefreshedGroupAsync(Guid groupId)
    {
        var group = await _groupRepository.GetByIdAsync(groupId);
        if (group == null)
            throw new InvalidOperationException("Failed to retrieve group after joining.");
        return group;
    }

    private async Task<Group> GetGroupOrThrowAsync(Guid groupId)
    {
        var group = await _groupRepository.GetByIdAsync(groupId);
        if (group == null)
            throw new KeyNotFoundException($"Group not found: {groupId}");
        return group;
    }

    private async Task<GroupMembership> GetTargetMembershipOrThrowAsync(Guid groupId, Guid targetUserId)
    {
        var membership = await _groupRepository.GetMembershipAsync(groupId, targetUserId);
        if (membership == null)
            throw new KeyNotFoundException($"Member not found: {targetUserId}");
        return membership;
    }

    private static void ValidateRoleChangePermissions(
        GroupMembership userMembership,
        GroupMembership targetMembership,
        MemberRole newRole)
    {
        // Cannot change owner's role
        if (targetMembership.Role == MemberRole.Owner)
            throw new UnauthorizedAccessException("Cannot change the owner's role.");

        // Only owner can promote to admin
        if (newRole == MemberRole.Admin && userMembership.Role != MemberRole.Owner)
            throw new UnauthorizedAccessException("Only the owner can promote members to admin.");

        // Only owner/admin can change roles
        if (userMembership.Role != MemberRole.Owner && userMembership.Role != MemberRole.Admin)
            throw new UnauthorizedAccessException("Only owners and admins can change member roles.");

        // Admins cannot demote other admins
        if (userMembership.Role == MemberRole.Admin &&
            targetMembership.Role == MemberRole.Admin &&
            newRole != MemberRole.Admin)
            throw new UnauthorizedAccessException("Admins cannot demote other admins.");
    }

    private static void EnsureCanApproveMember(GroupMembership userMembership)
    {
        if (userMembership.Role != MemberRole.Owner && userMembership.Role != MemberRole.Admin)
            throw new UnauthorizedAccessException("Only owners and admins can approve members.");
    }

    private async Task<List<Group>> ExcludeUserGroups(Guid userId, List<Group> groups)
    {
        var userGroupIds = (await _groupRepository.GetUserGroupsAsync(userId))
            .Select(g => g.Group.Id)
            .ToHashSet();

        return groups.Where(g => !userGroupIds.Contains(g.Id)).ToList();
    }

    private static GroupSearchResponse MapToGroupSearchResponse(Group group)
    {
        return new GroupSearchResponse
        {
            Id = group.Id,
            Name = group.Name,
            Description = group.Description,
            MemberCount = group.MemberCount,
            IsPublic = group.IsPublic,
            MaxMembers = group.MaxMembers
        };
    }

    private static GroupMemberResponse MapToMemberResponse(GroupMembership membership, User? user)
    {
        return new GroupMemberResponse
        {
            UserId = membership.UserId,
            DisplayName = user?.DisplayName ?? "Unknown",
            AvatarUrl = user?.AvatarUrl,
            Role = membership.Role,
            Status = membership.Status,
            JoinedAt = membership.JoinedAt
        };
    }
}
