using FluentAssertions;
using Moq;
using Stepper.Api.Common.Models;
using Stepper.Api.Groups;
using Stepper.Api.Groups.DTOs;
using Stepper.Api.Users;

namespace Stepper.UnitTests.Groups;

public class GroupServiceTests
{
    private readonly Mock<IGroupRepository> _mockGroupRepository;
    private readonly Mock<IUserRepository> _mockUserRepository;
    private readonly GroupService _sut;

    public GroupServiceTests()
    {
        _mockGroupRepository = new Mock<IGroupRepository>();
        _mockUserRepository = new Mock<IUserRepository>();
        _sut = new GroupService(_mockGroupRepository.Object, _mockUserRepository.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullGroupRepository_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new GroupService(null!, _mockUserRepository.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullUserRepository_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new GroupService(_mockGroupRepository.Object, null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region CreateGroupAsync Tests

    [Fact]
    public async Task CreateGroupAsync_WithValidRequest_CreatesGroupAndAddsOwner()
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

        var createdGroup = CreateTestGroup(Guid.NewGuid(), "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 0);
        var groupWithOwner = CreateTestGroup(createdGroup.Id, "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 1);

        _mockGroupRepository.Setup(x => x.CreateAsync(It.IsAny<Group>()))
            .ReturnsAsync(createdGroup);
        _mockGroupRepository.Setup(x => x.CreateJoinCodeAsync(createdGroup.Id, It.IsAny<string>()))
            .Returns(Task.CompletedTask);
        _mockGroupRepository.Setup(x => x.AddMemberAsync(It.IsAny<GroupMembership>()))
            .ReturnsAsync(new GroupMembership { Id = Guid.NewGuid(), GroupId = createdGroup.Id, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow });
        _mockGroupRepository.Setup(x => x.GetByIdAsync(createdGroup.Id))
            .ReturnsAsync(groupWithOwner);
        _mockGroupRepository.Setup(x => x.GetJoinCodeAsync(createdGroup.Id))
            .ReturnsAsync("ABC12345");

        // Act
        var result = await _sut.CreateGroupAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Test Group");
        result.IsPublic.Should().BeTrue();
        result.PeriodType.Should().Be(CompetitionPeriodType.Weekly);
        result.Role.Should().Be(MemberRole.Owner);
        result.MemberCount.Should().Be(1);
        _mockGroupRepository.Verify(x => x.CreateAsync(It.Is<Group>(g =>
            g.Name == "Test Group" &&
            g.Description == "Test Description" &&
            g.IsPublic == true &&
            g.CreatedById == userId &&
            !string.IsNullOrEmpty(g.JoinCode)
        )), Times.Once);
        _mockGroupRepository.Verify(x => x.AddMemberAsync(It.Is<GroupMembership>(m =>
            m.UserId == userId &&
            m.GroupId == createdGroup.Id &&
            m.Role == MemberRole.Owner
        )), Times.Once);
    }

    [Fact]
    public async Task CreateGroupAsync_WithPrivateGroup_GeneratesJoinCode()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new CreateGroupRequest
        {
            Name = "Private Group",
            IsPublic = false,
            PeriodType = CompetitionPeriodType.Weekly
        };

        var createdGroup = CreateTestGroup(Guid.NewGuid(), "Private Group", userId, false, null, CompetitionPeriodType.Weekly, 0);
        var groupWithOwner = CreateTestGroup(createdGroup.Id, "Private Group", userId, false, null, CompetitionPeriodType.Weekly, 1);

        _mockGroupRepository.Setup(x => x.CreateAsync(It.IsAny<Group>()))
            .ReturnsAsync(createdGroup);
        _mockGroupRepository.Setup(x => x.CreateJoinCodeAsync(createdGroup.Id, It.IsAny<string>()))
            .Returns(Task.CompletedTask);
        _mockGroupRepository.Setup(x => x.AddMemberAsync(It.IsAny<GroupMembership>()))
            .ReturnsAsync(new GroupMembership { Id = Guid.NewGuid(), GroupId = createdGroup.Id, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow });
        _mockGroupRepository.Setup(x => x.GetByIdAsync(createdGroup.Id))
            .ReturnsAsync(groupWithOwner);
        _mockGroupRepository.Setup(x => x.GetJoinCodeAsync(createdGroup.Id))
            .ReturnsAsync("ABC12345");

        // Act
        var result = await _sut.CreateGroupAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.IsPublic.Should().BeFalse();
        result.JoinCode.Should().NotBeNullOrEmpty();
        result.JoinCode.Should().HaveLength(8);
        _mockGroupRepository.Verify(x => x.CreateAsync(It.Is<Group>(g =>
            g.IsPublic == false &&
            !string.IsNullOrEmpty(g.JoinCode)
        )), Times.Once);
        _mockGroupRepository.Verify(x => x.CreateJoinCodeAsync(createdGroup.Id, It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task CreateGroupAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var request = new CreateGroupRequest { Name = "Test Group", PeriodType = CompetitionPeriodType.Weekly };

        // Act
        var act = async () => await _sut.CreateGroupAsync(Guid.Empty, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockGroupRepository.Verify(x => x.CreateAsync(It.IsAny<Group>()), Times.Never);
    }

    [Fact]
    public async Task CreateGroupAsync_WithNullRequest_ThrowsArgumentNullException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.CreateGroupAsync(userId, null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
        _mockGroupRepository.Verify(x => x.CreateAsync(It.IsAny<Group>()), Times.Never);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public async Task CreateGroupAsync_WithEmptyName_ThrowsArgumentException(string? name)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new CreateGroupRequest { Name = name!, PeriodType = CompetitionPeriodType.Weekly };

        // Act
        var act = async () => await _sut.CreateGroupAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Group name cannot be empty.");
        _mockGroupRepository.Verify(x => x.CreateAsync(It.IsAny<Group>()), Times.Never);
    }

    [Fact]
    public async Task CreateGroupAsync_WithNameTooShort_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new CreateGroupRequest { Name = "A", PeriodType = CompetitionPeriodType.Weekly };

        // Act
        var act = async () => await _sut.CreateGroupAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Group name must be between 2 and 50 characters.");
        _mockGroupRepository.Verify(x => x.CreateAsync(It.IsAny<Group>()), Times.Never);
    }

    [Fact]
    public async Task CreateGroupAsync_WithNameTooLong_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new CreateGroupRequest { Name = new string('A', 51), PeriodType = CompetitionPeriodType.Weekly };

        // Act
        var act = async () => await _sut.CreateGroupAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Group name must be between 2 and 50 characters.");
        _mockGroupRepository.Verify(x => x.CreateAsync(It.IsAny<Group>()), Times.Never);
    }

    [Fact]
    public async Task CreateGroupAsync_TrimsWhitespaceFromName_CreatesGroupWithTrimmedName()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new CreateGroupRequest { Name = "  Test Group  ", IsPublic = true, PeriodType = CompetitionPeriodType.Weekly };

        var createdGroup = CreateTestGroup(Guid.NewGuid(), "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 0);
        var groupWithOwner = CreateTestGroup(createdGroup.Id, "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 1);

        _mockGroupRepository.Setup(x => x.CreateAsync(It.IsAny<Group>()))
            .ReturnsAsync(createdGroup);
        _mockGroupRepository.Setup(x => x.AddMemberAsync(It.IsAny<GroupMembership>()))
            .ReturnsAsync(new GroupMembership { Id = Guid.NewGuid(), GroupId = createdGroup.Id, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow });
        _mockGroupRepository.Setup(x => x.GetByIdAsync(createdGroup.Id))
            .ReturnsAsync(groupWithOwner);

        // Act
        var result = await _sut.CreateGroupAsync(userId, request);

        // Assert
        result.Name.Should().Be("Test Group");
        _mockGroupRepository.Verify(x => x.CreateAsync(It.Is<Group>(g => g.Name == "Test Group")), Times.Once);
    }

    #endregion

    #region GetGroupAsync Tests

    [Fact]
    public async Task GetGroupAsync_WithValidMember_ReturnsGroup()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 1);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);

        // Act
        var result = await _sut.GetGroupAsync(userId, groupId);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(groupId);
        result.Name.Should().Be("Test Group");
        result.Role.Should().Be(MemberRole.Member);
        _mockGroupRepository.Verify(x => x.GetByIdAsync(groupId), Times.Once);
        _mockGroupRepository.Verify(x => x.GetMembershipAsync(groupId, userId), Times.Once);
    }

    [Fact]
    public async Task GetGroupAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var groupId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.GetGroupAsync(Guid.Empty, groupId);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockGroupRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetGroupAsync_WithEmptyGroupId_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.GetGroupAsync(userId, Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Group ID cannot be empty.*");
        _mockGroupRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetGroupAsync_WithNonExistentGroup_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync((Group?)null);

        // Act
        var act = async () => await _sut.GetGroupAsync(userId, groupId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"Group not found: {groupId}");
        _mockGroupRepository.Verify(x => x.GetByIdAsync(groupId), Times.Once);
    }

    [Fact]
    public async Task GetGroupAsync_WithNonMember_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", Guid.NewGuid(), true, null, CompetitionPeriodType.Weekly, 1);

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync((GroupMembership?)null);

        // Act
        var act = async () => await _sut.GetGroupAsync(userId, groupId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("You are not a member of this group.");
        _mockGroupRepository.Verify(x => x.GetMembershipAsync(groupId, userId), Times.Once);
    }

    [Fact]
    public async Task GetGroupAsync_AsOwnerOfPrivateGroup_ReturnsJoinCode()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", userId, false, null, CompetitionPeriodType.Weekly, 1);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.GetJoinCodeAsync(groupId))
            .ReturnsAsync("ABC12345");

        // Act
        var result = await _sut.GetGroupAsync(userId, groupId);

        // Assert
        result.JoinCode.Should().Be("ABC12345");
    }

    [Fact]
    public async Task GetGroupAsync_AsMemberOfPrivateGroup_HidesJoinCode()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", Guid.NewGuid(), false, null, CompetitionPeriodType.Weekly, 1);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.GetJoinCodeAsync(groupId))
            .ReturnsAsync("ABC12345");

        // Act
        var result = await _sut.GetGroupAsync(userId, groupId);

        // Assert
        result.JoinCode.Should().BeNull();
    }

    #endregion

    #region GetUserGroupsAsync Tests

    [Fact]
    public async Task GetUserGroupsAsync_WithValidUserId_ReturnsUserGroups()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var group1 = CreateTestGroup(Guid.NewGuid(), "Group 1", userId, true, null, CompetitionPeriodType.Weekly, 5);
        var group2 = CreateTestGroup(Guid.NewGuid(), "Group 2", Guid.NewGuid(), false, null, CompetitionPeriodType.Monthly, 3);

        var groupsWithRoles = new List<(Group, MemberRole)>
        {
            (group1, MemberRole.Owner),
            (group2, MemberRole.Member)
        };

        _mockGroupRepository.Setup(x => x.GetUserGroupsAsync(userId))
            .ReturnsAsync(groupsWithRoles);
        _mockGroupRepository.Setup(x => x.GetJoinCodeAsync(group2.Id))
            .ReturnsAsync("ABC12345");

        // Act
        var result = await _sut.GetUserGroupsAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Groups.Should().HaveCount(2);
        result.Groups[0].Name.Should().Be("Group 1");
        result.Groups[0].Role.Should().Be(MemberRole.Owner);
        result.Groups[1].Name.Should().Be("Group 2");
        result.Groups[1].Role.Should().Be(MemberRole.Member);
        result.Groups[1].JoinCode.Should().BeNull(); // Member shouldn't see join code
        _mockGroupRepository.Verify(x => x.GetUserGroupsAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetUserGroupsAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.GetUserGroupsAsync(Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockGroupRepository.Verify(x => x.GetUserGroupsAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetUserGroupsAsync_WithNoGroups_ReturnsEmptyList()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _mockGroupRepository.Setup(x => x.GetUserGroupsAsync(userId))
            .ReturnsAsync(new List<(Group, MemberRole)>());

        // Act
        var result = await _sut.GetUserGroupsAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Groups.Should().BeEmpty();
    }

    #endregion

    #region UpdateGroupAsync Tests

    [Fact]
    public async Task UpdateGroupAsync_WithValidOwner_UpdatesGroup()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new UpdateGroupRequest { Name = "Updated Name", Description = "Updated Description", IsPublic = false };
        var group = CreateTestGroup(groupId, "Old Name", userId, true, null, CompetitionPeriodType.Weekly, 1);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow };
        var updatedGroup = CreateTestGroup(groupId, "Updated Name", userId, false, null, CompetitionPeriodType.Weekly, 1);

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.UpdateAsync(It.IsAny<Group>()))
            .ReturnsAsync(updatedGroup);
        _mockGroupRepository.Setup(x => x.GetJoinCodeAsync(groupId))
            .ReturnsAsync("ABC12345");

        // Act
        var result = await _sut.UpdateGroupAsync(userId, groupId, request);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Updated Name");
        result.IsPublic.Should().BeFalse();
        _mockGroupRepository.Verify(x => x.UpdateAsync(It.Is<Group>(g =>
            g.Name == "Updated Name" &&
            g.Description == "Updated Description" &&
            g.IsPublic == false
        )), Times.Once);
        _mockGroupRepository.Verify(x => x.CreateJoinCodeAsync(groupId, It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UpdateGroupAsync_ChangingPublicToPrivate_GeneratesJoinCode()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new UpdateGroupRequest { Name = "Test Group", IsPublic = false };
        var group = CreateTestGroup(groupId, "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 1);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow };
        var updatedGroup = CreateTestGroup(groupId, "Test Group", userId, false, null, CompetitionPeriodType.Weekly, 1);

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.UpdateAsync(It.IsAny<Group>()))
            .ReturnsAsync(updatedGroup);
        _mockGroupRepository.SetupSequence(x => x.GetJoinCodeAsync(groupId))
            .ReturnsAsync((string?)null)
            .ReturnsAsync("ABC12345");
        _mockGroupRepository.Setup(x => x.CreateJoinCodeAsync(groupId, It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.UpdateGroupAsync(userId, groupId, request);

        // Assert
        result.JoinCode.Should().NotBeNullOrEmpty();
        _mockGroupRepository.Verify(x => x.UpdateAsync(It.Is<Group>(g =>
            g.IsPublic == false
        )), Times.Once);
        _mockGroupRepository.Verify(x => x.CreateJoinCodeAsync(groupId, It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task UpdateGroupAsync_ChangingPrivateToPublic_KeepsJoinCode()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new UpdateGroupRequest { Name = "Test Group", IsPublic = true };
        var group = CreateTestGroup(groupId, "Test Group", userId, false, null, CompetitionPeriodType.Weekly, 1);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow };
        var updatedGroup = CreateTestGroup(groupId, "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 1);

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.UpdateAsync(It.IsAny<Group>()))
            .ReturnsAsync(updatedGroup);
        _mockGroupRepository.Setup(x => x.GetJoinCodeAsync(groupId))
            .ReturnsAsync("EXISTING");

        // Act
        var result = await _sut.UpdateGroupAsync(userId, groupId, request);

        // Assert
        result.JoinCode.Should().NotBeNull();
        result.JoinCode.Should().Be("EXISTING");
        _mockGroupRepository.Verify(x => x.UpdateAsync(It.Is<Group>(g =>
            g.IsPublic == true
        )), Times.Once);
        _mockGroupRepository.Verify(x => x.DeleteJoinCodeAsync(groupId), Times.Never);
        _mockGroupRepository.Verify(x => x.CreateJoinCodeAsync(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UpdateGroupAsync_AsAdmin_UpdatesGroup()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new UpdateGroupRequest { Name = "Updated Name", IsPublic = true };
        var group = CreateTestGroup(groupId, "Old Name", Guid.NewGuid(), true, null, CompetitionPeriodType.Weekly, 1);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Admin, JoinedAt = DateTime.UtcNow };
        var updatedGroup = CreateTestGroup(groupId, "Updated Name", group.CreatedById, true, null, CompetitionPeriodType.Weekly, 1);

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.UpdateAsync(It.IsAny<Group>()))
            .ReturnsAsync(updatedGroup);

        // Act
        var result = await _sut.UpdateGroupAsync(userId, groupId, request);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Updated Name");
        _mockGroupRepository.Verify(x => x.UpdateAsync(It.IsAny<Group>()), Times.Once);
    }

    [Fact]
    public async Task UpdateGroupAsync_AsMember_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new UpdateGroupRequest { Name = "Updated Name", IsPublic = true };
        var group = CreateTestGroup(groupId, "Old Name", Guid.NewGuid(), true, null, CompetitionPeriodType.Weekly, 1);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);

        // Act
        var act = async () => await _sut.UpdateGroupAsync(userId, groupId, request);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Only group owners and admins can update the group.");
        _mockGroupRepository.Verify(x => x.UpdateAsync(It.IsAny<Group>()), Times.Never);
    }

    [Fact]
    public async Task UpdateGroupAsync_WithEmptyName_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new UpdateGroupRequest { Name = "", IsPublic = true };

        // Act
        var act = async () => await _sut.UpdateGroupAsync(userId, groupId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Group name cannot be empty.");
        _mockGroupRepository.Verify(x => x.UpdateAsync(It.IsAny<Group>()), Times.Never);
    }

    #endregion

    #region DeleteGroupAsync Tests

    [Fact]
    public async Task DeleteGroupAsync_AsOwner_DeletesGroup()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 1);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.DeleteAsync(groupId))
            .ReturnsAsync(true);

        // Act
        await _sut.DeleteGroupAsync(userId, groupId);

        // Assert
        _mockGroupRepository.Verify(x => x.DeleteAsync(groupId), Times.Once);
    }

