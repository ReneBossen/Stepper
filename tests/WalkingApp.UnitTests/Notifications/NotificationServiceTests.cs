using FluentAssertions;
using Moq;
using WalkingApp.Api.Notifications;
using WalkingApp.Api.Notifications.DTOs;

namespace WalkingApp.UnitTests.Notifications;

public class NotificationServiceTests
{
    private readonly Mock<INotificationRepository> _mockRepository;
    private readonly NotificationService _sut;

    public NotificationServiceTests()
    {
        _mockRepository = new Mock<INotificationRepository>();
        _sut = new NotificationService(_mockRepository.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullRepository_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new NotificationService(null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region GetAllAsync Tests

    [Fact]
    public async Task GetAllAsync_WithValidParams_ReturnsNotificationList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var notifications = CreateTestNotifications(userId, 3);
        var totalCount = 10;
        var unreadCount = 5;

        _mockRepository.Setup(x => x.GetAllAsync(userId, 20, 0))
            .ReturnsAsync((notifications, totalCount, unreadCount));

        // Act
        var result = await _sut.GetAllAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(3);
        result.TotalCount.Should().Be(totalCount);
        result.UnreadCount.Should().Be(unreadCount);
        result.HasMore.Should().BeTrue();
        _mockRepository.Verify(x => x.GetAllAsync(userId, 20, 0), Times.Once);
    }

    [Fact]
    public async Task GetAllAsync_WithCustomPagination_UsesPaginationParams()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var notifications = CreateTestNotifications(userId, 5);
        var limit = 10;
        var offset = 20;

        _mockRepository.Setup(x => x.GetAllAsync(userId, limit, offset))
            .ReturnsAsync((notifications, 100, 50));

        // Act
        var result = await _sut.GetAllAsync(userId, limit, offset);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(5);
        _mockRepository.Verify(x => x.GetAllAsync(userId, limit, offset), Times.Once);
    }

    [Fact]
    public async Task GetAllAsync_WithLimitExceedingMax_NormalizesToMaxLimit()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var notifications = new List<Notification>();

        _mockRepository.Setup(x => x.GetAllAsync(userId, 100, 0))
            .ReturnsAsync((notifications, 0, 0));

        // Act
        await _sut.GetAllAsync(userId, 200); // Exceeds max of 100

        // Assert
        _mockRepository.Verify(x => x.GetAllAsync(userId, 100, 0), Times.Once);
    }

    [Fact]
    public async Task GetAllAsync_WithNegativeLimit_UsesDefaultLimit()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var notifications = new List<Notification>();

        _mockRepository.Setup(x => x.GetAllAsync(userId, 20, 0))
            .ReturnsAsync((notifications, 0, 0));

        // Act
        await _sut.GetAllAsync(userId, -5);

