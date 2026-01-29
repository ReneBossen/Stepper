using FluentAssertions;
using Moq;
using Stepper.Api.Activity;
using Stepper.Api.Activity.DTOs;
using Stepper.Api.Friends;
using Stepper.Api.Users;

namespace Stepper.UnitTests.Activity;

public class ActivityServiceTests
{
    private readonly Mock<IActivityRepository> _mockActivityRepository;
    private readonly Mock<IFriendRepository> _mockFriendRepository;
    private readonly Mock<IUserRepository> _mockUserRepository;
    private readonly ActivityService _sut;

    public ActivityServiceTests()
    {
        _mockActivityRepository = new Mock<IActivityRepository>();
        _mockFriendRepository = new Mock<IFriendRepository>();
        _mockUserRepository = new Mock<IUserRepository>();
        _sut = new ActivityService(
            _mockActivityRepository.Object,
            _mockFriendRepository.Object,
            _mockUserRepository.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullActivityRepository_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new ActivityService(
            null!,
            _mockFriendRepository.Object,
            _mockUserRepository.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullFriendRepository_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new ActivityService(
            _mockActivityRepository.Object,
            null!,
            _mockUserRepository.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullUserRepository_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new ActivityService(
            _mockActivityRepository.Object,
            _mockFriendRepository.Object,
            null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region GetFeedAsync Tests

    [Fact]
    public async Task GetFeedAsync_WithValidParams_ReturnsFeed()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();
        var limit = 20;
        var offset = 0;

        var friendships = new List<Friendship>
        {
            new()
            {
                Id = Guid.NewGuid(),
                RequesterId = userId,
                AddresseeId = friendId,
                Status = FriendshipStatus.Accepted
            }
        };

        var activities = new List<ActivityItem>
        {
            CreateTestActivityItem(userId, "steps_recorded", "Recorded 5000 steps"),
            CreateTestActivityItem(friendId, "steps_recorded", "Recorded 8000 steps")
        };

        var users = new List<User>
        {
            CreateTestUser(userId, "Test User"),
            CreateTestUser(friendId, "Friend User")
        };

        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(friendships);
        _mockActivityRepository.Setup(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), limit, offset))
            .ReturnsAsync(activities);
        _mockActivityRepository.Setup(x => x.GetFeedCountAsync(userId, It.IsAny<List<Guid>>()))
            .ReturnsAsync(2);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(users);

        // Act
        var result = await _sut.GetFeedAsync(userId, limit, offset);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(2);
        result.HasMore.Should().BeFalse();

        _mockFriendRepository.Verify(x => x.GetFriendsAsync(userId), Times.Once);
        _mockActivityRepository.Verify(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), limit, offset), Times.Once);
        _mockActivityRepository.Verify(x => x.GetFeedCountAsync(userId, It.IsAny<List<Guid>>()), Times.Once);
    }

    [Fact]
    public async Task GetFeedAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.GetFeedAsync(Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");

        _mockFriendRepository.Verify(x => x.GetFriendsAsync(It.IsAny<Guid>()), Times.Never);
        _mockActivityRepository.Verify(x => x.GetFeedAsync(It.IsAny<Guid>(), It.IsAny<List<Guid>>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Theory]
    [InlineData(10, 0)]
    [InlineData(20, 0)]
    [InlineData(50, 10)]
    public async Task GetFeedAsync_WithPaginationParams_UsesPaginationCorrectly(int limit, int offset)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activities = new List<ActivityItem>();
        var users = new List<User>();

        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockActivityRepository.Setup(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), limit, offset))
            .ReturnsAsync(activities);
        _mockActivityRepository.Setup(x => x.GetFeedCountAsync(userId, It.IsAny<List<Guid>>()))
            .ReturnsAsync(0);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(users);

        // Act
        var result = await _sut.GetFeedAsync(userId, limit, offset);