    [Fact]
    public async Task DeleteGroupAsync_AsNonOwner_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", Guid.NewGuid(), true, null, CompetitionPeriodType.Weekly, 1);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Admin, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);

        // Act
        var act = async () => await _sut.DeleteGroupAsync(userId, groupId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Only the group owner can delete the group.");
        _mockGroupRepository.Verify(x => x.DeleteAsync(It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region JoinGroupAsync Tests

    [Fact]
    public async Task JoinGroupAsync_PublicGroup_JoinsSuccessfully()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new JoinGroupRequest { JoinCode = null };
        var group = CreateTestGroup(groupId, "Test Group", Guid.NewGuid(), true, null, CompetitionPeriodType.Weekly, 5);
        var groupAfterJoin = CreateTestGroup(groupId, "Test Group", group.CreatedById, true, null, CompetitionPeriodType.Weekly, 6);

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync((GroupMembership?)null);
        _mockGroupRepository.Setup(x => x.AddMemberAsync(It.IsAny<GroupMembership>()))
            .ReturnsAsync(new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow });
        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(groupAfterJoin);

        // Act
        var result = await _sut.JoinGroupAsync(userId, groupId, request);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(groupId);
        result.Role.Should().Be(MemberRole.Member);
        _mockGroupRepository.Verify(x => x.AddMemberAsync(It.Is<GroupMembership>(m =>
            m.UserId == userId &&
            m.GroupId == groupId &&
            m.Role == MemberRole.Member
        )), Times.Once);
    }

    [Fact]
    public async Task JoinGroupAsync_PrivateGroupWithValidCode_JoinsSuccessfully()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var joinCode = "ABC12345";
        var request = new JoinGroupRequest { JoinCode = joinCode };
        var group = CreateTestGroup(groupId, "Test Group", Guid.NewGuid(), false, null, CompetitionPeriodType.Weekly, 5);
        var groupAfterJoin = CreateTestGroup(groupId, "Test Group", group.CreatedById, false, null, CompetitionPeriodType.Weekly, 6);

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync((GroupMembership?)null);
        _mockGroupRepository.Setup(x => x.GetJoinCodeAsync(groupId))
            .ReturnsAsync(joinCode);
        _mockGroupRepository.Setup(x => x.AddMemberAsync(It.IsAny<GroupMembership>()))
            .ReturnsAsync(new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow });
        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(groupAfterJoin);

