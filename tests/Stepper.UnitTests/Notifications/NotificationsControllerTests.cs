using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Stepper.Api.Common.Models;
using Stepper.Api.Notifications;
using Stepper.Api.Notifications.DTOs;

namespace Stepper.UnitTests.Notifications;

public class NotificationsControllerTests
{
    private readonly Mock<INotificationService> _mockService;
    private readonly NotificationsController _sut;

    public NotificationsControllerTests()
    {
        _mockService = new Mock<INotificationService>();
        _sut = new NotificationsController(_mockService.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullService_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new NotificationsController(null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region GetAll Tests

    [Fact]
    public async Task GetAll_WithAuthenticatedUser_ReturnsOkWithNotifications()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var listResponse = CreateTestListResponse(3);
        SetupAuthenticatedUser(userId);

        _mockService.Setup(x => x.GetAllAsync(userId, 20, 0))
            .ReturnsAsync(listResponse);

        // Act
        var result = await _sut.GetAll();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<NotificationListResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.Items.Should().HaveCount(3);
        _mockService.Verify(x => x.GetAllAsync(userId, 20, 0), Times.Once);
    }

    [Fact]
    public async Task GetAll_WithCustomPagination_PassesPaginationToService()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var listResponse = CreateTestListResponse(5);
        SetupAuthenticatedUser(userId);

        _mockService.Setup(x => x.GetAllAsync(userId, 10, 20))
            .ReturnsAsync(listResponse);

        // Act
        var result = await _sut.GetAll(limit: 10, offset: 20);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        _mockService.Verify(x => x.GetAllAsync(userId, 10, 20), Times.Once);
    }

    [Fact]
    public async Task GetAll_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetAll();

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<NotificationListResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockService.Verify(x => x.GetAllAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    #endregion

    #region GetUnreadCount Tests

    [Fact]
    public async Task GetUnreadCount_WithAuthenticatedUser_ReturnsOkWithCount()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var countResponse = new UnreadCountResponse { Count = 5 };
        SetupAuthenticatedUser(userId);

        _mockService.Setup(x => x.GetUnreadCountAsync(userId))
            .ReturnsAsync(countResponse);

        // Act
        var result = await _sut.GetUnreadCount();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<UnreadCountResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.Count.Should().Be(5);
        _mockService.Verify(x => x.GetUnreadCountAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetUnreadCount_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetUnreadCount();

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<UnreadCountResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockService.Verify(x => x.GetUnreadCountAsync(It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region MarkAsRead Tests

    [Fact]
    public async Task MarkAsRead_WithValidId_ReturnsNoContent()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var notificationId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockService.Setup(x => x.MarkAsReadAsync(userId, notificationId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.MarkAsRead(notificationId);

        // Assert
        result.Should().NotBeNull();
        result.Result.Should().BeOfType<NoContentResult>();
        _mockService.Verify(x => x.MarkAsReadAsync(userId, notificationId), Times.Once);
    }

    [Fact]
    public async Task MarkAsRead_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var notificationId = Guid.NewGuid();
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.MarkAsRead(notificationId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockService.Verify(x => x.MarkAsReadAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task MarkAsRead_WithEmptyId_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        // Act
        var result = await _sut.MarkAsRead(Guid.Empty);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Notification ID cannot be empty.");
        _mockService.Verify(x => x.MarkAsReadAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region MarkAllAsRead Tests

    [Fact]
    public async Task MarkAllAsRead_WithAuthenticatedUser_ReturnsNoContent()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockService.Setup(x => x.MarkAllAsReadAsync(userId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.MarkAllAsRead();

        // Assert
        result.Should().NotBeNull();
        result.Result.Should().BeOfType<NoContentResult>();
        _mockService.Verify(x => x.MarkAllAsReadAsync(userId), Times.Once);
    }

    [Fact]
    public async Task MarkAllAsRead_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.MarkAllAsRead();

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockService.Verify(x => x.MarkAllAsReadAsync(It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region Delete Tests

    [Fact]
    public async Task Delete_WithValidId_ReturnsNoContent()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var notificationId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockService.Setup(x => x.DeleteAsync(userId, notificationId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.Delete(notificationId);

        // Assert
        result.Should().NotBeNull();
        result.Result.Should().BeOfType<NoContentResult>();
        _mockService.Verify(x => x.DeleteAsync(userId, notificationId), Times.Once);
    }

    [Fact]
    public async Task Delete_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var notificationId = Guid.NewGuid();
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.Delete(notificationId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockService.Verify(x => x.DeleteAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task Delete_WithEmptyId_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        // Act
        var result = await _sut.Delete(Guid.Empty);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Notification ID cannot be empty.");
        _mockService.Verify(x => x.DeleteAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region Helper Methods

    private void SetupAuthenticatedUser(Guid userId)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    private void SetupUnauthenticatedUser()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity());

        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    private static NotificationListResponse CreateTestListResponse(int count)
    {
        var items = Enumerable.Range(0, count)
            .Select(_ => new NotificationResponse
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
                Type = "general",
                Title = "Test Notification",
                Message = "This is a test notification.",
                IsRead = false,
                Data = null,
                CreatedAt = DateTime.UtcNow.AddMinutes(-30)
            })
            .ToList();

        return new NotificationListResponse
        {
            Items = items,
            TotalCount = count * 2,
            UnreadCount = count,
            HasMore = true
        };
    }

    #endregion
}