        // Assert
        result.Should().NotBeNull();
        _mockActivityRepository.Verify(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), limit, offset), Times.Once);
    }

    [Fact]
    public async Task GetFeedAsync_WhenHasMoreItems_ReturnsHasMoreTrue()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var limit = 10;
        var offset = 0;
        var totalCount = 25;

        var activities = CreateTestActivityItems(userId, limit);
        var users = new List<User> { CreateTestUser(userId, "Test User") };

        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockActivityRepository.Setup(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), limit, offset))
            .ReturnsAsync(activities);
        _mockActivityRepository.Setup(x => x.GetFeedCountAsync(userId, It.IsAny<List<Guid>>()))
            .ReturnsAsync(totalCount);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(users);

        // Act
        var result = await _sut.GetFeedAsync(userId, limit, offset);

        // Assert
        result.Should().NotBeNull();
        result.HasMore.Should().BeTrue();
        result.TotalCount.Should().Be(totalCount);
    }

    [Theory]
    [InlineData(0, 10, 10, false)]   // offset + limit == totalCount
    [InlineData(0, 10, 5, false)]    // offset + limit > totalCount
    [InlineData(0, 10, 20, true)]    // offset + limit < totalCount
    [InlineData(5, 10, 20, true)]    // offset + limit < totalCount
    [InlineData(10, 10, 20, false)]  // offset + limit == totalCount
    [InlineData(15, 10, 20, false)]  // offset + limit > totalCount
    public async Task GetFeedAsync_HasMoreCalculation_IsCorrect(int offset, int limit, int totalCount, bool expectedHasMore)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activities = CreateTestActivityItems(userId, Math.Min(limit, Math.Max(0, totalCount - offset)));
        var users = new List<User> { CreateTestUser(userId, "Test User") };

        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockActivityRepository.Setup(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), limit, offset))
            .ReturnsAsync(activities);
        _mockActivityRepository.Setup(x => x.GetFeedCountAsync(userId, It.IsAny<List<Guid>>()))
            .ReturnsAsync(totalCount);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(users);

        // Act
        var result = await _sut.GetFeedAsync(userId, limit, offset);

        // Assert
        result.HasMore.Should().Be(expectedHasMore);
    }

    [Fact]
    public async Task GetFeedAsync_WithLimitExceedingMax_ClampsToMaxLimit()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var requestedLimit = 200;
        var expectedLimit = 100; // Max limit defined in service

        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockActivityRepository.Setup(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), expectedLimit, 0))
            .ReturnsAsync(new List<ActivityItem>());
        _mockActivityRepository.Setup(x => x.GetFeedCountAsync(userId, It.IsAny<List<Guid>>()))
            .ReturnsAsync(0);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(new List<User>());

        // Act
        var result = await _sut.GetFeedAsync(userId, requestedLimit, 0);

        // Assert
        result.Should().NotBeNull();
        _mockActivityRepository.Verify(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), expectedLimit, 0), Times.Once);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-10)]
    public async Task GetFeedAsync_WithLimitBelowMinimum_ClampsToMinLimit(int requestedLimit)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var expectedLimit = 1; // Min limit is 1

        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockActivityRepository.Setup(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), expectedLimit, 0))
            .ReturnsAsync(new List<ActivityItem>());
        _mockActivityRepository.Setup(x => x.GetFeedCountAsync(userId, It.IsAny<List<Guid>>()))
            .ReturnsAsync(0);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(new List<User>());

        // Act
        var result = await _sut.GetFeedAsync(userId, requestedLimit, 0);

        // Assert
        result.Should().NotBeNull();
        _mockActivityRepository.Verify(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), expectedLimit, 0), Times.Once);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(-10)]
    public async Task GetFeedAsync_WithNegativeOffset_ClampsToZero(int requestedOffset)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var expectedOffset = 0;

        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockActivityRepository.Setup(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), 20, expectedOffset))
            .ReturnsAsync(new List<ActivityItem>());
        _mockActivityRepository.Setup(x => x.GetFeedCountAsync(userId, It.IsAny<List<Guid>>()))
            .ReturnsAsync(0);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(new List<User>());

        // Act
        var result = await _sut.GetFeedAsync(userId, 20, requestedOffset);

        // Assert
        result.Should().NotBeNull();
        _mockActivityRepository.Verify(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), 20, expectedOffset), Times.Once);
    }

    [Fact]
    public async Task GetFeedAsync_WithNoFriends_ReturnsOnlyUserActivities()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activities = new List<ActivityItem>
        {
            CreateTestActivityItem(userId, "steps_recorded", "Recorded 5000 steps")
        };
        var users = new List<User> { CreateTestUser(userId, "Test User") };

        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockActivityRepository.Setup(x => x.GetFeedAsync(userId, It.Is<List<Guid>>(l => l.Count == 0), 20, 0))
            .ReturnsAsync(activities);
        _mockActivityRepository.Setup(x => x.GetFeedCountAsync(userId, It.Is<List<Guid>>(l => l.Count == 0)))
            .ReturnsAsync(1);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(users);

        // Act
        var result = await _sut.GetFeedAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(1);
        _mockActivityRepository.Verify(x => x.GetFeedAsync(userId, It.Is<List<Guid>>(l => l.Count == 0), 20, 0), Times.Once);
    }

    [Fact]
    public async Task GetFeedAsync_WithEmptyFeed_ReturnsEmptyItems()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockActivityRepository.Setup(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), 20, 0))
            .ReturnsAsync(new List<ActivityItem>());
        _mockActivityRepository.Setup(x => x.GetFeedCountAsync(userId, It.IsAny<List<Guid>>()))
            .ReturnsAsync(0);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(new List<User>());

        // Act
        var result = await _sut.GetFeedAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
        result.HasMore.Should().BeFalse();
    }

    [Fact]
    public async Task GetFeedAsync_WithUnknownUser_ReturnsUnknownUserName()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var unknownUserId = Guid.NewGuid();
        var activities = new List<ActivityItem>
        {
            CreateTestActivityItem(unknownUserId, "steps_recorded", "Recorded 5000 steps")
        };

        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockActivityRepository.Setup(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), 20, 0))
            .ReturnsAsync(activities);
        _mockActivityRepository.Setup(x => x.GetFeedCountAsync(userId, It.IsAny<List<Guid>>()))
            .ReturnsAsync(1);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(new List<User>()); // No users found

        // Act
        var result = await _sut.GetFeedAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(1);
        result.Items[0].UserName.Should().Be("Unknown User");
    }

    [Fact]
    public async Task GetFeedAsync_MapsActivityItemsCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activityId = Guid.NewGuid();
        var relatedUserId = Guid.NewGuid();
        var relatedGroupId = Guid.NewGuid();
        var createdAt = DateTime.UtcNow;

        var activities = new List<ActivityItem>
        {
            new()
            {
                Id = activityId,
                UserId = userId,
                Type = "friend_added",
                Message = "Added a new friend",
                Metadata = "{\"friendName\":\"Test Friend\"}",
                CreatedAt = createdAt,
                RelatedUserId = relatedUserId,
                RelatedGroupId = relatedGroupId
            }
        };

        var users = new List<User>
        {
            CreateTestUser(userId, "Test User", "https://example.com/avatar.jpg")
        };

        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockActivityRepository.Setup(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), 20, 0))
            .ReturnsAsync(activities);
        _mockActivityRepository.Setup(x => x.GetFeedCountAsync(userId, It.IsAny<List<Guid>>()))
            .ReturnsAsync(1);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(users);

        // Act
        var result = await _sut.GetFeedAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(1);

        var item = result.Items[0];
        item.Id.Should().Be(activityId);
        item.UserId.Should().Be(userId);
        item.UserName.Should().Be("Test User");
        item.UserAvatarUrl.Should().Be("https://example.com/avatar.jpg");
        item.Type.Should().Be("friend_added");
        item.Message.Should().Be("Added a new friend");
        item.Metadata.Should().NotBeNull();
        item.CreatedAt.Should().Be(createdAt);
        item.RelatedUserId.Should().Be(relatedUserId);
        item.RelatedGroupId.Should().Be(relatedGroupId);
    }

    [Fact]
    public async Task GetFeedAsync_WithInvalidMetadataJson_ReturnsNullMetadata()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activities = new List<ActivityItem>
        {
            new()
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Type = "steps_recorded",
                Message = "Recorded steps",
                Metadata = "invalid json {{{",
                CreatedAt = DateTime.UtcNow
            }
        };

        var users = new List<User> { CreateTestUser(userId, "Test User") };

        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockActivityRepository.Setup(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), 20, 0))
            .ReturnsAsync(activities);
        _mockActivityRepository.Setup(x => x.GetFeedCountAsync(userId, It.IsAny<List<Guid>>()))
            .ReturnsAsync(1);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(users);

        // Act
        var result = await _sut.GetFeedAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(1);
        result.Items[0].Metadata.Should().BeNull();
    }

    [Fact]
    public async Task GetFeedAsync_WithNullMetadata_ReturnsNullMetadata()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activities = new List<ActivityItem>
        {
            new()
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Type = "steps_recorded",
                Message = "Recorded steps",
                Metadata = null,
                CreatedAt = DateTime.UtcNow
            }
        };

        var users = new List<User> { CreateTestUser(userId, "Test User") };

        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockActivityRepository.Setup(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), 20, 0))
            .ReturnsAsync(activities);
        _mockActivityRepository.Setup(x => x.GetFeedCountAsync(userId, It.IsAny<List<Guid>>()))
            .ReturnsAsync(1);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(users);

        // Act
        var result = await _sut.GetFeedAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(1);
        result.Items[0].Metadata.Should().BeNull();
    }

    [Fact]
    public async Task GetFeedAsync_ExtractsFriendIdsCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friend1Id = Guid.NewGuid();
        var friend2Id = Guid.NewGuid();

        var friendships = new List<Friendship>
        {
            new()
            {
                Id = Guid.NewGuid(),
                RequesterId = userId,
                AddresseeId = friend1Id,
                Status = FriendshipStatus.Accepted
            },
            new()
            {
                Id = Guid.NewGuid(),
                RequesterId = friend2Id,
                AddresseeId = userId,
                Status = FriendshipStatus.Accepted
            }
        };

        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(friendships);
        _mockActivityRepository.Setup(x => x.GetFeedAsync(userId, It.Is<List<Guid>>(l => l.Contains(friend1Id) && l.Contains(friend2Id) && l.Count == 2), 20, 0))
            .ReturnsAsync(new List<ActivityItem>());
        _mockActivityRepository.Setup(x => x.GetFeedCountAsync(userId, It.IsAny<List<Guid>>()))
            .ReturnsAsync(0);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(new List<User>());

        // Act
        var result = await _sut.GetFeedAsync(userId);

        // Assert
        result.Should().NotBeNull();
        _mockActivityRepository.Verify(x => x.GetFeedAsync(userId, It.Is<List<Guid>>(l => l.Contains(friend1Id) && l.Contains(friend2Id) && l.Count == 2), 20, 0), Times.Once);
    }

    #endregion

    #region Helper Methods

    private static ActivityItem CreateTestActivityItem(Guid userId, string type, string message)
    {
        return new ActivityItem
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = type,
            Message = message,
            CreatedAt = DateTime.UtcNow
        };
    }

    private static List<ActivityItem> CreateTestActivityItems(Guid userId, int count)
    {
        var items = new List<ActivityItem>();
        for (var i = 0; i < count; i++)
        {
            items.Add(CreateTestActivityItem(userId, "steps_recorded", $"Recorded {1000 * (i + 1)} steps"));
        }
        return items;
    }

    private static User CreateTestUser(Guid userId, string displayName, string? avatarUrl = null)
    {
        return new User
        {
            Id = userId,
            DisplayName = displayName,
            AvatarUrl = avatarUrl,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
