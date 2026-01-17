using System.Security.Cryptography;
using WalkingApp.Api.Groups.DTOs;
using WalkingApp.Api.Steps.DTOs;
using WalkingApp.Api.Users;

namespace WalkingApp.Api.Groups;

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
            MemberCount = 0
        };

        var createdGroup = await _groupRepository.CreateAsync(group);

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

        // Update the group
        group.Name = request.Name.Trim();
        group.Description = request.Description?.Trim();
        group.IsPublic = request.IsPublic;

        // If changing from public to private, generate join code
        if (!request.IsPublic && string.IsNullOrEmpty(group.JoinCode))
        {
            group.JoinCode = GenerateJoinCode();
        }
        // If changing from private to public, clear join code
        else if (request.IsPublic)
        {
            group.JoinCode = null;
        }

        var updatedGroup = await _groupRepository.UpdateAsync(group);

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

            if (request.JoinCode != group.JoinCode)
            {
                throw new UnauthorizedAccessException("Invalid join code.");
            }
        }

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

        var responses = new List<GroupMemberResponse>();
        foreach (var m in memberships)
        {
            var user = await _userRepository.GetByIdAsync(m.UserId);
            if (user != null)
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

        group.JoinCode = GenerateJoinCode();
        var updatedGroup = await _groupRepository.UpdateAsync(group);

        return await MapToGroupResponseAsync(updatedGroup, membership.Role);
    }

    private async Task<GroupResponse> MapToGroupResponseAsync(Group group, MemberRole role)
    {
        return new GroupResponse
        {
            Id = group.Id,
            Name = group.Name,
            Description = group.Description,
            IsPublic = group.IsPublic,
            PeriodType = group.PeriodType,
            MemberCount = group.MemberCount,
            JoinCode = (role == MemberRole.Owner || role == MemberRole.Admin) ? group.JoinCode : null,
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
}