        // Act
        var result = await _sut.JoinGroupAsync(userId, groupId, request);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(groupId);
        _mockGroupRepository.Verify(x => x.AddMemberAsync(It.IsAny<GroupMembership>()), Times.Once);
    }

    [Fact]
    public async Task JoinGroupAsync_PrivateGroupWithoutCode_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new JoinGroupRequest { JoinCode = null };
        var group = CreateTestGroup(groupId, "Test Group", Guid.NewGuid(), false, null, CompetitionPeriodType.Weekly, 5);

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync((GroupMembership?)null);

        // Act
        var act = async () => await _sut.JoinGroupAsync(userId, groupId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Join code is required for private groups.");
        _mockGroupRepository.Verify(x => x.AddMemberAsync(It.IsAny<GroupMembership>()), Times.Never);
    }

    [Fact]
    public async Task JoinGroupAsync_PrivateGroupWithInvalidCode_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new JoinGroupRequest { JoinCode = "WRONGCODE" };
        var group = CreateTestGroup(groupId, "Test Group", Guid.NewGuid(), false, null, CompetitionPeriodType.Weekly, 5);

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync((GroupMembership?)null);
        _mockGroupRepository.Setup(x => x.GetJoinCodeAsync(groupId))
            .ReturnsAsync("ABC12345");

        // Act
        var act = async () => await _sut.JoinGroupAsync(userId, groupId, request);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Invalid join code.");
        _mockGroupRepository.Verify(x => x.AddMemberAsync(It.IsAny<GroupMembership>()), Times.Never);
    }

    [Fact]
    public async Task JoinGroupAsync_AlreadyMember_ThrowsInvalidOperationException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new JoinGroupRequest();
        var group = CreateTestGroup(groupId, "Test Group", Guid.NewGuid(), true, null, CompetitionPeriodType.Weekly, 5);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);

        // Act
        var act = async () => await _sut.JoinGroupAsync(userId, groupId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("You are already a member of this group.");
        _mockGroupRepository.Verify(x => x.AddMemberAsync(It.IsAny<GroupMembership>()), Times.Never);
    }

    #endregion

    #region LeaveGroupAsync Tests

    [Fact]
    public async Task LeaveGroupAsync_AsMember_LeavesGroup()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", Guid.NewGuid(), true, null, CompetitionPeriodType.Weekly, 5);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.RemoveMemberAsync(groupId, userId))
            .ReturnsAsync(true);

        // Act
        await _sut.LeaveGroupAsync(userId, groupId);

        // Assert
        _mockGroupRepository.Verify(x => x.RemoveMemberAsync(groupId, userId), Times.Once);
    }

    [Fact]
    public async Task LeaveGroupAsync_AsOwnerWithOtherMembers_ThrowsInvalidOperationException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 5);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow };
        var members = new List<GroupMembership>
        {
            membership,
            new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = Guid.NewGuid(), Role = MemberRole.Member, JoinedAt = DateTime.UtcNow }
        };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.GetMembersAsync(groupId))
            .ReturnsAsync(members);

        // Act
        var act = async () => await _sut.LeaveGroupAsync(userId, groupId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Group owner cannot leave. Transfer ownership to another member first or delete the group.");
        _mockGroupRepository.Verify(x => x.RemoveMemberAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task LeaveGroupAsync_AsOwnerAlone_LeavesGroup()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 1);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.GetMembersAsync(groupId))
            .ReturnsAsync(new List<GroupMembership> { membership });
        _mockGroupRepository.Setup(x => x.RemoveMemberAsync(groupId, userId))
            .ReturnsAsync(true);

        // Act
        await _sut.LeaveGroupAsync(userId, groupId);

        // Assert
        _mockGroupRepository.Verify(x => x.RemoveMemberAsync(groupId, userId), Times.Once);
    }

    [Fact]
    public async Task LeaveGroupAsync_NotMember_ThrowsInvalidOperationException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", Guid.NewGuid(), true, null, CompetitionPeriodType.Weekly, 5);

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync((GroupMembership?)null);

        // Act
        var act = async () => await _sut.LeaveGroupAsync(userId, groupId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("You are not a member of this group.");
        _mockGroupRepository.Verify(x => x.RemoveMemberAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region InviteMemberAsync Tests

    [Fact]
    public async Task InviteMemberAsync_AsOwner_InvitesMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var inviteUserId = Guid.NewGuid();
        var request = new InviteMemberRequest { UserId = inviteUserId };
        var group = CreateTestGroup(groupId, "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 5);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow };
        var userToInvite = CreateTestUser(inviteUserId, "Invited User");
        var newMembership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = inviteUserId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockUserRepository.Setup(x => x.GetByIdAsync(inviteUserId))
            .ReturnsAsync(userToInvite);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, inviteUserId))
            .ReturnsAsync((GroupMembership?)null);
        _mockGroupRepository.Setup(x => x.AddMemberAsync(It.IsAny<GroupMembership>()))
            .ReturnsAsync(newMembership);

        // Act
        var result = await _sut.InviteMemberAsync(userId, groupId, request);

        // Assert
        result.Should().NotBeNull();
        result.UserId.Should().Be(inviteUserId);
        result.DisplayName.Should().Be("Invited User");
        result.Role.Should().Be(MemberRole.Member);
        _mockGroupRepository.Verify(x => x.AddMemberAsync(It.Is<GroupMembership>(m =>
            m.UserId == inviteUserId &&
            m.GroupId == groupId &&
            m.Role == MemberRole.Member
        )), Times.Once);
    }

    [Fact]
    public async Task InviteMemberAsync_AsMember_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var request = new InviteMemberRequest { UserId = Guid.NewGuid() };
        var group = CreateTestGroup(groupId, "Test Group", Guid.NewGuid(), true, null, CompetitionPeriodType.Weekly, 5);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);

        // Act
        var act = async () => await _sut.InviteMemberAsync(userId, groupId, request);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Only group owners and admins can invite members.");
        _mockGroupRepository.Verify(x => x.AddMemberAsync(It.IsAny<GroupMembership>()), Times.Never);
    }

    [Fact]
    public async Task InviteMemberAsync_UserAlreadyMember_ThrowsInvalidOperationException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var inviteUserId = Guid.NewGuid();
        var request = new InviteMemberRequest { UserId = inviteUserId };
        var group = CreateTestGroup(groupId, "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 5);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow };
        var userToInvite = CreateTestUser(inviteUserId, "Invited User");
        var existingMembership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = inviteUserId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockUserRepository.Setup(x => x.GetByIdAsync(inviteUserId))
            .ReturnsAsync(userToInvite);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, inviteUserId))
            .ReturnsAsync(existingMembership);

        // Act
        var act = async () => await _sut.InviteMemberAsync(userId, groupId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("User is already a member of this group.");
        _mockGroupRepository.Verify(x => x.AddMemberAsync(It.IsAny<GroupMembership>()), Times.Never);
    }

    [Fact]
    public async Task InviteMemberAsync_UserDoesNotExist_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var inviteUserId = Guid.NewGuid();
        var request = new InviteMemberRequest { UserId = inviteUserId };
        var group = CreateTestGroup(groupId, "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 5);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockUserRepository.Setup(x => x.GetByIdAsync(inviteUserId))
            .ReturnsAsync((User?)null);

        // Act
        var act = async () => await _sut.InviteMemberAsync(userId, groupId, request);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"User not found: {inviteUserId}");
        _mockGroupRepository.Verify(x => x.AddMemberAsync(It.IsAny<GroupMembership>()), Times.Never);
    }

    #endregion

    #region RemoveMemberAsync Tests

    [Fact]
    public async Task RemoveMemberAsync_AsOwner_RemovesMember()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 5);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow };
        var targetMembership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = targetUserId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, targetUserId))
            .ReturnsAsync(targetMembership);
        _mockGroupRepository.Setup(x => x.RemoveMemberAsync(groupId, targetUserId))
            .ReturnsAsync(true);

        // Act
        await _sut.RemoveMemberAsync(userId, groupId, targetUserId);

        // Assert
        _mockGroupRepository.Verify(x => x.RemoveMemberAsync(groupId, targetUserId), Times.Once);
    }

    [Fact]
    public async Task RemoveMemberAsync_RemovingOwner_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", targetUserId, true, null, CompetitionPeriodType.Weekly, 5);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Admin, JoinedAt = DateTime.UtcNow };
        var targetMembership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = targetUserId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, targetUserId))
            .ReturnsAsync(targetMembership);

        // Act
        var act = async () => await _sut.RemoveMemberAsync(userId, groupId, targetUserId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Cannot remove the group owner.");
        _mockGroupRepository.Verify(x => x.RemoveMemberAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task RemoveMemberAsync_AdminRemovingAdmin_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", Guid.NewGuid(), true, null, CompetitionPeriodType.Weekly, 5);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Admin, JoinedAt = DateTime.UtcNow };
        var targetMembership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = targetUserId, Role = MemberRole.Admin, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, targetUserId))
            .ReturnsAsync(targetMembership);

        // Act
        var act = async () => await _sut.RemoveMemberAsync(userId, groupId, targetUserId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Admins cannot remove other admins.");
        _mockGroupRepository.Verify(x => x.RemoveMemberAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task RemoveMemberAsync_AsMember_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", Guid.NewGuid(), true, null, CompetitionPeriodType.Weekly, 5);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);

        // Act
        var act = async () => await _sut.RemoveMemberAsync(userId, groupId, targetUserId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Only group owners and admins can remove members.");
        _mockGroupRepository.Verify(x => x.RemoveMemberAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region GetMembersAsync Tests

    [Fact]
    public async Task GetMembersAsync_AsMember_ReturnsMembers()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var member1Id = Guid.NewGuid();
        var member2Id = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 3);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow };
        var memberships = new List<GroupMembership>
        {
            new() { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), GroupId = groupId, UserId = member1Id, Role = MemberRole.Admin, JoinedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), GroupId = groupId, UserId = member2Id, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow }
        };
        var users = new List<User>
        {
            CreateTestUser(userId, "Owner User"),
            CreateTestUser(member1Id, "Admin User"),
            CreateTestUser(member2Id, "Member User")
        };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.GetMembersAsync(groupId))
            .ReturnsAsync(memberships);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync((List<Guid> ids) => users.Where(u => ids.Contains(u.Id)).ToList());

        // Act
        var result = await _sut.GetMembersAsync(userId, groupId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(3);
        result[0].Role.Should().Be(MemberRole.Owner);
        result[1].Role.Should().Be(MemberRole.Admin);
        result[2].Role.Should().Be(MemberRole.Member);
    }

    [Fact]
    public async Task GetMembersAsync_NotMember_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", Guid.NewGuid(), true, null, CompetitionPeriodType.Weekly, 5);

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync((GroupMembership?)null);

        // Act
        var act = async () => await _sut.GetMembersAsync(userId, groupId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("You are not a member of this group.");
        _mockGroupRepository.Verify(x => x.GetMembersAsync(It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region GetLeaderboardAsync Tests

    [Fact]
    public async Task GetLeaderboardAsync_DailyPeriod_ReturnsLeaderboard()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", userId, true, null, CompetitionPeriodType.Daily, 3);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow };
        var entries = new List<LeaderboardEntry>
        {
            new() { Rank = 1, UserId = Guid.NewGuid(), DisplayName = "User 1", TotalSteps = 10000, TotalDistanceMeters = 7000 },
            new() { Rank = 2, UserId = userId, DisplayName = "User 2", TotalSteps = 8000, TotalDistanceMeters = 5600 }
        };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.GetLeaderboardAsync(groupId, It.IsAny<DateRange>()))
            .ReturnsAsync(entries);

        // Act
        var result = await _sut.GetLeaderboardAsync(userId, groupId);

        // Assert
        result.Should().NotBeNull();
        result.GroupId.Should().Be(groupId);
        result.Entries.Should().HaveCount(2);
        result.Entries[0].Rank.Should().Be(1);
        result.Entries[0].TotalSteps.Should().Be(10000);
    }

    [Fact]
    public async Task GetLeaderboardAsync_WeeklyPeriod_CalculatesCorrectDateRange()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 3);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow };
        var entries = new List<LeaderboardEntry>();

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.GetLeaderboardAsync(groupId, It.IsAny<DateRange>()))
            .ReturnsAsync(entries);

        // Act
        var result = await _sut.GetLeaderboardAsync(userId, groupId);

        // Assert
        result.Should().NotBeNull();
        var daysSincePeriodStart = (result.PeriodEnd - result.PeriodStart).Days;
        daysSincePeriodStart.Should().Be(6); // Weekly period should be 7 days (0-6 inclusive)
    }

    [Fact]
    public async Task GetLeaderboardAsync_MonthlyPeriod_CalculatesCorrectDateRange()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", userId, true, null, CompetitionPeriodType.Monthly, 3);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow };
        var entries = new List<LeaderboardEntry>();

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.GetLeaderboardAsync(groupId, It.IsAny<DateRange>()))
            .ReturnsAsync(entries);

        // Act
        var result = await _sut.GetLeaderboardAsync(userId, groupId);

        // Assert
        result.Should().NotBeNull();
        result.PeriodStart.Day.Should().Be(1); // Monthly period should start on the 1st
    }

    [Fact]
    public async Task GetLeaderboardAsync_NotMember_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", Guid.NewGuid(), true, null, CompetitionPeriodType.Weekly, 5);

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync((GroupMembership?)null);

        // Act
        var act = async () => await _sut.GetLeaderboardAsync(userId, groupId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("You are not a member of this group.");
        _mockGroupRepository.Verify(x => x.GetLeaderboardAsync(It.IsAny<Guid>(), It.IsAny<DateRange>()), Times.Never);
    }

    #endregion

    #region RegenerateJoinCodeAsync Tests

    [Fact]
    public async Task RegenerateJoinCodeAsync_AsOwnerOfPrivateGroup_RegeneratesCode()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", userId, false, null, CompetitionPeriodType.Weekly, 5);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.UpdateJoinCodeAsync(groupId, It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.RegenerateJoinCodeAsync(userId, groupId);

        // Assert
        result.Should().NotBeNull();
        result.JoinCode.Should().NotBeNullOrEmpty();
        _mockGroupRepository.Verify(x => x.UpdateJoinCodeAsync(groupId, It.Is<string>(code =>
            !string.IsNullOrEmpty(code)
        )), Times.Once);
        _mockGroupRepository.Verify(x => x.UpdateAsync(It.IsAny<Group>()), Times.Never);
    }

    [Fact]
    public async Task RegenerateJoinCodeAsync_ForPublicGroup_RegeneratesCode()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", userId, true, null, CompetitionPeriodType.Weekly, 5);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Owner, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);
        _mockGroupRepository.Setup(x => x.UpdateJoinCodeAsync(groupId, It.IsAny<string>()))
            .Returns(Task.CompletedTask);
        _mockGroupRepository.Setup(x => x.GetJoinCodeAsync(groupId))
            .ReturnsAsync("NEWCODE01");

        // Act
        var result = await _sut.RegenerateJoinCodeAsync(userId, groupId);

        // Assert
        result.Should().NotBeNull();
        result.JoinCode.Should().NotBeNullOrEmpty();
        _mockGroupRepository.Verify(x => x.UpdateJoinCodeAsync(groupId, It.Is<string>(code =>
            !string.IsNullOrEmpty(code)
        )), Times.Once);
    }

    [Fact]
    public async Task RegenerateJoinCodeAsync_AsMember_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", Guid.NewGuid(), false, null, CompetitionPeriodType.Weekly, 5);
        var membership = new GroupMembership { Id = Guid.NewGuid(), GroupId = groupId, UserId = userId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow };

        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(membership);

        // Act
        var act = async () => await _sut.RegenerateJoinCodeAsync(userId, groupId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Only group owners and admins can regenerate the join code.");
        _mockGroupRepository.Verify(x => x.UpdateAsync(It.IsAny<Group>()), Times.Never);
        _mockGroupRepository.Verify(x => x.UpdateJoinCodeAsync(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Helper Methods

    private static Group CreateTestGroup(Guid id, string name, Guid createdById, bool isPublic, string? joinCode, CompetitionPeriodType periodType, int memberCount)
    {
        return new Group
        {
            Id = id,
            Name = name,
            CreatedById = createdById,
            IsPublic = isPublic,
            JoinCode = joinCode,
            PeriodType = periodType,
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            MemberCount = memberCount
        };
    }

    private static User CreateTestUser(Guid userId, string displayName)
    {
        return new User
        {
            Id = userId,
            DisplayName = displayName,
            AvatarUrl = "https://example.com/avatar.jpg",
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };
    }

    #endregion
}
