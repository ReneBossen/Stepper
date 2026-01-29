using FluentAssertions;
using Moq;
using Stepper.Api.Groups;
using Stepper.Api.Users;

namespace Stepper.UnitTests.Groups;

/// <summary>
/// Unit tests for GroupService.JoinByCodeAsync method.
/// </summary>
public class GroupServiceJoinByCodeTests
{
    private readonly Mock<IGroupRepository> _mockGroupRepository;
    private readonly Mock<IUserRepository> _mockUserRepository;
    private readonly GroupService _sut;

    public GroupServiceJoinByCodeTests()
    {
        _mockGroupRepository = new Mock<IGroupRepository>();
        _mockUserRepository = new Mock<IUserRepository>();
        _sut = new GroupService(_mockGroupRepository.Object, _mockUserRepository.Object);
    }

    #region JoinByCodeAsync Tests

    [Fact]
    public async Task JoinByCodeAsync_WithValidCode_JoinsGroupSuccessfully()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var joinCode = "ABC12345";
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Private Group", false, joinCode, 5);
        var groupAfterJoin = CreateTestGroup(groupId, "Private Group", false, joinCode, 6);

        _mockGroupRepository.Setup(x => x.GetByJoinCodeAsync(joinCode))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync((GroupMembership?)null);
        _mockGroupRepository.Setup(x => x.AddMemberAsync(It.IsAny<GroupMembership>()))
            .ReturnsAsync(new GroupMembership
            {
                Id = Guid.NewGuid(),
                GroupId = groupId,
                UserId = userId,
                Role = MemberRole.Member,
                JoinedAt = DateTime.UtcNow
            });
        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(groupAfterJoin);

