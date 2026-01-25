using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WalkingApp.Api.Common.Models;
using WalkingApp.Api.Groups;
using WalkingApp.Api.Groups.DTOs;

namespace WalkingApp.UnitTests.Groups;

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

    [Fact]
    public async Task CreateGroup_WithEmptyName_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new CreateGroupRequest { Name = "", PeriodType = CompetitionPeriodType.Weekly };
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.CreateGroupAsync(userId, request))
            .ThrowsAsync(new ArgumentException("Group name cannot be empty."));

        // Act
        var result = await _sut.CreateGroup(request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Group name cannot be empty.");
    }

    [Fact]
    public async Task CreateGroup_WithException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new CreateGroupRequest { Name = "Test Group", PeriodType = CompetitionPeriodType.Weekly };
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.CreateGroupAsync(userId, request))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act
        var result = await _sut.CreateGroup(request);

        // Assert
        result.Should().NotBeNull();
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        var response = statusCodeResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("An error occurred: Database error");
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

    [Fact]
    public async Task GetGroup_WithNonExistentGroup_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.GetGroupAsync(userId, groupId))
            .ThrowsAsync(new KeyNotFoundException($"Group not found: {groupId}"));

        // Act
        var result = await _sut.GetGroup(groupId);

        // Assert
        result.Should().NotBeNull();
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain($"Group not found: {groupId}");
    }

    [Fact]
    public async Task GetGroup_AsNonMember_ReturnsUnauthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.GetGroupAsync(userId, groupId))
            .ThrowsAsync(new UnauthorizedAccessException("You are not a member of this group."));

        // Act
        var result = await _sut.GetGroup(groupId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("You are not a member of this group.");
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

    [Fact]
    public async Task UpdateGroup_AsMember_ReturnsUnauthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new UpdateGroupRequest { Name = "Updated Name", IsPublic = true };
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.UpdateGroupAsync(userId, groupId, request))
            .ThrowsAsync(new UnauthorizedAccessException("Only group owners and admins can update the group."));

        // Act
        var result = await _sut.UpdateGroup(groupId, request);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Only group owners and admins can update the group.");
    }

    [Fact]
    public async Task UpdateGroup_WithEmptyName_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new UpdateGroupRequest { Name = "", IsPublic = true };
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.UpdateGroupAsync(userId, groupId, request))
            .ThrowsAsync(new ArgumentException("Group name cannot be empty."));

        // Act
        var result = await _sut.UpdateGroup(groupId, request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Group name cannot be empty.");
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

    [Fact]
    public async Task DeleteGroup_AsNonOwner_ReturnsUnauthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.DeleteGroupAsync(userId, groupId))
            .ThrowsAsync(new UnauthorizedAccessException("Only the group owner can delete the group."));

        // Act
        var result = await _sut.DeleteGroup(groupId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Only the group owner can delete the group.");
    }

    [Fact]
    public async Task DeleteGroup_WithNonExistentGroup_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.DeleteGroupAsync(userId, groupId))
            .ThrowsAsync(new KeyNotFoundException($"Group not found: {groupId}"));

        // Act
        var result = await _sut.DeleteGroup(groupId);

        // Assert
        result.Should().NotBeNull();
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain($"Group not found: {groupId}");
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

    [Fact]
    public async Task JoinGroup_WithInvalidCode_ReturnsUnauthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new JoinGroupRequest { JoinCode = "WRONGCODE" };
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.JoinGroupAsync(userId, groupId, request))
            .ThrowsAsync(new UnauthorizedAccessException("Invalid join code."));

        // Act
        var result = await _sut.JoinGroup(groupId, request);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Invalid join code.");
    }

    [Fact]
    public async Task JoinGroup_AlreadyMember_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new JoinGroupRequest();
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.JoinGroupAsync(userId, groupId, request))
            .ThrowsAsync(new InvalidOperationException("You are already a member of this group."));

        // Act
        var result = await _sut.JoinGroup(groupId, request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("You are already a member of this group.");
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

    [Fact]
    public async Task LeaveGroup_AsOwnerWithOtherMembers_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.LeaveGroupAsync(userId, groupId))
            .ThrowsAsync(new InvalidOperationException("Group owner cannot leave. Transfer ownership to another member first or delete the group."));

        // Act
        var result = await _sut.LeaveGroup(groupId);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Group owner cannot leave. Transfer ownership to another member first or delete the group.");
    }

    [Fact]
    public async Task LeaveGroup_NotMember_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.LeaveGroupAsync(userId, groupId))
            .ThrowsAsync(new KeyNotFoundException($"Group not found: {groupId}"));

        // Act
        var result = await _sut.LeaveGroup(groupId);

        // Assert
        result.Should().NotBeNull();
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
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

    [Fact]
    public async Task GetMembers_AsNonMember_ReturnsUnauthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.GetMembersAsync(userId, groupId, It.IsAny<string?>()))
            .ThrowsAsync(new UnauthorizedAccessException("You are not a member of this group."));

        // Act
        var result = await _sut.GetMembers(groupId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<List<GroupMemberResponse>>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("You are not a member of this group.");
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

    [Fact]
    public async Task InviteMember_AsMember_ReturnsUnauthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new InviteMemberRequest { UserId = Guid.NewGuid() };
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.InviteMemberAsync(userId, groupId, request))
            .ThrowsAsync(new UnauthorizedAccessException("Only group owners and admins can invite members."));

        // Act
        var result = await _sut.InviteMember(groupId, request);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<GroupMemberResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Only group owners and admins can invite members.");
    }

    [Fact]
    public async Task InviteMember_UserAlreadyMember_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new InviteMemberRequest { UserId = Guid.NewGuid() };
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.InviteMemberAsync(userId, groupId, request))
            .ThrowsAsync(new InvalidOperationException("User is already a member of this group."));

        // Act
        var result = await _sut.InviteMember(groupId, request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<GroupMemberResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is already a member of this group.");
    }

    [Fact]
    public async Task InviteMember_UserNotFound_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var inviteUserId = Guid.NewGuid();
        var request = new InviteMemberRequest { UserId = inviteUserId };
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.InviteMemberAsync(userId, groupId, request))
            .ThrowsAsync(new KeyNotFoundException($"User not found: {inviteUserId}"));

        // Act
        var result = await _sut.InviteMember(groupId, request);

        // Assert
        result.Should().NotBeNull();
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<ApiResponse<GroupMemberResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain($"User not found: {inviteUserId}");
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

    [Fact]
    public async Task RemoveMember_AsMember_ReturnsUnauthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.RemoveMemberAsync(userId, groupId, targetUserId))
            .ThrowsAsync(new UnauthorizedAccessException("Only group owners and admins can remove members."));

        // Act
        var result = await _sut.RemoveMember(groupId, targetUserId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Only group owners and admins can remove members.");
    }

    [Fact]
    public async Task RemoveMember_RemovingOwner_ReturnsUnauthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.RemoveMemberAsync(userId, groupId, targetUserId))
            .ThrowsAsync(new UnauthorizedAccessException("Cannot remove the group owner."));

        // Act
        var result = await _sut.RemoveMember(groupId, targetUserId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Cannot remove the group owner.");
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

    [Fact]
    public async Task GetLeaderboard_AsNonMember_ReturnsUnauthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.GetLeaderboardAsync(userId, groupId))
            .ThrowsAsync(new UnauthorizedAccessException("You are not a member of this group."));

        // Act
        var result = await _sut.GetLeaderboard(groupId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<LeaderboardResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("You are not a member of this group.");
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

    [Fact]
    public async Task RegenerateJoinCode_ForPublicGroup_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.RegenerateJoinCodeAsync(userId, groupId))
            .ThrowsAsync(new InvalidOperationException("Public groups do not have join codes."));

        // Act
        var result = await _sut.RegenerateJoinCode(groupId);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Public groups do not have join codes.");
    }

    [Fact]
    public async Task RegenerateJoinCode_AsMember_ReturnsUnauthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockGroupService.Setup(x => x.RegenerateJoinCodeAsync(userId, groupId))
            .ThrowsAsync(new UnauthorizedAccessException("Only group owners and admins can regenerate the join code."));

        // Act
        var result = await _sut.RegenerateJoinCode(groupId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<GroupResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Only group owners and admins can regenerate the join code.");
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
