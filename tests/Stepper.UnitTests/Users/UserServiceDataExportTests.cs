using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using Stepper.Api.Activity;
using Stepper.Api.Common.Database;
using Stepper.Api.Friends;
using Stepper.Api.Groups;
using Stepper.Api.Notifications;
using Stepper.Api.Steps;
using Stepper.Api.Users;
using Stepper.Api.Users.DTOs;

namespace Stepper.UnitTests.Users;

/// <summary>
/// Unit tests for UserService.ExportUserDataAsync method.
/// Tests GDPR data portability feature.
/// </summary>
public class UserServiceDataExportTests
{
    private readonly Mock<IUserRepository> _mockUserRepository;
    private readonly Mock<IUserPreferencesRepository> _mockPreferencesRepository;
    private readonly Mock<IStepRepository> _mockStepRepository;
    private readonly Mock<IFriendRepository> _mockFriendRepository;
    private readonly Mock<IGroupRepository> _mockGroupRepository;
    private readonly Mock<IActivityRepository> _mockActivityRepository;
    private readonly Mock<INotificationRepository> _mockNotificationRepository;
    private readonly Mock<ISupabaseClientFactory> _mockClientFactory;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly UserService _sut;

    public UserServiceDataExportTests()
    {
        _mockUserRepository = new Mock<IUserRepository>();
        _mockPreferencesRepository = new Mock<IUserPreferencesRepository>();
        _mockStepRepository = new Mock<IStepRepository>();
        _mockFriendRepository = new Mock<IFriendRepository>();
        _mockGroupRepository = new Mock<IGroupRepository>();
        _mockActivityRepository = new Mock<IActivityRepository>();
        _mockNotificationRepository = new Mock<INotificationRepository>();
        _mockClientFactory = new Mock<ISupabaseClientFactory>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();

        _sut = new UserService(
            _mockUserRepository.Object,
            _mockPreferencesRepository.Object,
            _mockStepRepository.Object,
            _mockFriendRepository.Object,
            _mockGroupRepository.Object,
            _mockActivityRepository.Object,
            _mockNotificationRepository.Object,
            _mockClientFactory.Object,
            _mockHttpContextAccessor.Object);
    }

    #region ExportUserDataAsync Tests

    [Fact]
    public async Task ExportUserDataAsync_WithValidUserId_ReturnsCompleteExport()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        var preferences = CreateTestPreferences(userId);
        var stepSummaries = CreateTestStepSummaries();
        var friendships = CreateTestFriendships(userId);
        var friendUsers = CreateFriendUsers(friendships, userId);
        var groupMemberships = CreateTestGroupMemberships();
        var activityItems = CreateTestActivityItems();
        var notifications = CreateTestNotifications();

        SetupMocksForCompleteExport(
            userId, user, preferences, stepSummaries,
            friendships, friendUsers, groupMemberships,
            activityItems, notifications);

