using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Stepper.Api.Activity;
using Stepper.Api.Activity.DTOs;
using Stepper.Api.Common.Models;

namespace Stepper.UnitTests.Activity;

public class ActivityControllerTests
{
    private readonly Mock<IActivityService> _mockActivityService;
    private readonly ActivityController _sut;

    public ActivityControllerTests()
    {
        _mockActivityService = new Mock<IActivityService>();
        _sut = new ActivityController(_mockActivityService.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullActivityService_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new ActivityController(null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region GetFeed Tests

    [Fact]
    public async Task GetFeed_WithValidRequest_ReturnsOkWithFeed()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var feedResponse = CreateTestFeedResponse(2);
        SetupAuthenticatedUser(userId);

        _mockActivityService.Setup(x => x.GetFeedAsync(userId, 20, 0))
            .ReturnsAsync(feedResponse);

        // Act
        var result = await _sut.GetFeed();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<ActivityFeedResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.Items.Should().HaveCount(2);
        response.Data.TotalCount.Should().Be(2);
        response.Data.HasMore.Should().BeFalse();

        _mockActivityService.Verify(x => x.GetFeedAsync(userId, 20, 0), Times.Once);
    }

    [Fact]
    public async Task GetFeed_WithPaginationParams_PassesParamsToService()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var limit = 50;
        var offset = 10;
        var feedResponse = CreateTestFeedResponse(10, hasMore: true, totalCount: 100);
        SetupAuthenticatedUser(userId);

        _mockActivityService.Setup(x => x.GetFeedAsync(userId, limit, offset))
            .ReturnsAsync(feedResponse);

        // Act
        var result = await _sut.GetFeed(limit, offset);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<ActivityFeedResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.Items.Should().HaveCount(10);
        response.Data.TotalCount.Should().Be(100);
        response.Data.HasMore.Should().BeTrue();

        _mockActivityService.Verify(x => x.GetFeedAsync(userId, limit, offset), Times.Once);
    }

    [Fact]
    public async Task GetFeed_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetFeed();

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<ActivityFeedResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");

        _mockActivityService.Verify(x => x.GetFeedAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task GetFeed_WhenServiceThrowsArgumentException_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockActivityService.Setup(x => x.GetFeedAsync(userId, 20, 0))
            .ThrowsAsync(new ArgumentException("User ID cannot be empty."));

        // Act
        var result = await _sut.GetFeed();

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<ActivityFeedResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User ID cannot be empty.");
    }

    [Fact]
    public async Task GetFeed_WhenServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockActivityService.Setup(x => x.GetFeedAsync(userId, 20, 0))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _sut.GetFeed();

        // Assert
        result.Should().NotBeNull();
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        var response = statusCodeResult.Value.Should().BeOfType<ApiResponse<ActivityFeedResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("An error occurred: Database connection failed");
    }

    [Fact]
    public async Task GetFeed_WithEmptyFeed_ReturnsOkWithEmptyItems()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var feedResponse = new ActivityFeedResponse(new List<ActivityItemResponse>(), 0, false);
        SetupAuthenticatedUser(userId);

        _mockActivityService.Setup(x => x.GetFeedAsync(userId, 20, 0))
            .ReturnsAsync(feedResponse);

        // Act
        var result = await _sut.GetFeed();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<ActivityFeedResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.Items.Should().BeEmpty();
        response.Data.TotalCount.Should().Be(0);
        response.Data.HasMore.Should().BeFalse();
    }

    [Theory]
    [InlineData(1, 0)]
    [InlineData(10, 0)]
    [InlineData(100, 0)]
    [InlineData(20, 10)]
    [InlineData(50, 100)]
    public async Task GetFeed_WithVariousPaginationParams_ReturnsOk(int limit, int offset)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var feedResponse = CreateTestFeedResponse(Math.Min(limit, 5));
        SetupAuthenticatedUser(userId);

        _mockActivityService.Setup(x => x.GetFeedAsync(userId, limit, offset))
            .ReturnsAsync(feedResponse);

        // Act
        var result = await _sut.GetFeed(limit, offset);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<ActivityFeedResponse>>().Subject;
        response.Success.Should().BeTrue();

        _mockActivityService.Verify(x => x.GetFeedAsync(userId, limit, offset), Times.Once);
    }

    [Fact]
    public async Task GetFeed_WithDefaultParams_UsesDefaultValues()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var feedResponse = CreateTestFeedResponse(5);
        SetupAuthenticatedUser(userId);

        _mockActivityService.Setup(x => x.GetFeedAsync(userId, 20, 0))
            .ReturnsAsync(feedResponse);

        // Act
        var result = await _sut.GetFeed();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<ActivityFeedResponse>>().Subject;
        response.Success.Should().BeTrue();

        _mockActivityService.Verify(x => x.GetFeedAsync(userId, 20, 0), Times.Once);
    }

    #endregion

    #region Helper Methods

    private void SetupAuthenticatedUser(Guid userId)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString())
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

    private static ActivityFeedResponse CreateTestFeedResponse(int itemCount, bool hasMore = false, int? totalCount = null)
    {
        var items = new List<ActivityItemResponse>();
        for (var i = 0; i < itemCount; i++)
        {
            items.Add(new ActivityItemResponse(
                Id: Guid.NewGuid(),
                UserId: Guid.NewGuid(),
                UserName: $"User {i + 1}",
                UserAvatarUrl: null,
                Type: "steps_recorded",
                Message: $"Recorded {1000 * (i + 1)} steps",
                Metadata: null,
                CreatedAt: DateTime.UtcNow.AddMinutes(-i),
                RelatedUserId: null,
                RelatedGroupId: null
            ));
        }

        return new ActivityFeedResponse(items, totalCount ?? itemCount, hasMore);
    }

    #endregion
}
