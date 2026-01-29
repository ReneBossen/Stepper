using FluentAssertions;
using Moq;
using Stepper.Api.Groups;
using Stepper.Api.Users;

namespace Stepper.UnitTests.Groups;

/// <summary>
/// Unit tests for GroupService.SearchPublicGroupsAsync method.
/// </summary>
public class GroupServiceSearchTests
{
    private readonly Mock<IGroupRepository> _mockGroupRepository;
    private readonly Mock<IUserRepository> _mockUserRepository;
    private readonly GroupService _sut;
    private readonly Guid _testUserId = Guid.NewGuid();

    public GroupServiceSearchTests()
    {
        _mockGroupRepository = new Mock<IGroupRepository>();
        _mockUserRepository = new Mock<IUserRepository>();
        _sut = new GroupService(_mockGroupRepository.Object, _mockUserRepository.Object);
    }

    #region SearchPublicGroupsAsync Tests

    [Fact]
    public async Task SearchPublicGroupsAsync_WithValidQuery_ReturnsMatchingGroups()
    {
        // Arrange
        var query = "walking";
        var limit = 20;
        var groups = new List<Group>
        {
            CreateTestGroup(Guid.NewGuid(), "Morning Walkers", "Early bird walking group", true, 15),
            CreateTestGroup(Guid.NewGuid(), "Walking Club", "Community walking club", true, 25),
            CreateTestGroup(Guid.NewGuid(), "Power Walking Team", null, true, 8)
        };

        _mockGroupRepository.Setup(x => x.SearchPublicGroupsAsync(query, limit))
            .ReturnsAsync(groups);
        _mockGroupRepository.Setup(x => x.GetUserGroupsAsync(_testUserId))
            .ReturnsAsync(new List<(Group, MemberRole)>());

        // Act
        var result = await _sut.SearchPublicGroupsAsync(_testUserId, query, limit);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(3);
        result[0].Name.Should().Be("Morning Walkers");
        result[0].MemberCount.Should().Be(15);
        result[0].IsPublic.Should().BeTrue();
        result[1].Name.Should().Be("Walking Club");
        result[2].Name.Should().Be("Power Walking Team");
        _mockGroupRepository.Verify(x => x.SearchPublicGroupsAsync(query, limit), Times.Once);
    }

