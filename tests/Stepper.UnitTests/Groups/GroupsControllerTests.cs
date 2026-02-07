using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Stepper.Api.Common.Models;
using Stepper.Api.Groups;
using Stepper.Api.Groups.DTOs;

namespace Stepper.UnitTests.Groups;

public class GroupsControllerTests
{
    private readonly Mock<IGroupService> _mockGroupService;
    private readonly GroupsController _sut;

    public GroupsControllerTests()
    {
        _mockGroupService = new Mock<IGroupService>();
        _sut = new GroupsController(_mockGroupService.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullGroupService_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new GroupsController(null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region CreateGroup Tests

    [Fact]
    public async Task CreateGroup_WithValidRequest_ReturnsOkWithGroup()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new CreateGroupRequest
        {
            Name = "Test Group",
            Description = "Test Description",
            IsPublic = true,
            PeriodType = CompetitionPeriodType.Weekly
        };
        var response = CreateTestGroupResponse(Guid.NewGuid(), "Test Group", MemberRole.Owner, true, null, 1);
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.CreateGroupAsync(userId, request))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.CreateGroup(request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.Name.Should().Be("Test Group");
        apiResponse.Data.Role.Should().Be(MemberRole.Owner);
        _mockGroupService.Verify(x => x.CreateGroupAsync(userId, request), Times.Once);
    }

    [Fact]
    public async Task CreateGroup_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var request = new CreateGroupRequest { Name = "Test Group", PeriodType = CompetitionPeriodType.Weekly };
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.CreateGroup(request);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockGroupService.Verify(x => x.CreateGroupAsync(It.IsAny<Guid>(), It.IsAny<CreateGroupRequest>()), Times.Never);
    }

    #endregion

    #region GetUserGroups Tests

    [Fact]
    public async Task GetUserGroups_WithAuthenticatedUser_ReturnsOkWithGroups()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var response = new GroupListResponse
        {
            Groups = new List<GroupResponse>
            {
                CreateTestGroupResponse(Guid.NewGuid(), "Group 1", MemberRole.Owner, true, null, 5),
                CreateTestGroupResponse(Guid.NewGuid(), "Group 2", MemberRole.Member, false, null, 3)
            }
        };
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.GetUserGroupsAsync(userId))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.GetUserGroups();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<GroupListResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.Groups.Should().HaveCount(2);
        _mockGroupService.Verify(x => x.GetUserGroupsAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetUserGroups_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetUserGroups();

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<GroupListResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockGroupService.Verify(x => x.GetUserGroupsAsync(It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region GetGroup Tests

    [Fact]
    public async Task GetGroup_WithValidGroupIdAsMember_ReturnsOkWithGroup()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var response = CreateTestGroupResponse(groupId, "Test Group", MemberRole.Member, true, null, 5);
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.GetGroupAsync(userId, groupId))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.GetGroup(groupId);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.Id.Should().Be(groupId);
        _mockGroupService.Verify(x => x.GetGroupAsync(userId, groupId), Times.Once);
    }

    #endregion

    #region UpdateGroup Tests

    [Fact]
    public async Task UpdateGroup_AsOwner_ReturnsOkWithUpdatedGroup()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new UpdateGroupRequest { Name = "Updated Name", IsPublic = false };
        var response = CreateTestGroupResponse(groupId, "Updated Name", MemberRole.Owner, false, "ABC12345", 5);
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.UpdateGroupAsync(userId, groupId, request))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.UpdateGroup(groupId, request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.Name.Should().Be("Updated Name");
        _mockGroupService.Verify(x => x.UpdateGroupAsync(userId, groupId, request), Times.Once);
    }

    #endregion

    #region DeleteGroup Tests

    [Fact]
    public async Task DeleteGroup_AsOwner_ReturnsOkWithSuccessMessage()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.DeleteGroupAsync(userId, groupId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.DeleteGroup(groupId);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        apiResponse.Success.Should().BeTrue();
        _mockGroupService.Verify(x => x.DeleteGroupAsync(userId, groupId), Times.Once);
    }

    #endregion

    #region JoinGroup Tests

