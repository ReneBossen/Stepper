using FluentAssertions;
using Moq;
using Stepper.Api.Groups;
using Stepper.Api.Users;

namespace Stepper.UnitTests.Groups;

/// <summary>
/// Unit tests for GroupService.JoinByCodeAsync, which now delegates to the
/// join_group_by_code SECURITY DEFINER RPC via
/// IGroupRepository.JoinGroupByCodeAsync.
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

    [Fact]
    public async Task JoinByCodeAsync_WithValidCode_ReturnsGroupWithActiveStatus()
    {
        var userId = Guid.NewGuid();
        var joinCode = "ABC12345";
        var groupId = Guid.NewGuid();
        var groupAfterJoin = CreateTestGroup(groupId, "Private Group", false, null, 6);

        _mockGroupRepository.Setup(x => x.JoinGroupByCodeAsync(joinCode))
            .ReturnsAsync((groupId, MembershipStatus.Active));
        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(groupAfterJoin);

        var result = await _sut.JoinByCodeAsync(userId, joinCode);

        result.Should().NotBeNull();
        result.Id.Should().Be(groupId);
        result.Name.Should().Be("Private Group");
        result.Role.Should().Be(MemberRole.Member);
        result.Status.Should().Be(MembershipStatus.Active);
        result.MemberCount.Should().Be(6);
        _mockGroupRepository.Verify(x => x.JoinGroupByCodeAsync(joinCode), Times.Once);
    }

    [Fact]
    public async Task JoinByCodeAsync_WithApprovalRequired_ReturnsPendingStatus()
    {
        var userId = Guid.NewGuid();
        var joinCode = "ABC12345";
        var groupId = Guid.NewGuid();
        var groupAfterJoin = CreateTestGroup(groupId, "Gated Group", false, null, 5);

        _mockGroupRepository.Setup(x => x.JoinGroupByCodeAsync(joinCode))
            .ReturnsAsync((groupId, MembershipStatus.Pending));
        _mockGroupRepository.Setup(x => x.GetByIdAsync(groupId))
            .ReturnsAsync(groupAfterJoin);

        var result = await _sut.JoinByCodeAsync(userId, joinCode);

        result.Status.Should().Be(MembershipStatus.Pending);
        result.Role.Should().Be(MemberRole.Member);
        result.JoinCode.Should().BeNull();
    }

    [Fact]
    public async Task JoinByCodeAsync_RpcThrows_BubblesUp()
    {
        var userId = Guid.NewGuid();
        var joinCode = "INVALID1";

        _mockGroupRepository.Setup(x => x.JoinGroupByCodeAsync(joinCode))
            .ThrowsAsync(new InvalidOperationException("Invalid join code"));

        var act = async () => await _sut.JoinByCodeAsync(userId, joinCode);

        await act.Should().ThrowAsync<InvalidOperationException>();
        _mockGroupRepository.Verify(x => x.JoinGroupByCodeAsync(joinCode), Times.Once);
    }

    [Fact]
    public async Task JoinByCodeAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        var act = async () => await _sut.JoinByCodeAsync(Guid.Empty, "ABC12345");

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockGroupRepository.Verify(x => x.JoinGroupByCodeAsync(It.IsAny<string>()), Times.Never);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task JoinByCodeAsync_WithEmptyOrWhitespaceCode_ThrowsArgumentException(string? code)
    {
        var userId = Guid.NewGuid();

        var act = async () => await _sut.JoinByCodeAsync(userId, code!);

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Join code cannot be empty.*");
        _mockGroupRepository.Verify(x => x.JoinGroupByCodeAsync(It.IsAny<string>()), Times.Never);
    }

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
}