        // Assert
        _mockRepository.Verify(x => x.GetAllAsync(userId, 20, 0), Times.Once);
    }

    [Fact]
    public async Task GetAllAsync_WithNegativeOffset_NormalizesToZero()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var notifications = new List<Notification>();

        _mockRepository.Setup(x => x.GetAllAsync(userId, 20, 0))
            .ReturnsAsync((notifications, 0, 0));

        // Act
        await _sut.GetAllAsync(userId, 20, -10);

        // Assert
        _mockRepository.Verify(x => x.GetAllAsync(userId, 20, 0), Times.Once);
    }

    [Fact]
    public async Task GetAllAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.GetAllAsync(Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetAllAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task GetAllAsync_WhenNoMoreItems_HasMoreIsFalse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var notifications = CreateTestNotifications(userId, 3);
        var totalCount = 3;

        _mockRepository.Setup(x => x.GetAllAsync(userId, 20, 0))
            .ReturnsAsync((notifications, totalCount, 0));

        // Act
        var result = await _sut.GetAllAsync(userId);

        // Assert
        result.HasMore.Should().BeFalse();
    }

    [Fact]
    public async Task GetAllAsync_MapsNotificationTypeCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var notifications = new List<Notification>
        {
            CreateTestNotification(userId, NotificationType.FriendRequest),
            CreateTestNotification(userId, NotificationType.FriendAccepted),
            CreateTestNotification(userId, NotificationType.GroupInvite),
            CreateTestNotification(userId, NotificationType.GoalAchieved),
            CreateTestNotification(userId, NotificationType.General)
        };

        _mockRepository.Setup(x => x.GetAllAsync(userId, 20, 0))
            .ReturnsAsync((notifications, 5, 0));

        // Act
        var result = await _sut.GetAllAsync(userId);

        // Assert
        result.Items[0].Type.Should().Be("friend_request");
        result.Items[1].Type.Should().Be("friend_accepted");
        result.Items[2].Type.Should().Be("group_invite");
        result.Items[3].Type.Should().Be("goal_achieved");
        result.Items[4].Type.Should().Be("general");
    }

    #endregion

    #region GetUnreadCountAsync Tests

    [Fact]
    public async Task GetUnreadCountAsync_WithValidUserId_ReturnsCount()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var expectedCount = 7;

        _mockRepository.Setup(x => x.GetUnreadCountAsync(userId))
            .ReturnsAsync(expectedCount);

        // Act
        var result = await _sut.GetUnreadCountAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Count.Should().Be(expectedCount);
        _mockRepository.Verify(x => x.GetUnreadCountAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetUnreadCountAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.GetUnreadCountAsync(Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetUnreadCountAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetUnreadCountAsync_WithNoUnreadNotifications_ReturnsZero()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _mockRepository.Setup(x => x.GetUnreadCountAsync(userId))
            .ReturnsAsync(0);

        // Act
        var result = await _sut.GetUnreadCountAsync(userId);

        // Assert
        result.Count.Should().Be(0);
    }

    #endregion

    #region MarkAsReadAsync Tests

    [Fact]
    public async Task MarkAsReadAsync_WithValidIds_MarksNotificationAsRead()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var notificationId = Guid.NewGuid();
        var notification = CreateTestNotification(userId, isRead: false);
        notification.Id = notificationId;

        _mockRepository.Setup(x => x.GetByIdAsync(notificationId))
            .ReturnsAsync(notification);
        _mockRepository.Setup(x => x.MarkAsReadAsync(notificationId))
            .ReturnsAsync(true);

        // Act
        await _sut.MarkAsReadAsync(userId, notificationId);

        // Assert
        _mockRepository.Verify(x => x.GetByIdAsync(notificationId), Times.Once);
        _mockRepository.Verify(x => x.MarkAsReadAsync(notificationId), Times.Once);
    }

    [Fact]
    public async Task MarkAsReadAsync_WhenAlreadyRead_DoesNotCallRepository()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var notificationId = Guid.NewGuid();
        var notification = CreateTestNotification(userId, isRead: true);
        notification.Id = notificationId;

        _mockRepository.Setup(x => x.GetByIdAsync(notificationId))
            .ReturnsAsync(notification);

        // Act
        await _sut.MarkAsReadAsync(userId, notificationId);

        // Assert
        _mockRepository.Verify(x => x.GetByIdAsync(notificationId), Times.Once);
        _mockRepository.Verify(x => x.MarkAsReadAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task MarkAsReadAsync_WithNotFoundNotification_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var notificationId = Guid.NewGuid();

        _mockRepository.Setup(x => x.GetByIdAsync(notificationId))
            .ReturnsAsync((Notification?)null);

        // Act
        var act = async () => await _sut.MarkAsReadAsync(userId, notificationId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"Notification not found with ID: {notificationId}");
        _mockRepository.Verify(x => x.MarkAsReadAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task MarkAsReadAsync_WithNotOwner_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var notificationId = Guid.NewGuid();
        var notification = CreateTestNotification(otherUserId, isRead: false);
        notification.Id = notificationId;

        _mockRepository.Setup(x => x.GetByIdAsync(notificationId))
            .ReturnsAsync(notification);

        // Act
        var act = async () => await _sut.MarkAsReadAsync(userId, notificationId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("You do not have permission to access this notification.");
        _mockRepository.Verify(x => x.MarkAsReadAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task MarkAsReadAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var notificationId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.MarkAsReadAsync(Guid.Empty, notificationId);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task MarkAsReadAsync_WithEmptyNotificationId_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.MarkAsReadAsync(userId, Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Notification ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region MarkAllAsReadAsync Tests

    [Fact]
    public async Task MarkAllAsReadAsync_WithValidUserId_MarksAllAsRead()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _mockRepository.Setup(x => x.MarkAllAsReadAsync(userId))
            .ReturnsAsync(5);

        // Act
        await _sut.MarkAllAsReadAsync(userId);

        // Assert
        _mockRepository.Verify(x => x.MarkAllAsReadAsync(userId), Times.Once);
    }

    [Fact]
    public async Task MarkAllAsReadAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.MarkAllAsReadAsync(Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.MarkAllAsReadAsync(It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region DeleteAsync Tests

    [Fact]
    public async Task DeleteAsync_WithValidIds_DeletesNotification()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var notificationId = Guid.NewGuid();
        var notification = CreateTestNotification(userId);
        notification.Id = notificationId;

        _mockRepository.Setup(x => x.GetByIdAsync(notificationId))
            .ReturnsAsync(notification);
        _mockRepository.Setup(x => x.DeleteAsync(notificationId))
            .ReturnsAsync(true);

        // Act
        await _sut.DeleteAsync(userId, notificationId);

        // Assert
        _mockRepository.Verify(x => x.GetByIdAsync(notificationId), Times.Once);
        _mockRepository.Verify(x => x.DeleteAsync(notificationId), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_WithNotFoundNotification_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var notificationId = Guid.NewGuid();

        _mockRepository.Setup(x => x.GetByIdAsync(notificationId))
            .ReturnsAsync((Notification?)null);

        // Act
        var act = async () => await _sut.DeleteAsync(userId, notificationId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"Notification not found with ID: {notificationId}");
        _mockRepository.Verify(x => x.DeleteAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_WithNotOwner_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var notificationId = Guid.NewGuid();
        var notification = CreateTestNotification(otherUserId);
        notification.Id = notificationId;

        _mockRepository.Setup(x => x.GetByIdAsync(notificationId))
            .ReturnsAsync(notification);

        // Act
        var act = async () => await _sut.DeleteAsync(userId, notificationId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("You do not have permission to access this notification.");
        _mockRepository.Verify(x => x.DeleteAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var notificationId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.DeleteAsync(Guid.Empty, notificationId);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_WithEmptyNotificationId_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.DeleteAsync(userId, Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Notification ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region Helper Methods

    private static List<Notification> CreateTestNotifications(Guid userId, int count)
    {
        return Enumerable.Range(0, count)
            .Select(_ => CreateTestNotification(userId))
            .ToList();
    }

    private static Notification CreateTestNotification(
        Guid userId,
        NotificationType type = NotificationType.General,
        bool isRead = false)
    {
        return new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = type,
            Title = "Test Notification",
            Message = "This is a test notification message.",
            IsRead = isRead,
            Data = null,
            CreatedAt = DateTime.UtcNow.AddMinutes(-30),
            UpdatedAt = DateTime.UtcNow.AddMinutes(-30)
        };
    }

    #endregion
}
