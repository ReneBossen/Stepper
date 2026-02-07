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

        // Create the group
        var group = new Group
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            CreatedById = userId,
            IsPublic = request.IsPublic,
            JoinCode = request.IsPublic ? null : GenerateJoinCode(),
            PeriodType = request.PeriodType,
            CreatedAt = DateTime.UtcNow,
            MemberCount = 0,
            MaxMembers = request.MaxMembers
        };

        var createdGroup = await _groupRepository.CreateAsync(group);

        // Store join code in separate table for private groups
        if (!request.IsPublic && !string.IsNullOrEmpty(group.JoinCode))
        {
            await _groupRepository.CreateJoinCodeAsync(createdGroup.Id, group.JoinCode);
        }

        // Add the creator as owner
        var membership = new GroupMembership
        {
            Id = Guid.NewGuid(),
            GroupId = createdGroup.Id,
            UserId = userId,
            Role = MemberRole.Owner,
            JoinedAt = DateTime.UtcNow
        };

        await _groupRepository.AddMemberAsync(membership);

        // Refresh the group to get updated member count
        var refreshedGroup = await _groupRepository.GetByIdAsync(createdGroup.Id);
        if (refreshedGroup == null)
        {
            throw new InvalidOperationException("Failed to retrieve created group.");
        }

        return await MapToGroupResponseAsync(refreshedGroup, MemberRole.Owner);
    }

    /// <inheritdoc />
    public async Task<GroupResponse> GetGroupAsync(Guid userId, Guid groupId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (groupId == Guid.Empty)
        {
            throw new ArgumentException("Group ID cannot be empty.", nameof(groupId));
        }

        var group = await _groupRepository.GetByIdAsync(groupId);
        if (group == null)
        {
            throw new KeyNotFoundException($"Group not found: {groupId}");
        }

        var membership = await _groupRepository.GetMembershipAsync(groupId, userId);
        if (membership == null)
        {
            throw new UnauthorizedAccessException("You are not a member of this group.");
        }

        return await MapToGroupResponseAsync(group, membership.Role);
    }

    /// <inheritdoc />
    public async Task<GroupListResponse> GetUserGroupsAsync(Guid userId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        var groupsWithRoles = await _groupRepository.GetUserGroupsAsync(userId);

        var groupResponses = new List<GroupResponse>();
        foreach (var (group, role) in groupsWithRoles)
        {
            groupResponses.Add(await MapToGroupResponseAsync(group, role));
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

        var group = await _groupRepository.GetByIdAsync(groupId);
        if (group == null)
        {
            throw new KeyNotFoundException($"Group not found: {groupId}");
        }

        var membership = await _groupRepository.GetMembershipAsync(groupId, userId);
        if (membership == null || (membership.Role != MemberRole.Owner && membership.Role != MemberRole.Admin))
        {
            throw new UnauthorizedAccessException("Only group owners and admins can update the group.");
        }

        if (request.MaxMembers.HasValue)
        {
            ValidateMaxMembers(request.MaxMembers.Value);
            group.MaxMembers = request.MaxMembers.Value;
        }

        // Track visibility change for join code management
        var wasPrivate = !group.IsPublic;
        var willBePublic = request.IsPublic;

        // Update the group
        group.Name = request.Name.Trim();
        group.Description = request.Description?.Trim();
        group.IsPublic = request.IsPublic;

        // If changing from public to private, generate join code
        if (!request.IsPublic && !wasPrivate)
        {
            group.JoinCode = GenerateJoinCode();
        }
        // If changing from private to public, clear join code
        else if (willBePublic && wasPrivate)
        {
            group.JoinCode = null;
        }

        var updatedGroup = await _groupRepository.UpdateAsync(group);

        // Manage join code in separate table based on visibility change
        if (!request.IsPublic && !wasPrivate && !string.IsNullOrEmpty(group.JoinCode))
        {
            await _groupRepository.CreateJoinCodeAsync(updatedGroup.Id, group.JoinCode);
        }
        else if (willBePublic && wasPrivate)
        {
            await _groupRepository.DeleteJoinCodeAsync(updatedGroup.Id);
        }

        return await MapToGroupResponseAsync(updatedGroup, membership.Role);
    }

    /// <inheritdoc />
    public async Task DeleteGroupAsync(Guid userId, Guid groupId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (groupId == Guid.Empty)
        {
            throw new ArgumentException("Group ID cannot be empty.", nameof(groupId));
        }

        var group = await _groupRepository.GetByIdAsync(groupId);
        if (group == null)
        {
            throw new KeyNotFoundException($"Group not found: {groupId}");
        }

        var membership = await _groupRepository.GetMembershipAsync(groupId, userId);
        if (membership == null || membership.Role != MemberRole.Owner)
        {
            throw new UnauthorizedAccessException("Only the group owner can delete the group.");
        }

        await _groupRepository.DeleteAsync(groupId);
    }

    /// <inheritdoc />
    public async Task<GroupResponse> JoinGroupAsync(Guid userId, Guid groupId, JoinGroupRequest request)
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

        var group = await _groupRepository.GetByIdAsync(groupId);
        if (group == null)
        {
            throw new KeyNotFoundException($"Group not found: {groupId}");
        }

        // Check if already a member
        var existingMembership = await _groupRepository.GetMembershipAsync(groupId, userId);
        if (existingMembership != null)
        {
            throw new InvalidOperationException("You are already a member of this group.");
        }

        // For private groups, validate join code
        if (!group.IsPublic)
        {
            if (string.IsNullOrWhiteSpace(request.JoinCode))
            {
                throw new ArgumentException("Join code is required for private groups.");
            }

            var storedJoinCode = await _groupRepository.GetJoinCodeAsync(groupId);
            if (request.JoinCode != storedJoinCode)
            {
                throw new UnauthorizedAccessException("Invalid join code.");
            }
        }

        // Enforce max members limit
        await EnsureGroupNotFullAsync(group);

        // Add the user as a member
        var membership = new GroupMembership
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            UserId = userId,
            Role = MemberRole.Member,
            JoinedAt = DateTime.UtcNow
        };

        await _groupRepository.AddMemberAsync(membership);

        // Refresh the group to get updated member count
        var refreshedGroup = await _groupRepository.GetByIdAsync(groupId);
        if (refreshedGroup == null)
        {
            throw new InvalidOperationException("Failed to retrieve group after joining.");
        }

        return await MapToGroupResponseAsync(refreshedGroup, MemberRole.Member);
    }

    /// <inheritdoc />
    public async Task LeaveGroupAsync(Guid userId, Guid groupId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (groupId == Guid.Empty)
        {
            throw new ArgumentException("Group ID cannot be empty.", nameof(groupId));
        }

        var group = await _groupRepository.GetByIdAsync(groupId);
        if (group == null)
        {
            throw new KeyNotFoundException($"Group not found: {groupId}");
        }

        var membership = await _groupRepository.GetMembershipAsync(groupId, userId);
        if (membership == null)
        {
            throw new InvalidOperationException("You are not a member of this group.");
        }

        // Owners cannot leave without transferring ownership
        if (membership.Role == MemberRole.Owner)
        {
            var members = await _groupRepository.GetMembersAsync(groupId);
            if (members.Count > 1)
            {
                throw new InvalidOperationException("Group owner cannot leave. Transfer ownership to another member first or delete the group.");
            }
        }

        await _groupRepository.RemoveMemberAsync(groupId, userId);
    }

    /// <inheritdoc />
    public async Task<GroupMemberResponse> InviteMemberAsync(Guid userId, Guid groupId, InviteMemberRequest request)
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

        if (request.UserId == Guid.Empty)
        {
            throw new ArgumentException("User ID to invite cannot be empty.");
        }

        var group = await _groupRepository.GetByIdAsync(groupId);
        if (group == null)
        {
            throw new KeyNotFoundException($"Group not found: {groupId}");
        }

        var membership = await _groupRepository.GetMembershipAsync(groupId, userId);
        if (membership == null || (membership.Role != MemberRole.Owner && membership.Role != MemberRole.Admin))
        {
            throw new UnauthorizedAccessException("Only group owners and admins can invite members.");
        }

        // Check if user exists
        var userToInvite = await _userRepository.GetByIdAsync(request.UserId);
        if (userToInvite == null)
        {
            throw new KeyNotFoundException($"User not found: {request.UserId}");
        }

        // Check if already a member
        var existingMembership = await _groupRepository.GetMembershipAsync(groupId, request.UserId);
        if (existingMembership != null)
        {
            throw new InvalidOperationException("User is already a member of this group.");
        }

        // Add the user as a member
        var newMembership = new GroupMembership
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            UserId = request.UserId,
            Role = MemberRole.Member,
            JoinedAt = DateTime.UtcNow
        };

        var createdMembership = await _groupRepository.AddMemberAsync(newMembership);

        return new GroupMemberResponse
        {
            UserId = userToInvite.Id,
            DisplayName = userToInvite.DisplayName,
            AvatarUrl = userToInvite.AvatarUrl,
            Role = createdMembership.Role,
            JoinedAt = createdMembership.JoinedAt
        };
    }

    /// <inheritdoc />
    public async Task RemoveMemberAsync(Guid userId, Guid groupId, Guid targetUserId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (groupId == Guid.Empty)
        {
            throw new ArgumentException("Group ID cannot be empty.", nameof(groupId));
        }

        if (targetUserId == Guid.Empty)
        {
            throw new ArgumentException("Target user ID cannot be empty.", nameof(targetUserId));
        }

        var group = await _groupRepository.GetByIdAsync(groupId);
        if (group == null)
        {
            throw new KeyNotFoundException($"Group not found: {groupId}");
        }

        var membership = await _groupRepository.GetMembershipAsync(groupId, userId);
        if (membership == null || (membership.Role != MemberRole.Owner && membership.Role != MemberRole.Admin))
        {
            throw new UnauthorizedAccessException("Only group owners and admins can remove members.");
        }

        var targetMembership = await _groupRepository.GetMembershipAsync(groupId, targetUserId);
        if (targetMembership == null)
        {
            throw new InvalidOperationException("User is not a member of this group.");
        }

        // Cannot remove the owner
        if (targetMembership.Role == MemberRole.Owner)
        {
            throw new UnauthorizedAccessException("Cannot remove the group owner.");
        }

        // Admins cannot remove other admins
        if (membership.Role == MemberRole.Admin && targetMembership.Role == MemberRole.Admin)
        {
            throw new UnauthorizedAccessException("Admins cannot remove other admins.");
        }

        await _groupRepository.RemoveMemberAsync(groupId, targetUserId);
    }

    /// <inheritdoc />
    public async Task<List<GroupMemberResponse>> GetMembersAsync(Guid userId, Guid groupId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (groupId == Guid.Empty)
        {
            throw new ArgumentException("Group ID cannot be empty.", nameof(groupId));
        }

        var group = await _groupRepository.GetByIdAsync(groupId);
        if (group == null)
        {
            throw new KeyNotFoundException($"Group not found: {groupId}");
        }

        var membership = await _groupRepository.GetMembershipAsync(groupId, userId);
        if (membership == null)
        {
            throw new UnauthorizedAccessException("You are not a member of this group.");
        }

        var memberships = await _groupRepository.GetMembersAsync(groupId);

        if (memberships.Count == 0)
        {
            return new List<GroupMemberResponse>();
        }

        // Batch fetch all users to avoid N+1 query
        var userIds = memberships.Select(m => m.UserId).ToList();
        var users = await _userRepository.GetByIdsAsync(userIds);

        // Create a lookup dictionary for fast access
        var userDict = (users ?? new List<User>()).ToDictionary(u => u.Id);

        // Map memberships to responses
        var responses = new List<GroupMemberResponse>();
        foreach (var m in memberships)
        {
            if (userDict.TryGetValue(m.UserId, out var user))
            {
                responses.Add(new GroupMemberResponse
                {
                    UserId = user.Id,
                    DisplayName = user.DisplayName,
                    AvatarUrl = user.AvatarUrl,
                    Role = m.Role,
                    JoinedAt = m.JoinedAt
                });
            }
        }

        return responses;
    }

    /// <inheritdoc />
    public async Task<LeaderboardResponse> GetLeaderboardAsync(Guid userId, Guid groupId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (groupId == Guid.Empty)
        {
            throw new ArgumentException("Group ID cannot be empty.", nameof(groupId));
        }

        var group = await _groupRepository.GetByIdAsync(groupId);
        if (group == null)
        {
            throw new KeyNotFoundException($"Group not found: {groupId}");
        }

        var membership = await _groupRepository.GetMembershipAsync(groupId, userId);
        if (membership == null)
        {
            throw new UnauthorizedAccessException("You are not a member of this group.");
        }

        // Calculate the competition period based on group settings
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
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (groupId == Guid.Empty)
        {
            throw new ArgumentException("Group ID cannot be empty.", nameof(groupId));
        }

        var group = await _groupRepository.GetByIdAsync(groupId);
        if (group == null)
        {
            throw new KeyNotFoundException($"Group not found: {groupId}");
        }

        var membership = await _groupRepository.GetMembershipAsync(groupId, userId);
        if (membership == null || (membership.Role != MemberRole.Owner && membership.Role != MemberRole.Admin))
        {
            throw new UnauthorizedAccessException("Only group owners and admins can regenerate the join code.");
        }

        if (group.IsPublic)
        {
            throw new InvalidOperationException("Public groups do not have join codes.");
        }

        var newJoinCode = GenerateJoinCode();
        await _groupRepository.UpdateJoinCodeAsync(groupId, newJoinCode);

        // Set join code on domain model for response mapping
        group.JoinCode = newJoinCode;

        return await MapToGroupResponseAsync(group, membership.Role);
    }

    private async Task<GroupResponse> MapToGroupResponseAsync(Group group, MemberRole role)
    {
        // Fetch join code from separate table if not already on domain model
        var joinCode = group.JoinCode ?? await _groupRepository.GetJoinCodeAsync(group.Id);

        return new GroupResponse
        {
            Id = group.Id,
            Name = group.Name,
            Description = group.Description,
            IsPublic = group.IsPublic,
            PeriodType = group.PeriodType,
            MemberCount = group.MemberCount,
            MaxMembers = group.MaxMembers,
            // Security: Only owners and admins can see join codes to prevent unauthorized sharing
            JoinCode = (role == MemberRole.Owner || role == MemberRole.Admin) ? joinCode : null,
            Role = role,
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

        var group = await _groupRepository.GetByJoinCodeAsync(code);
        EnsureGroupFoundByCode(group);

        await EnsureNotAlreadyMemberAsync(group!.Id, userId);
        await EnsureGroupNotFullAsync(group);

        var membership = CreateMembershipForJoin(group!.Id, userId);
        await _groupRepository.AddMemberAsync(membership);

        var refreshedGroup = await GetRefreshedGroupAsync(group!.Id);
        return await MapToGroupResponseAsync(refreshedGroup, MemberRole.Member);
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

        var group = await GetGroupOrThrowAsync(groupId);
        var userMembership = await GetMembershipOrThrowAsync(groupId, userId);
        var targetMembership = await GetTargetMembershipOrThrowAsync(groupId, targetUserId);

        ValidateRoleChangePermissions(userMembership, targetMembership, newRole);

        var updatedMembership = await _groupRepository.UpdateMemberRoleAsync(groupId, targetUserId, newRole);
        var targetUser = await _userRepository.GetByIdAsync(targetUserId);

        return MapToMemberResponse(updatedMembership, targetUser);
    }

    /// <inheritdoc />
    public async Task<List<GroupMemberResponse>> GetMembersAsync(Guid userId, Guid groupId, string? status)
    {
        // Delegate to existing method for now (status filtering not yet implemented in DB)
        // Status filtering would require membership status field in database
        return await GetMembersAsync(userId, groupId);
    }

    /// <inheritdoc />
    public async Task<GroupMemberResponse> ApproveMemberAsync(Guid userId, Guid groupId, Guid targetUserId)
    {
        ValidateUserId(userId);
        ValidateGroupId(groupId);
        ValidateTargetUserId(targetUserId);

        var group = await GetGroupOrThrowAsync(groupId);
        var userMembership = await GetMembershipOrThrowAsync(groupId, userId);

        EnsureCanApproveMember(userMembership);

        var targetMembership = await GetTargetMembershipOrThrowAsync(groupId, targetUserId);

        // For now, approval just confirms membership exists (pending status not yet in DB)
        var targetUser = await _userRepository.GetByIdAsync(targetUserId);
        return MapToMemberResponse(targetMembership, targetUser);
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

    private async Task EnsureGroupNotFullAsync(Group group)
    {
        var memberCount = await _groupRepository.GetMemberCountAsync(group.Id);
        if (memberCount >= group.MaxMembers)
            throw new InvalidOperationException($"This group is full. Maximum members: {group.MaxMembers}");
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

    private static void EnsureGroupFoundByCode(Group? group)
    {
        if (group == null)
            throw new KeyNotFoundException("Invalid join code. Group not found.");
    }

    private async Task EnsureNotAlreadyMemberAsync(Guid groupId, Guid userId)
    {
        var existingMembership = await _groupRepository.GetMembershipAsync(groupId, userId);
        if (existingMembership != null)
            throw new InvalidOperationException("You are already a member of this group.");
    }

    private static GroupMembership CreateMembershipForJoin(Guid groupId, Guid userId)
    {
        return new GroupMembership
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            UserId = userId,
            Role = MemberRole.Member,
            JoinedAt = DateTime.UtcNow
        };
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

    private async Task<GroupMembership> GetMembershipOrThrowAsync(Guid groupId, Guid userId)
    {
        var membership = await _groupRepository.GetMembershipAsync(groupId, userId);
        if (membership == null)
            throw new UnauthorizedAccessException("You are not a member of this group.");
        return membership;
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
            JoinedAt = membership.JoinedAt
        };
    }
}