        // Act
        var result = await _sut.JoinByCodeAsync(userId, joinCode);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(groupId);
        result.Name.Should().Be("Private Group");
        result.Role.Should().Be(MemberRole.Member);
        result.MemberCount.Should().Be(6);
        _mockGroupRepository.Verify(x => x.GetByJoinCodeAsync(joinCode), Times.Once);
        _mockGroupRepository.Verify(x => x.AddMemberAsync(It.Is<GroupMembership>(m =>
            m.UserId == userId &&
            m.GroupId == groupId &&
            m.Role == MemberRole.Member
        )), Times.Once);
    }

    [Fact]
    public async Task JoinByCodeAsync_WithInvalidCode_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var invalidCode = "INVALID1";

        _mockGroupRepository.Setup(x => x.GetByJoinCodeAsync(invalidCode))
            .ReturnsAsync((Group?)null);

        // Act
        var act = async () => await _sut.JoinByCodeAsync(userId, invalidCode);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Invalid join code. Group not found.");
        _mockGroupRepository.Verify(x => x.GetByJoinCodeAsync(invalidCode), Times.Once);
        _mockGroupRepository.Verify(x => x.AddMemberAsync(It.IsAny<GroupMembership>()), Times.Never);
    }

    [Fact]
    public async Task JoinByCodeAsync_WhenAlreadyMember_ThrowsInvalidOperationException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var joinCode = "ABC12345";
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Private Group", false, joinCode, 5);
        var existingMembership = new GroupMembership
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            UserId = userId,
            Role = MemberRole.Member,
            JoinedAt = DateTime.UtcNow.AddDays(-5)
        };

        _mockGroupRepository.Setup(x => x.GetByJoinCodeAsync(joinCode))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(existingMembership);

        // Act
        var act = async () => await _sut.JoinByCodeAsync(userId, joinCode);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("You are already a member of this group.");
        _mockGroupRepository.Verify(x => x.GetByJoinCodeAsync(joinCode), Times.Once);
        _mockGroupRepository.Verify(x => x.GetMembershipAsync(groupId, userId), Times.Once);
        _mockGroupRepository.Verify(x => x.AddMemberAsync(It.IsAny<GroupMembership>()), Times.Never);
    }

    [Fact]
    public async Task JoinByCodeAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var joinCode = "ABC12345";

        // Act
        var act = async () => await _sut.JoinByCodeAsync(Guid.Empty, joinCode);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockGroupRepository.Verify(x => x.GetByJoinCodeAsync(It.IsAny<string>()), Times.Never);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task JoinByCodeAsync_WithEmptyOrWhitespaceCode_ThrowsArgumentException(string? code)
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.JoinByCodeAsync(userId, code!);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Join code cannot be empty.*");
        _mockGroupRepository.Verify(x => x.GetByJoinCodeAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task JoinByCodeAsync_ReturnsGroupResponseWithCorrectRole()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var joinCode = "XYZ99999";
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", false, joinCode, 10);
        var groupAfterJoin = CreateTestGroup(groupId, "Test Group", false, joinCode, 11);

        _mockGroupRepository.Setup(x => x.GetByJoinCodeAsync(joinCode))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync((GroupMembership?)null);
        _mockGroupRepository.Setup(x => x.AddMemberAsync(It.IsAny<GroupMembership>()))
            .ReturnsAsync(new GroupMembership
            {
                Id = Guid.NewGuid(),
                GroupId = groupId,
                UserId = userId,
                Role = MemberRole.Member,
                JoinedAt = DateTime.UtcNow
            });
        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(groupAfterJoin);

        // Act
        var result = await _sut.JoinByCodeAsync(userId, joinCode);

        // Assert
        result.Role.Should().Be(MemberRole.Member);
        // New members shouldn't see join code (only owners/admins)
        result.JoinCode.Should().BeNull();
    }

    [Fact]
    public async Task JoinByCodeAsync_WhenAlreadyOwner_ThrowsInvalidOperationException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var joinCode = "ABC12345";
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Private Group", false, joinCode, 5);
        var existingMembership = new GroupMembership
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            UserId = userId,
            Role = MemberRole.Owner,
            JoinedAt = DateTime.UtcNow.AddDays(-10)
        };

        _mockGroupRepository.Setup(x => x.GetByJoinCodeAsync(joinCode))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(existingMembership);

        // Act
        var act = async () => await _sut.JoinByCodeAsync(userId, joinCode);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("You are already a member of this group.");
        _mockGroupRepository.Verify(x => x.AddMemberAsync(It.IsAny<GroupMembership>()), Times.Never);
    }

    [Fact]
    public async Task JoinByCodeAsync_WhenAlreadyAdmin_ThrowsInvalidOperationException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var joinCode = "ABC12345";
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Private Group", false, joinCode, 5);
        var existingMembership = new GroupMembership
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            UserId = userId,
            Role = MemberRole.Admin,
            JoinedAt = DateTime.UtcNow.AddDays(-3)
        };

        _mockGroupRepository.Setup(x => x.GetByJoinCodeAsync(joinCode))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync(existingMembership);

        // Act
        var act = async () => await _sut.JoinByCodeAsync(userId, joinCode);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("You are already a member of this group.");
    }

    [Fact]
    public async Task JoinByCodeAsync_CreatesMembershipWithCorrectTimestamp()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var joinCode = "ABC12345";
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", false, joinCode, 5);
        var groupAfterJoin = CreateTestGroup(groupId, "Test Group", false, joinCode, 6);
        var beforeTest = DateTime.UtcNow;

        GroupMembership? capturedMembership = null;
        _mockGroupRepository.Setup(x => x.GetByJoinCodeAsync(joinCode))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync((GroupMembership?)null);
        _mockGroupRepository.Setup(x => x.AddMemberAsync(It.IsAny<GroupMembership>()))
            .Callback<GroupMembership>(m => capturedMembership = m)
            .ReturnsAsync((GroupMembership m) => m);
        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(groupAfterJoin);

        // Act
        await _sut.JoinByCodeAsync(userId, joinCode);
        var afterTest = DateTime.UtcNow;

        // Assert
        capturedMembership.Should().NotBeNull();
        capturedMembership!.JoinedAt.Should().BeOnOrAfter(beforeTest);
        capturedMembership.JoinedAt.Should().BeOnOrBefore(afterTest);
    }

    [Fact]
    public async Task JoinByCodeAsync_GeneratesNewMembershipId()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var joinCode = "ABC12345";
        var groupId = Guid.NewGuid();
        var group = CreateTestGroup(groupId, "Test Group", false, joinCode, 5);
        var groupAfterJoin = CreateTestGroup(groupId, "Test Group", false, joinCode, 6);

        GroupMembership? capturedMembership = null;
        _mockGroupRepository.Setup(x => x.GetByJoinCodeAsync(joinCode))
            .ReturnsAsync(group);
        _mockGroupRepository.Setup(x => x.GetMembershipAsync(groupId, userId))
            .ReturnsAsync((GroupMembership?)null);
        _mockGroupRepository.Setup(x => x.AddMemberAsync(It.IsAny<GroupMembership>()))
            .Callback<GroupMembership>(m => capturedMembership = m)
            .ReturnsAsync((GroupMembership m) => m);
        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(groupAfterJoin);

        // Act
        await _sut.JoinByCodeAsync(userId, joinCode);

        // Assert
        capturedMembership.Should().NotBeNull();
        capturedMembership!.Id.Should().NotBe(Guid.Empty);
    }

    #endregion

    #region Helper Methods

    private static Group CreateTestGroup(Guid id, string name, bool isPublic, string? joinCode, int memberCount)
    {
        return new Group
        {
            Id = id,
            Name = name,
            Description = "Test Description",
            CreatedById = Guid.NewGuid(),
            IsPublic = isPublic,
            JoinCode = joinCode,
            PeriodType = CompetitionPeriodType.Weekly,
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            MemberCount = memberCount
        };
    }

    #endregion
}