        // Act
        var result = await _sut.ExportUserDataAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.ExportMetadata.Should().NotBeNull();
        result.Profile.Should().NotBeNull();
        result.Preferences.Should().NotBeNull();
        result.StepHistory.Should().NotBeNull();
        result.Friendships.Should().NotBeNull();
        result.GroupMemberships.Should().NotBeNull();
        result.ActivityFeed.Should().NotBeNull();
        result.Notifications.Should().NotBeNull();
    }

    [Fact]
    public async Task ExportUserDataAsync_SetsCorrectMetadata()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        var beforeExport = DateTime.UtcNow;

        SetupMinimalMocks(userId, user);

        // Act
        var result = await _sut.ExportUserDataAsync(userId);

        // Assert
        result.ExportMetadata.UserId.Should().Be(userId);
        result.ExportMetadata.DataFormat.Should().Be("stepper_export_v1");
        result.ExportMetadata.ExportedAt.Should().BeOnOrAfter(beforeExport);
        result.ExportMetadata.ExportedAt.Should().BeOnOrBefore(DateTime.UtcNow);
    }

    [Fact]
    public async Task ExportUserDataAsync_WithUserProfile_MapsProfileCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        user.DisplayName = "Test Export User";
        user.AvatarUrl = "https://example.com/avatar.png";
        user.QrCodeId = "qr-test-123";
        user.OnboardingCompleted = true;

        SetupMinimalMocks(userId, user);

        // Act
        var result = await _sut.ExportUserDataAsync(userId);

        // Assert
        result.Profile.Id.Should().Be(userId);
        result.Profile.DisplayName.Should().Be("Test Export User");
        result.Profile.AvatarUrl.Should().Be("https://example.com/avatar.png");
        result.Profile.QrCodeId.Should().Be("qr-test-123");
        result.Profile.OnboardingCompleted.Should().BeTrue();
        result.Profile.CreatedAt.Should().Be(user.CreatedAt);
        result.Profile.Email.Should().BeNull(); // Email is in Supabase Auth, not accessible
    }

    [Fact]
    public async Task ExportUserDataAsync_WithPreferences_MapsPreferencesCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        var preferences = CreateTestPreferences(userId);
        preferences.DailyStepGoal = 12000;
        preferences.Units = "imperial";
        preferences.NotificationsEnabled = true;
        preferences.PrivacyProfileVisibility = "friends";

        SetupMinimalMocks(userId, user);
        _mockPreferencesRepository.Setup(x => x.GetByUserIdAsync(userId))
            .ReturnsAsync(preferences);

        // Act
        var result = await _sut.ExportUserDataAsync(userId);

        // Assert
        result.Preferences.DailyStepGoal.Should().Be(12000);
        result.Preferences.Units.Should().Be("imperial");
        result.Preferences.NotificationsEnabled.Should().BeTrue();
        result.Preferences.PrivacyProfileVisibility.Should().Be("friends");
    }

    [Fact]
    public async Task ExportUserDataAsync_WithNoPreferences_ReturnsDefaultPreferences()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);

        SetupMinimalMocks(userId, user);
        _mockPreferencesRepository.Setup(x => x.GetByUserIdAsync(userId))
            .ReturnsAsync((UserPreferencesEntity?)null);

        // Act
        var result = await _sut.ExportUserDataAsync(userId);

        // Assert
        result.Preferences.DailyStepGoal.Should().Be(10000);
        result.Preferences.Units.Should().Be("metric");
        result.Preferences.NotificationsEnabled.Should().BeTrue();
        result.Preferences.PrivacyProfileVisibility.Should().Be("public");
        result.Preferences.PrivacyFindMe.Should().Be("public");
        result.Preferences.PrivacyShowSteps.Should().Be("partial");
    }

    [Fact]
    public async Task ExportUserDataAsync_WithNoStepEntries_ReturnsEmptyStepHistory()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);

        SetupMinimalMocks(userId, user);
        _mockStepRepository.Setup(x => x.GetAllDailySummariesAsync(userId))
            .ReturnsAsync(new List<DailyStepSummary>());

        // Act
        var result = await _sut.ExportUserDataAsync(userId);

        // Assert
        result.StepHistory.Should().NotBeNull();
        result.StepHistory.Should().BeEmpty();
    }

    [Fact]
    public async Task ExportUserDataAsync_WithStepEntries_MapsStepHistoryCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        var stepSummaries = new List<DailyStepSummary>
        {
            new DailyStepSummary
            {
                Date = DateOnly.FromDateTime(DateTime.Today),
                TotalSteps = 8500,
                TotalDistanceMeters = 6800.5
            },
            new DailyStepSummary
            {
                Date = DateOnly.FromDateTime(DateTime.Today.AddDays(-1)),
                TotalSteps = 10200,
                TotalDistanceMeters = 8160.0
            }
        };

        SetupMinimalMocks(userId, user);
        _mockStepRepository.Setup(x => x.GetAllDailySummariesAsync(userId))
            .ReturnsAsync(stepSummaries);

        // Act
        var result = await _sut.ExportUserDataAsync(userId);

        // Assert
        result.StepHistory.Should().HaveCount(2);
        result.StepHistory[0].StepCount.Should().Be(8500);
        result.StepHistory[0].DistanceMeters.Should().Be(6800.5);
        result.StepHistory[1].StepCount.Should().Be(10200);
    }

    [Fact]
    public async Task ExportUserDataAsync_WithNoFriends_ReturnsEmptyFriendships()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);

        SetupMinimalMocks(userId, user);
        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockFriendRepository.Setup(x => x.GetPendingRequestsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockFriendRepository.Setup(x => x.GetSentRequestsAsync(userId))
            .ReturnsAsync(new List<Friendship>());

        // Act
        var result = await _sut.ExportUserDataAsync(userId);

        // Assert
        result.Friendships.Should().NotBeNull();
        result.Friendships.Should().BeEmpty();
    }

    [Fact]
    public async Task ExportUserDataAsync_WithFriends_MapsFriendshipsCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        var friendship = new Friendship
        {
            Id = Guid.NewGuid(),
            RequesterId = userId,
            AddresseeId = friendId,
            Status = FriendshipStatus.Accepted,
            CreatedAt = DateTime.UtcNow.AddDays(-10)
        };
        var friendUser = new User
        {
            Id = friendId,
            DisplayName = "Friend User"
        };

        SetupMinimalMocks(userId, user);
        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(new List<Friendship> { friendship });
        _mockFriendRepository.Setup(x => x.GetPendingRequestsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockFriendRepository.Setup(x => x.GetSentRequestsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(new List<User> { friendUser });

        // Act
        var result = await _sut.ExportUserDataAsync(userId);

        // Assert
        result.Friendships.Should().HaveCount(1);
        result.Friendships[0].FriendId.Should().Be(friendId);
        result.Friendships[0].FriendDisplayName.Should().Be("Friend User");
        result.Friendships[0].Status.Should().Be("accepted");
        result.Friendships[0].InitiatedByMe.Should().BeTrue();
    }

    [Fact]
    public async Task ExportUserDataAsync_WithNoGroups_ReturnsEmptyGroupMemberships()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);

        SetupMinimalMocks(userId, user);
        _mockGroupRepository.Setup(x => x.GetUserGroupMembershipsWithDetailsAsync(userId))
            .ReturnsAsync(new List<(Group, MemberRole, DateTime)>());

        // Act
        var result = await _sut.ExportUserDataAsync(userId);

        // Assert
        result.GroupMemberships.Should().NotBeNull();
        result.GroupMemberships.Should().BeEmpty();
    }

    [Fact]
    public async Task ExportUserDataAsync_WithGroups_MapsGroupMembershipsCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        var group = new Group
        {
            Id = groupId,
            Name = "Test Group"
        };
        var joinedAt = DateTime.UtcNow.AddDays(-5);

        SetupMinimalMocks(userId, user);
        _mockGroupRepository.Setup(x => x.GetUserGroupMembershipsWithDetailsAsync(userId))
            .ReturnsAsync(new List<(Group, MemberRole, DateTime)>
            {
                (group, MemberRole.Member, joinedAt)
            });

        // Act
        var result = await _sut.ExportUserDataAsync(userId);

        // Assert
        result.GroupMemberships.Should().HaveCount(1);
        result.GroupMemberships[0].GroupId.Should().Be(groupId);
        result.GroupMemberships[0].GroupName.Should().Be("Test Group");
        result.GroupMemberships[0].Role.Should().Be("member");
        result.GroupMemberships[0].JoinedAt.Should().Be(joinedAt);
    }

    [Fact]
    public async Task ExportUserDataAsync_WithEmptyGuid_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.ExportUserDataAsync(Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
    }

    [Fact]
    public async Task ExportUserDataAsync_WithNonExistentUser_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockUserRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act
        var act = async () => await _sut.ExportUserDataAsync(userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"User profile not found for user ID: {userId}");
    }

    [Fact]
    public async Task ExportUserDataAsync_CallsAllRepositoriesInParallel()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);

        SetupMinimalMocks(userId, user);

        // Act
        await _sut.ExportUserDataAsync(userId);

        // Assert - Verify all data sources are queried
        _mockPreferencesRepository.Verify(x => x.GetByUserIdAsync(userId), Times.Once);
        _mockStepRepository.Verify(x => x.GetAllDailySummariesAsync(userId), Times.Once);
        _mockFriendRepository.Verify(x => x.GetFriendsAsync(userId), Times.Once);
        _mockGroupRepository.Verify(x => x.GetUserGroupMembershipsWithDetailsAsync(userId), Times.Once);
        _mockActivityRepository.Verify(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), It.IsAny<int>(), It.IsAny<int>()), Times.Once);
        _mockNotificationRepository.Verify(x => x.GetAllAsync(userId, It.IsAny<int>(), It.IsAny<int>()), Times.Once);
    }

    #endregion

    #region Helper Methods

    private void SetupMinimalMocks(Guid userId, User user)
    {
        _mockUserRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockPreferencesRepository.Setup(x => x.GetByUserIdAsync(userId))
            .ReturnsAsync(CreateTestPreferences(userId));
        _mockStepRepository.Setup(x => x.GetAllDailySummariesAsync(userId))
            .ReturnsAsync(new List<DailyStepSummary>());
        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockFriendRepository.Setup(x => x.GetPendingRequestsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockFriendRepository.Setup(x => x.GetSentRequestsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockGroupRepository.Setup(x => x.GetUserGroupMembershipsWithDetailsAsync(userId))
            .ReturnsAsync(new List<(Group, MemberRole, DateTime)>());
        _mockActivityRepository.Setup(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync(new List<ActivityItem>());
        _mockNotificationRepository.Setup(x => x.GetAllAsync(userId, It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync((new List<Notification>(), 0, false));
    }

    private void SetupMocksForCompleteExport(
        Guid userId,
        User user,
        UserPreferencesEntity preferences,
        List<DailyStepSummary> stepSummaries,
        List<Friendship> friendships,
        List<User> friendUsers,
        List<(Group, MemberRole, DateTime)> groupMemberships,
        List<ActivityItem> activityItems,
        List<Notification> notifications)
    {
        _mockUserRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(x => x.GetByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(friendUsers);
        _mockPreferencesRepository.Setup(x => x.GetByUserIdAsync(userId))
            .ReturnsAsync(preferences);
        _mockStepRepository.Setup(x => x.GetAllDailySummariesAsync(userId))
            .ReturnsAsync(stepSummaries);
        _mockFriendRepository.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(friendships);
        _mockFriendRepository.Setup(x => x.GetPendingRequestsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockFriendRepository.Setup(x => x.GetSentRequestsAsync(userId))
            .ReturnsAsync(new List<Friendship>());
        _mockGroupRepository.Setup(x => x.GetUserGroupMembershipsWithDetailsAsync(userId))
            .ReturnsAsync(groupMemberships);
        _mockActivityRepository.Setup(x => x.GetFeedAsync(userId, It.IsAny<List<Guid>>(), It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync(activityItems);
        _mockNotificationRepository.Setup(x => x.GetAllAsync(userId, It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync((notifications, notifications.Count, false));
    }

    private static User CreateTestUser(Guid userId)
    {
        return new User
        {
            Id = userId,
            DisplayName = "Test User",
            AvatarUrl = "https://example.com/avatar.jpg",
            QrCodeId = "qr-test-" + userId.ToString()[..8],
            OnboardingCompleted = true,
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };
    }

    private static UserPreferencesEntity CreateTestPreferences(Guid userId)
    {
        return new UserPreferencesEntity
        {
            Id = userId,
            DailyStepGoal = 10000,
            Units = "metric",
            NotificationsEnabled = true,
            NotifyDailyReminder = true,
            NotifyFriendRequests = true,
            NotifyFriendAccepted = true,
            NotifyGroupInvites = true,
            NotifyAchievements = true,
            PrivacyProfileVisibility = "public",
            PrivacyFindMe = "public",
            PrivacyShowSteps = "partial"
        };
    }

    private static List<DailyStepSummary> CreateTestStepSummaries()
    {
        return new List<DailyStepSummary>
        {
            new DailyStepSummary
            {
                Date = DateOnly.FromDateTime(DateTime.Today),
                TotalSteps = 8500,
                TotalDistanceMeters = 6800.5
            }
        };
    }

    private static List<Friendship> CreateTestFriendships(Guid userId)
    {
        var friendId = Guid.NewGuid();
        return new List<Friendship>
        {
            new Friendship
            {
                Id = Guid.NewGuid(),
                RequesterId = userId,
                AddresseeId = friendId,
                Status = FriendshipStatus.Accepted,
                CreatedAt = DateTime.UtcNow.AddDays(-10)
            }
        };
    }

    private static List<User> CreateFriendUsers(List<Friendship> friendships, Guid currentUserId)
    {
        return friendships.Select(f =>
        {
            var friendId = f.RequesterId == currentUserId ? f.AddresseeId : f.RequesterId;
            return new User
            {
                Id = friendId,
                DisplayName = "Friend User"
            };
        }).ToList();
    }

    private static List<(Group, MemberRole, DateTime)> CreateTestGroupMemberships()
    {
        return new List<(Group, MemberRole, DateTime)>
        {
            (new Group { Id = Guid.NewGuid(), Name = "Test Group" }, MemberRole.Member, DateTime.UtcNow.AddDays(-5))
        };
    }

    private static List<ActivityItem> CreateTestActivityItems()
    {
        return new List<ActivityItem>
        {
            new ActivityItem
            {
                Id = Guid.NewGuid(),
                Type = "friend_request_accepted",
                Message = "Jane accepted your friend request",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            }
        };
    }

    private static List<Notification> CreateTestNotifications()
    {
        return new List<Notification>
        {
            new Notification
            {
                Id = Guid.NewGuid(),
                Type = NotificationType.GoalAchieved,
                Title = "Goal Achieved",
                Message = "You reached your step goal!",
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                IsRead = false
            }
        };
    }

    #endregion
}