    [Fact]
    public async Task JoinGroup_PublicGroup_ReturnsOkWithGroup()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new JoinGroupRequest { JoinCode = null };
        var response = CreateTestGroupResponse(groupId, "Test Group", MemberRole.Member, true, null, 6);
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.JoinGroupAsync(userId, groupId, request))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.JoinGroup(groupId, request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.Role.Should().Be(MemberRole.Member);
        _mockGroupService.Verify(x => x.JoinGroupAsync(userId, groupId, request), Times.Once);
    }

    [Fact]
    public async Task JoinGroup_PrivateGroupWithValidCode_ReturnsOkWithGroup()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new JoinGroupRequest { JoinCode = "ABC12345" };
        var response = CreateTestGroupResponse(groupId, "Test Group", MemberRole.Member, false, null, 6);
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.JoinGroupAsync(userId, groupId, request))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.JoinGroup(groupId, request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        _mockGroupService.Verify(x => x.JoinGroupAsync(userId, groupId, request), Times.Once);
    }

    #endregion

    #region LeaveGroup Tests

    [Fact]
    public async Task LeaveGroup_AsMember_ReturnsOkWithSuccessMessage()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.LeaveGroupAsync(userId, groupId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.LeaveGroup(groupId);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        apiResponse.Success.Should().BeTrue();
        _mockGroupService.Verify(x => x.LeaveGroupAsync(userId, groupId), Times.Once);
    }

    #endregion

    #region GetMembers Tests

    [Fact]
    public async Task GetMembers_AsMember_ReturnsOkWithMembers()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var members = new List<GroupMemberResponse>
        {
            new() { UserId = Guid.NewGuid(), DisplayName = "User 1", Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow },
            new() { UserId = userId, DisplayName = "User 2", Role = MemberRole.Member, JoinedAt = DateTime.UtcNow }
        };
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.GetMembersAsync(userId, groupId, It.IsAny<string?>()))
            .ReturnsAsync(members);

        // Act
        var result = await _sut.GetMembers(groupId);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<List<GroupMemberResponse>>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.Should().HaveCount(2);
        _mockGroupService.Verify(x => x.GetMembersAsync(userId, groupId, It.IsAny<string?>()), Times.Once);
    }

    #endregion

    #region InviteMember Tests

    [Fact]
    public async Task InviteMember_AsOwner_ReturnsOkWithMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var inviteUserId = Guid.NewGuid();
        var request = new InviteMemberRequest { UserId = inviteUserId };
        var response = new GroupMemberResponse
        {
            UserId = inviteUserId,
            DisplayName = "Invited User",
            Role = MemberRole.Member,
            JoinedAt = DateTime.UtcNow
        };
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.InviteMemberAsync(userId, groupId, request))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.InviteMember(groupId, request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<GroupMemberResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.UserId.Should().Be(inviteUserId);
        _mockGroupService.Verify(x => x.InviteMemberAsync(userId, groupId, request), Times.Once);
    }

    #endregion

    #region RemoveMember Tests

    [Fact]
    public async Task RemoveMember_AsOwner_ReturnsOkWithSuccessMessage()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.RemoveMemberAsync(userId, groupId, targetUserId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.RemoveMember(groupId, targetUserId);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        apiResponse.Success.Should().BeTrue();
        _mockGroupService.Verify(x => x.RemoveMemberAsync(userId, groupId, targetUserId), Times.Once);
    }

    #endregion

    #region GetLeaderboard Tests

    [Fact]
    public async Task GetLeaderboard_AsMember_ReturnsOkWithLeaderboard()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var response = new LeaderboardResponse
        {
            GroupId = groupId,
            PeriodStart = DateTime.UtcNow.Date,
            PeriodEnd = DateTime.UtcNow.Date.AddDays(6),
            Entries = new List<LeaderboardEntry>
            {
                new() { Rank = 1, UserId = Guid.NewGuid(), DisplayName = "User 1", TotalSteps = 50000, TotalDistanceMeters = 35000 },
                new() { Rank = 2, UserId = userId, DisplayName = "User 2", TotalSteps = 40000, TotalDistanceMeters = 28000 }
            }
        };
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.GetLeaderboardAsync(userId, groupId))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.GetLeaderboard(groupId);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<LeaderboardResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.Entries.Should().HaveCount(2);
        _mockGroupService.Verify(x => x.GetLeaderboardAsync(userId, groupId), Times.Once);
    }

    #endregion

    #region RegenerateJoinCode Tests

    [Fact]
    public async Task RegenerateJoinCode_AsOwnerOfPrivateGroup_ReturnsOkWithNewCode()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var response = CreateTestGroupResponse(groupId, "Test Group", MemberRole.Owner, false, "NEWCODE2", 5);
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.RegenerateJoinCodeAsync(userId, groupId))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.RegenerateJoinCode(groupId);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.JoinCode.Should().NotBeNullOrEmpty();
        _mockGroupService.Verify(x => x.RegenerateJoinCodeAsync(userId, groupId), Times.Once);
    }

    #endregion

    #region Helper Methods

    private void SetupAuthenticatedUser(Guid userId)
    {
        var claims = new List<Claim>
        {
            new Claim("sub", userId.ToString())
        };
        var identity = new ClaimsIdentity(claims, "TestAuthType");
        var claimsPrincipal = new ClaimsPrincipal(identity);

        var httpContext = new DefaultHttpContext
        {
            User = claimsPrincipal
        };

        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    private void SetupUnauthenticatedUser()
    {
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal()
        };

        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    private static GroupResponse CreateTestGroupResponse(Guid id, string name, MemberRole role, bool isPublic, string? joinCode, int memberCount)
    {
        return new GroupResponse
        {
            Id = id,
            Name = name,
            Description = "Test Description",
            IsPublic = isPublic,
            JoinCode = joinCode,
            PeriodType = CompetitionPeriodType.Weekly,
            MemberCount = memberCount,
            Role = role,
            CreatedAt = DateTime.UtcNow.AddDays(-7)
        };
    }

    #endregion
}
