using FluentAssertions;
using Moq;
using WalkingApp.Api.Common.Models;
using WalkingApp.Api.Friends;
using WalkingApp.Api.Friends.DTOs;
using WalkingApp.Api.Steps;
using WalkingApp.Api.Users;

namespace WalkingApp.UnitTests.Friends;

public class FriendServiceTests
{
    private readonly Mock<IFriendRepository> _mockFriendRepository;
    private readonly Mock<IUserRepository> _mockUserRepository;
    private readonly Mock<IStepRepository> _mockStepRepository;
    private readonly FriendService _sut;

    public FriendServiceTests()
    {
        _mockFriendRepository = new Mock<IFriendRepository>();
        _mockUserRepository = new Mock<IUserRepository>();
        _mockStepRepository = new Mock<IStepRepository>();
        _sut = new FriendService(_mockFriendRepository.Object, _mockUserRepository.Object, _mockStepRepository.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullFriendRepository_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new FriendService(null!, _mockUserRepository.Object, _mockStepRepository.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullUserRepository_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new FriendService(_mockFriendRepository.Object, null!, _mockStepRepository.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullStepRepository_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new FriendService(_mockFriendRepository.Object, _mockUserRepository.Object, null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region SendFriendRequestAsync Tests

    [Fact]
    public async Task SendFriendRequestAsync_WithValidRequest_ReturnsFriendRequestResponse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendUserId = Guid.NewGuid();
        var request = new SendFriendRequestRequest { FriendUserId = friendUserId };
        var targetUser = CreateTestUser(friendUserId, "Friend User");
        var friendship = CreateTestFriendship(userId, friendUserId, FriendshipStatus.Pending);
        var requesterUser = CreateTestUser(userId, "Requester User");

        _mockUserRepository.Setup(x => x.GetByIdAsync(friendUserId))
            .ReturnsAsync(targetUser);
        _mockFriendRepository.Setup(x => x.GetFriendshipAsync(userId, friendUserId))
            .ReturnsAsync((Friendship?)null);
        _mockFriendRepository.Setup(x => x.SendRequestAsync(userId, friendUserId))
            .ReturnsAsync(friendship);
        _mockUserRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(requesterUser);

        // Act
        var result = await _sut.SendFriendRequestAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(friendship.Id);
        result.RequesterId.Should().Be(userId);
        result.RequesterDisplayName.Should().Be("Requester User");
        result.Status.Should().Be("pending");
        _mockUserRepository.Verify(x => x.GetByIdAsync(friendUserId), Times.Once);
        _mockFriendRepository.Verify(x => x.GetFriendshipAsync(userId, friendUserId), Times.Once);
        _mockFriendRepository.Verify(x => x.SendRequestAsync(userId, friendUserId), Times.Once);
    }

    [Fact]
    public async Task SendFriendRequestAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var request = new SendFriendRequestRequest { FriendUserId = Guid.NewGuid() };

        // Act
        var act = async () => await _sut.SendFriendRequestAsync(Guid.Empty, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockUserRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
        _mockFriendRepository.Verify(x => x.SendRequestAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task SendFriendRequestAsync_WithNullRequest_ThrowsArgumentNullException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.SendFriendRequestAsync(userId, null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
        _mockUserRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
        _mockFriendRepository.Verify(x => x.SendRequestAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task SendFriendRequestAsync_WithEmptyFriendUserId_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new SendFriendRequestRequest { FriendUserId = Guid.Empty };

        // Act
        var act = async () => await _sut.SendFriendRequestAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Friend user ID cannot be empty.");
        _mockUserRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
        _mockFriendRepository.Verify(x => x.SendRequestAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task SendFriendRequestAsync_ToSelf_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new SendFriendRequestRequest { FriendUserId = userId };

        // Act
        var act = async () => await _sut.SendFriendRequestAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Cannot send friend request to yourself.");
        _mockUserRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
        _mockFriendRepository.Verify(x => x.SendRequestAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task SendFriendRequestAsync_WithNonExistentUser_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendUserId = Guid.NewGuid();
        var request = new SendFriendRequestRequest { FriendUserId = friendUserId };

        _mockUserRepository.Setup(x => x.GetByIdAsync(friendUserId))
            .ReturnsAsync((User?)null);

        // Act
        var act = async () => await _sut.SendFriendRequestAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"User not found: {friendUserId}");
        _mockUserRepository.Verify(x => x.GetByIdAsync(friendUserId), Times.Once);
        _mockFriendRepository.Verify(x => x.SendRequestAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task SendFriendRequestAsync_WithExistingFriendship_ThrowsInvalidOperationException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendUserId = Guid.NewGuid();
        var request = new SendFriendRequestRequest { FriendUserId = friendUserId };
        var targetUser = CreateTestUser(friendUserId, "Friend User");
        var existingFriendship = CreateTestFriendship(userId, friendUserId, FriendshipStatus.Pending);

        _mockUserRepository.Setup(x => x.GetByIdAsync(friendUserId))
            .ReturnsAsync(targetUser);
        _mockFriendRepository.Setup(x => x.GetFriendshipAsync(userId, friendUserId))
            .ReturnsAsync(existingFriendship);

        // Act
        var act = async () => await _sut.SendFriendRequestAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage($"A friendship or request already exists with status: {existingFriendship.Status}");
        _mockFriendRepository.Verify(x => x.SendRequestAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region GetPendingRequestsAsync Tests

    [Fact]
    public async Task GetPendingRequestsAsync_WithValidUserId_ReturnsPendingRequests()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var requesterId1 = Guid.NewGuid();
        var requesterId2 = Guid.NewGuid();
        var friendships = new List<Friendship>
        {
            CreateTestFriendship(requesterId1, userId, FriendshipStatus.Pending),
            CreateTestFriendship(requesterId2, userId, FriendshipStatus.Pending)
        };
        var requester1 = CreateTestUser(requesterId1, "User 1");
        var requester2 = CreateTestUser(requesterId2, "User 2");

        _mockFriendRepository.Setup(x => x.GetPendingRequestsAsync(userId))
            .ReturnsAsync(friendships);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync((List<Guid> ids) => new List<User> { requester1, requester2 }.Where(u => ids.Contains(u.Id)).ToList());

        // Act
        var result = await _sut.GetPendingRequestsAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result[0].RequesterId.Should().Be(requesterId1);
        result[0].RequesterDisplayName.Should().Be("User 1");
        result[1].RequesterId.Should().Be(requesterId2);
        result[1].RequesterDisplayName.Should().Be("User 2");
        _mockFriendRepository.Verify(x => x.GetPendingRequestsAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetPendingRequestsAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.GetPendingRequestsAsync(Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockFriendRepository.Verify(x => x.GetPendingRequestsAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetPendingRequestsAsync_WithNoPendingRequests_ReturnsEmptyList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockFriendRepository.Setup(x => x.GetPendingRequestsAsync(userId))
            .ReturnsAsync(new List<Friendship>());

        // Act
        var result = await _sut.GetPendingRequestsAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
        _mockFriendRepository.Verify(x => x.GetPendingRequestsAsync(userId), Times.Once);
    }

    #endregion

    #region GetSentRequestsAsync Tests

    [Fact]
    public async Task GetSentRequestsAsync_WithValidUserId_ReturnsSentRequests()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var addresseeId1 = Guid.NewGuid();
        var addresseeId2 = Guid.NewGuid();
        var friendships = new List<Friendship>
        {
            CreateTestFriendship(userId, addresseeId1, FriendshipStatus.Pending),
            CreateTestFriendship(userId, addresseeId2, FriendshipStatus.Pending)
        };
        var addressee1 = CreateTestUser(addresseeId1, "User 1");
        var addressee2 = CreateTestUser(addresseeId2, "User 2");

        _mockFriendRepository.Setup(x => x.GetSentRequestsAsync(userId))
            .ReturnsAsync(friendships);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync((List<Guid> ids) => new List<User> { addressee1, addressee2 }.Where(u => ids.Contains(u.Id)).ToList());

        // Act
        var result = await _sut.GetSentRequestsAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result[0].RequesterId.Should().Be(userId);
        result[0].RequesterDisplayName.Should().Be("User 1");
        result[1].RequesterId.Should().Be(userId);
        result[1].RequesterDisplayName.Should().Be("User 2");
        _mockFriendRepository.Verify(x => x.GetSentRequestsAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetSentRequestsAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.GetSentRequestsAsync(Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockFriendRepository.Verify(x => x.GetSentRequestsAsync(It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region AcceptRequestAsync Tests

    [Fact]
    public async Task AcceptRequestAsync_WithValidRequest_ReturnsAcceptedFriendRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var requestId = Guid.NewGuid();
        var requesterId = Guid.NewGuid();
        var friendship = CreateTestFriendship(requesterId, userId, FriendshipStatus.Accepted);
        friendship.Id = requestId;
        friendship.AcceptedAt = DateTime.UtcNow;
        var requester = CreateTestUser(requesterId, "Requester User");

        _mockFriendRepository.Setup(x => x.AcceptRequestAsync(requestId, userId))
            .ReturnsAsync(friendship);
        _mockUserRepository.Setup(x => x.GetByIdAsync(requesterId))
            .ReturnsAsync(requester);

        // Act
        var result = await _sut.AcceptRequestAsync(userId, requestId);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(requestId);
        result.RequesterId.Should().Be(requesterId);
        result.RequesterDisplayName.Should().Be("Requester User");
        result.Status.Should().Be("accepted");
        _mockFriendRepository.Verify(x => x.AcceptRequestAsync(requestId, userId), Times.Once);
        _mockUserRepository.Verify(x => x.GetByIdAsync(requesterId), Times.Once);
    }

    [Fact]
    public async Task AcceptRequestAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var requestId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.AcceptRequestAsync(Guid.Empty, requestId);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockFriendRepository.Verify(x => x.AcceptRequestAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task AcceptRequestAsync_WithEmptyRequestId_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.AcceptRequestAsync(userId, Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Request ID cannot be empty.*");
        _mockFriendRepository.Verify(x => x.AcceptRequestAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region RejectRequestAsync Tests

    [Fact]
    public async Task RejectRequestAsync_WithValidRequest_ReturnsRejectedFriendRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var requestId = Guid.NewGuid();
        var requesterId = Guid.NewGuid();
        var friendship = CreateTestFriendship(requesterId, userId, FriendshipStatus.Rejected);
        friendship.Id = requestId;
        var requester = CreateTestUser(requesterId, "Requester User");

        _mockFriendRepository.Setup(x => x.RejectRequestAsync(requestId, userId))
            .ReturnsAsync(friendship);
        _mockUserRepository.Setup(x => x.GetByIdAsync(requesterId))
            .ReturnsAsync(requester);

        // Act
        var result = await _sut.RejectRequestAsync(userId, requestId);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(requestId);
        result.RequesterId.Should().Be(requesterId);
        result.RequesterDisplayName.Should().Be("Requester User");
        result.Status.Should().Be("rejected");
        _mockFriendRepository.Verify(x => x.RejectRequestAsync(requestId, userId), Times.Once);
        _mockUserRepository.Verify(x => x.GetByIdAsync(requesterId), Times.Once);
    }

    [Fact]
    public async Task RejectRequestAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var requestId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.RejectRequestAsync(Guid.Empty, requestId);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockFriendRepository.Verify(x => x.RejectRequestAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task RejectRequestAsync_WithEmptyRequestId_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.RejectRequestAsync(userId, Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Request ID cannot be empty.*");
        _mockFriendRepository.Verify(x => x.RejectRequestAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region GetFriendsAsync Tests

    [Fact]
    public async Task GetFriendsAsync_WithValidUserId_ReturnsFriendsList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId1 = Guid.NewGuid();
        var friendId2 = Guid.NewGuid();
        var friendships = new List<Friendship>
        {
            CreateTestFriendship(userId, friendId1, FriendshipStatus.Accepted),
            CreateTestFriendship(friendId2, userId, FriendshipStatus.Accepted)
        };
        var friend1 = CreateTestUser(friendId1, "Friend 1");
        var friend2 = CreateTestUser(friendId2, "Friend 2");

        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(friendships);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync((List<Guid> ids) => new List<User> { friend1, friend2 }.Where(u => ids.Contains(u.Id)).ToList());

        // Act
        var result = await _sut.GetFriendsAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Friends.Should().HaveCount(2);
        result.TotalCount.Should().Be(2);
        result.Friends[0].UserId.Should().Be(friendId1);
        result.Friends[0].DisplayName.Should().Be("Friend 1");
        result.Friends[1].UserId.Should().Be(friendId2);
        result.Friends[1].DisplayName.Should().Be("Friend 2");
        _mockFriendRepository.Verify(x => x.GetFriendsAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetFriendsAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.GetFriendsAsync(Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockFriendRepository.Verify(x => x.GetFriendsAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetFriendsAsync_WithNoFriends_ReturnsEmptyList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(new List<Friendship>());

        // Act
        var result = await _sut.GetFriendsAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Friends.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
        _mockFriendRepository.Verify(x => x.GetFriendsAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetFriendsAsync_WithNullFriendProfile_SkipsThatFriend()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId1 = Guid.NewGuid();
        var friendId2 = Guid.NewGuid();
        var friendships = new List<Friendship>
        {
            CreateTestFriendship(userId, friendId1, FriendshipStatus.Accepted),
            CreateTestFriendship(friendId2, userId, FriendshipStatus.Accepted)
        };
        var friend2 = CreateTestUser(friendId2, "Friend 2");

        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(friendships);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync((List<Guid> ids) => new List<User> { friend2 }.Where(u => ids.Contains(u.Id)).ToList());

        // Act
        var result = await _sut.GetFriendsAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Friends.Should().HaveCount(1);
        result.TotalCount.Should().Be(1);
        result.Friends[0].UserId.Should().Be(friendId2);
    }

    #endregion

    #region GetFriendStepsAsync Tests

    [Fact]
    public async Task GetFriendStepsAsync_WithValidFriendship_ReturnsFriendSteps()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();
        var friendship = CreateTestFriendship(userId, friendId, FriendshipStatus.Accepted);
        var friend = CreateTestUser(friendId, "Friend User");
        var todaySummaries = new List<Api.Steps.DailyStepSummary>
        {
            new Api.Steps.DailyStepSummary { Date = DateOnly.FromDateTime(DateTime.UtcNow), TotalSteps = 5000, TotalDistanceMeters = 4000, EntryCount = 1 }
        };
        var weeklySummaries = new List<Api.Steps.DailyStepSummary>
        {
            new Api.Steps.DailyStepSummary { Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-6)), TotalSteps = 3000, TotalDistanceMeters = 2400, EntryCount = 1 },
            new Api.Steps.DailyStepSummary { Date = DateOnly.FromDateTime(DateTime.UtcNow), TotalSteps = 5000, TotalDistanceMeters = 4000, EntryCount = 1 }
        };

        _mockFriendRepository.Setup(x => x.GetFriendshipAsync(userId, friendId))
            .ReturnsAsync(friendship);
        _mockUserRepository.Setup(x => x.GetByIdAsync(friendId))
            .ReturnsAsync(friend);
        _mockStepRepository.Setup(x => x.GetDailySummariesAsync(friendId, It.Is<Api.Common.Models.DateRange>(r => r.StartDate == r.EndDate)))
            .ReturnsAsync(todaySummaries);
        _mockStepRepository.Setup(x => x.GetDailySummariesAsync(friendId, It.Is<Api.Common.Models.DateRange>(r => r.StartDate != r.EndDate)))
            .ReturnsAsync(weeklySummaries);

        // Act
        var result = await _sut.GetFriendStepsAsync(userId, friendId);

        // Assert
        result.Should().NotBeNull();
        result.FriendId.Should().Be(friendId);
        result.DisplayName.Should().Be("Friend User");
        result.TodaySteps.Should().Be(5000);
        result.WeeklySteps.Should().Be(8000);
    }

    [Fact]
    public async Task GetFriendStepsAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var friendId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.GetFriendStepsAsync(Guid.Empty, friendId);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockFriendRepository.Verify(x => x.GetFriendshipAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetFriendStepsAsync_WithEmptyFriendId_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.GetFriendStepsAsync(userId, Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Friend ID cannot be empty.*");
        _mockFriendRepository.Verify(x => x.GetFriendshipAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetFriendStepsAsync_WithNonExistentFriendship_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();

        _mockFriendRepository.Setup(x => x.GetFriendshipAsync(userId, friendId))
            .ReturnsAsync((Friendship?)null);

        // Act
        var act = async () => await _sut.GetFriendStepsAsync(userId, friendId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("You can only view steps of accepted friends.");
        _mockFriendRepository.Verify(x => x.GetFriendshipAsync(userId, friendId), Times.Once);
    }

    [Fact]
    public async Task GetFriendStepsAsync_WithPendingFriendship_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();
        var friendship = CreateTestFriendship(userId, friendId, FriendshipStatus.Pending);

        _mockFriendRepository.Setup(x => x.GetFriendshipAsync(userId, friendId))
            .ReturnsAsync(friendship);

        // Act
        var act = async () => await _sut.GetFriendStepsAsync(userId, friendId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("You can only view steps of accepted friends.");
        _mockFriendRepository.Verify(x => x.GetFriendshipAsync(userId, friendId), Times.Once);
    }

    [Fact]
    public async Task GetFriendStepsAsync_WithNonExistentFriend_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();
        var friendship = CreateTestFriendship(userId, friendId, FriendshipStatus.Accepted);

        _mockFriendRepository.Setup(x => x.GetFriendshipAsync(userId, friendId))
            .ReturnsAsync(friendship);
        _mockUserRepository.Setup(x => x.GetByIdAsync(friendId))
            .ReturnsAsync((User?)null);

        // Act
        var act = async () => await _sut.GetFriendStepsAsync(userId, friendId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"Friend not found: {friendId}");
        _mockUserRepository.Verify(x => x.GetByIdAsync(friendId), Times.Once);
    }

    #endregion

    #region RemoveFriendAsync Tests

    [Fact]
    public async Task RemoveFriendAsync_WithValidIds_RemovesFriend()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();

        _mockFriendRepository.Setup(x => x.RemoveFriendAsync(userId, friendId))
            .Returns(Task.CompletedTask);

        // Act
        await _sut.RemoveFriendAsync(userId, friendId);

        // Assert
        _mockFriendRepository.Verify(x => x.RemoveFriendAsync(userId, friendId), Times.Once);
    }

    [Fact]
    public async Task RemoveFriendAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var friendId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.RemoveFriendAsync(Guid.Empty, friendId);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockFriendRepository.Verify(x => x.RemoveFriendAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task RemoveFriendAsync_WithEmptyFriendId_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.RemoveFriendAsync(userId, Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Friend ID cannot be empty.*");
        _mockFriendRepository.Verify(x => x.RemoveFriendAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region GetFriendAsync Tests

    [Fact]
    public async Task GetFriendAsync_WithValidAcceptedFriend_ReturnsFriendResponse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();
        var friendship = CreateTestFriendship(userId, friendId, FriendshipStatus.Accepted);
        var friend = CreateTestUser(friendId, "Friend User");

        _mockFriendRepository.Setup(x => x.GetFriendshipAsync(userId, friendId))
            .ReturnsAsync(friendship);
        _mockUserRepository.Setup(x => x.GetByIdAsync(friendId))
            .ReturnsAsync(friend);

        // Act
        var result = await _sut.GetFriendAsync(userId, friendId);

        // Assert
        result.Should().NotBeNull();
        result.UserId.Should().Be(friendId);
        result.DisplayName.Should().Be("Friend User");
        result.AvatarUrl.Should().Be("https://example.com/avatar.jpg");
        result.FriendsSince.Should().Be(friendship.AcceptedAt ?? friendship.CreatedAt);
        _mockFriendRepository.Verify(x => x.GetFriendshipAsync(userId, friendId), Times.Once);
        _mockUserRepository.Verify(x => x.GetByIdAsync(friendId), Times.Once);
    }

    [Fact]
    public async Task GetFriendAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var friendId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.GetFriendAsync(Guid.Empty, friendId);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockFriendRepository.Verify(x => x.GetFriendshipAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetFriendAsync_WithEmptyFriendId_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.GetFriendAsync(userId, Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Friend ID cannot be empty.*");
        _mockFriendRepository.Verify(x => x.GetFriendshipAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetFriendAsync_WithNonExistentFriendship_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();

        _mockFriendRepository.Setup(x => x.GetFriendshipAsync(userId, friendId))
            .ReturnsAsync((Friendship?)null);

        // Act
        var act = async () => await _sut.GetFriendAsync(userId, friendId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Friend not found.");
        _mockFriendRepository.Verify(x => x.GetFriendshipAsync(userId, friendId), Times.Once);
        _mockUserRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetFriendAsync_WithPendingFriendship_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();
        var friendship = CreateTestFriendship(userId, friendId, FriendshipStatus.Pending);

        _mockFriendRepository.Setup(x => x.GetFriendshipAsync(userId, friendId))
            .ReturnsAsync(friendship);

        // Act
        var act = async () => await _sut.GetFriendAsync(userId, friendId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Friend not found.");
        _mockFriendRepository.Verify(x => x.GetFriendshipAsync(userId, friendId), Times.Once);
        _mockUserRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetFriendAsync_WithNonExistentFriendProfile_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();
        var friendship = CreateTestFriendship(userId, friendId, FriendshipStatus.Accepted);

        _mockFriendRepository.Setup(x => x.GetFriendshipAsync(userId, friendId))
            .ReturnsAsync(friendship);
        _mockUserRepository.Setup(x => x.GetByIdAsync(friendId))
            .ReturnsAsync((User?)null);

        // Act
        var act = async () => await _sut.GetFriendAsync(userId, friendId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"Friend profile not found: {friendId}");
        _mockUserRepository.Verify(x => x.GetByIdAsync(friendId), Times.Once);
    }

    #endregion

    #region CancelRequestAsync Tests

    [Fact]
    public async Task CancelRequestAsync_WithValidRequest_CancelsRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var requestId = Guid.NewGuid();

        _mockFriendRepository.Setup(x => x.CancelRequestAsync(requestId, userId))
            .Returns(Task.CompletedTask);

        // Act
        await _sut.CancelRequestAsync(userId, requestId);

        // Assert
        _mockFriendRepository.Verify(x => x.CancelRequestAsync(requestId, userId), Times.Once);
    }

    [Fact]
    public async Task CancelRequestAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var requestId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.CancelRequestAsync(Guid.Empty, requestId);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockFriendRepository.Verify(x => x.CancelRequestAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task CancelRequestAsync_WithEmptyRequestId_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.CancelRequestAsync(userId, Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Request ID cannot be empty.*");
        _mockFriendRepository.Verify(x => x.CancelRequestAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task CancelRequestAsync_WhenRequestNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var requestId = Guid.NewGuid();

        _mockFriendRepository.Setup(x => x.CancelRequestAsync(requestId, userId))
            .ThrowsAsync(new KeyNotFoundException($"Friend request not found: {requestId}"));

        // Act
        var act = async () => await _sut.CancelRequestAsync(userId, requestId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"Friend request not found: {requestId}");
        _mockFriendRepository.Verify(x => x.CancelRequestAsync(requestId, userId), Times.Once);
    }

    [Fact]
    public async Task CancelRequestAsync_WhenNotRequester_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var requestId = Guid.NewGuid();

        _mockFriendRepository.Setup(x => x.CancelRequestAsync(requestId, userId))
            .ThrowsAsync(new UnauthorizedAccessException("Only the requester can cancel this request."));

        // Act
        var act = async () => await _sut.CancelRequestAsync(userId, requestId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Only the requester can cancel this request.");
        _mockFriendRepository.Verify(x => x.CancelRequestAsync(requestId, userId), Times.Once);
    }

    [Fact]
    public async Task CancelRequestAsync_WhenRequestNotPending_ThrowsInvalidOperationException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var requestId = Guid.NewGuid();

        _mockFriendRepository.Setup(x => x.CancelRequestAsync(requestId, userId))
            .ThrowsAsync(new InvalidOperationException("Cannot cancel request with status: accepted"));

        // Act
        var act = async () => await _sut.CancelRequestAsync(userId, requestId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Cannot cancel request with status: accepted");
        _mockFriendRepository.Verify(x => x.CancelRequestAsync(requestId, userId), Times.Once);
    }

    #endregion

    #region GetFriendStepsAsync - Additional Edge Cases

    [Fact]
    public async Task GetFriendStepsAsync_WithNoStepData_ReturnsZeroSteps()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();
        var friendship = CreateTestFriendship(userId, friendId, FriendshipStatus.Accepted);
        var friend = CreateTestUser(friendId, "Friend User");

        _mockFriendRepository.Setup(x => x.GetFriendshipAsync(userId, friendId))
            .ReturnsAsync(friendship);
        _mockUserRepository.Setup(x => x.GetByIdAsync(friendId))
            .ReturnsAsync(friend);
        _mockStepRepository.Setup(x => x.GetDailySummariesAsync(friendId, It.IsAny<Api.Common.Models.DateRange>()))
            .ReturnsAsync(new List<Api.Steps.DailyStepSummary>());

        // Act
        var result = await _sut.GetFriendStepsAsync(userId, friendId);

        // Assert
        result.Should().NotBeNull();
        result.FriendId.Should().Be(friendId);
        result.DisplayName.Should().Be("Friend User");
        result.TodaySteps.Should().Be(0);
        result.WeeklySteps.Should().Be(0);
    }

    [Fact]
    public async Task GetFriendStepsAsync_WithRejectedFriendship_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();
        var friendship = CreateTestFriendship(userId, friendId, FriendshipStatus.Rejected);

        _mockFriendRepository.Setup(x => x.GetFriendshipAsync(userId, friendId))
            .ReturnsAsync(friendship);

        // Act
        var act = async () => await _sut.GetFriendStepsAsync(userId, friendId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("You can only view steps of accepted friends.");
    }

    #endregion

    #region Helper Methods

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

    private static Friendship CreateTestFriendship(Guid requesterId, Guid addresseeId, FriendshipStatus status)
    {
        return new Friendship
        {
            Id = Guid.NewGuid(),
            RequesterId = requesterId,
            AddresseeId = addresseeId,
            Status = status,
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            AcceptedAt = status == FriendshipStatus.Accepted ? DateTime.UtcNow.AddDays(-4) : null
        };
    }

    #endregion
}