    [Fact]
    public async Task SearchPublicGroupsAsync_WithNoResults_ReturnsEmptyList()
    {
        // Arrange
        var query = "xyz123nonexistent";
        var limit = 20;

        _mockGroupRepository.Setup(x => x.SearchPublicGroupsAsync(query, limit))
            .ReturnsAsync(new List<Group>());
        _mockGroupRepository.Setup(x => x.GetUserGroupsAsync(_testUserId))
            .ReturnsAsync(new List<(Group, MemberRole)>());

        // Act
        var result = await _sut.SearchPublicGroupsAsync(_testUserId, query, limit);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
        _mockGroupRepository.Verify(x => x.SearchPublicGroupsAsync(query, limit), Times.Once);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task SearchPublicGroupsAsync_WithEmptyOrWhitespaceQuery_ThrowsArgumentException(string? query)
    {
        // Arrange
        var limit = 20;

        // Act
        var act = async () => await _sut.SearchPublicGroupsAsync(_testUserId, query!, limit);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Search query cannot be empty.*");
        _mockGroupRepository.Verify(x => x.SearchPublicGroupsAsync(It.IsAny<string>(), It.IsAny<int>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-100)]
    public async Task SearchPublicGroupsAsync_WithZeroOrNegativeLimit_ThrowsArgumentException(int limit)
    {
        // Arrange
        var query = "walking";

        // Act
        var act = async () => await _sut.SearchPublicGroupsAsync(_testUserId, query, limit);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Limit must be between 1 and 100.*");
        _mockGroupRepository.Verify(x => x.SearchPublicGroupsAsync(It.IsAny<string>(), It.IsAny<int>()), Times.Never);
    }

    [Theory]
    [InlineData(101)]
    [InlineData(200)]
    [InlineData(1000)]
    public async Task SearchPublicGroupsAsync_WithLimitExceeding100_ThrowsArgumentException(int limit)
    {
        // Arrange
        var query = "walking";

        // Act
        var act = async () => await _sut.SearchPublicGroupsAsync(_testUserId, query, limit);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Limit must be between 1 and 100.*");
        _mockGroupRepository.Verify(x => x.SearchPublicGroupsAsync(It.IsAny<string>(), It.IsAny<int>()), Times.Never);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(50)]
    [InlineData(100)]
    public async Task SearchPublicGroupsAsync_WithValidLimitBoundaries_CallsRepository(int limit)
    {
        // Arrange
        var query = "test";

        _mockGroupRepository.Setup(x => x.SearchPublicGroupsAsync(query, limit))
            .ReturnsAsync(new List<Group>());
        _mockGroupRepository.Setup(x => x.GetUserGroupsAsync(_testUserId))
            .ReturnsAsync(new List<(Group, MemberRole)>());

        // Act
        await _sut.SearchPublicGroupsAsync(_testUserId, query, limit);

        // Assert
        _mockGroupRepository.Verify(x => x.SearchPublicGroupsAsync(query, limit), Times.Once);
    }

    [Fact]
    public async Task SearchPublicGroupsAsync_WithSingleCharacterQuery_CallsRepository()
    {
        // Arrange
        var query = "a";
        var limit = 20;

        _mockGroupRepository.Setup(x => x.SearchPublicGroupsAsync(query, limit))
            .ReturnsAsync(new List<Group>());
        _mockGroupRepository.Setup(x => x.GetUserGroupsAsync(_testUserId))
            .ReturnsAsync(new List<(Group, MemberRole)>());

        // Act
        await _sut.SearchPublicGroupsAsync(_testUserId, query, limit);

        // Assert
        _mockGroupRepository.Verify(x => x.SearchPublicGroupsAsync(query, limit), Times.Once);
    }

    [Fact]
    public async Task SearchPublicGroupsAsync_MapsGroupFieldsCorrectly()
    {
        // Arrange
        var query = "test";
        var limit = 20;
        var groupId = Guid.NewGuid();
        var groups = new List<Group>
        {
            CreateTestGroup(groupId, "Test Group", "Test Description", true, 42)
        };

        _mockGroupRepository.Setup(x => x.SearchPublicGroupsAsync(query, limit))
            .ReturnsAsync(groups);
        _mockGroupRepository.Setup(x => x.GetUserGroupsAsync(_testUserId))
            .ReturnsAsync(new List<(Group, MemberRole)>());

        // Act
        var result = await _sut.SearchPublicGroupsAsync(_testUserId, query, limit);

        // Assert
        result.Should().HaveCount(1);
        var response = result[0];
        response.Id.Should().Be(groupId);
        response.Name.Should().Be("Test Group");
        response.Description.Should().Be("Test Description");
        response.MemberCount.Should().Be(42);
        response.IsPublic.Should().BeTrue();
    }

    [Fact]
    public async Task SearchPublicGroupsAsync_WithNullDescription_ReturnsGroupWithNullDescription()
    {
        // Arrange
        var query = "test";
        var limit = 20;
        var groups = new List<Group>
        {
            CreateTestGroup(Guid.NewGuid(), "Test Group", null, true, 5)
        };

        _mockGroupRepository.Setup(x => x.SearchPublicGroupsAsync(query, limit))
            .ReturnsAsync(groups);
        _mockGroupRepository.Setup(x => x.GetUserGroupsAsync(_testUserId))
            .ReturnsAsync(new List<(Group, MemberRole)>());

        // Act
        var result = await _sut.SearchPublicGroupsAsync(_testUserId, query, limit);

        // Assert
        result.Should().HaveCount(1);
        result[0].Description.Should().BeNull();
    }

    #endregion

    #region Helper Methods

    private static Group CreateTestGroup(Guid id, string name, string? description, bool isPublic, int memberCount)
    {
        return new Group
        {
            Id = id,
            Name = name,
            Description = description,
            CreatedById = Guid.NewGuid(),
            IsPublic = isPublic,
            JoinCode = isPublic ? null : "ABC12345",
            PeriodType = CompetitionPeriodType.Weekly,
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            MemberCount = memberCount
        };
    }

    #endregion
}
