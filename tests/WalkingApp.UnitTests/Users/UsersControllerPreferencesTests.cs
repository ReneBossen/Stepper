using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WalkingApp.Api.Common.Models;
using WalkingApp.Api.Users;
using WalkingApp.Api.Users.DTOs;

namespace WalkingApp.UnitTests.Users;

/// <summary>
/// Unit tests for UsersController preferences-related endpoints.
/// </summary>
public class UsersControllerPreferencesTests
{
    private readonly Mock<IUserService> _mockUserService;
    private readonly UsersController _sut;

    public UsersControllerPreferencesTests()
    {
        _mockUserService = new Mock<IUserService>();
        _sut = new UsersController(_mockUserService.Object);
    }

    #region GetMyPreferences Tests

    [Fact]
    public async Task GetMyPreferences_WithAuthenticatedUser_ReturnsOkWithPreferences()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var preferences = CreateTestPreferencesResponse();
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.GetPreferencesAsync(userId))
            .ReturnsAsync(preferences);

        // Act
        var result = await _sut.GetMyPreferences();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<UserPreferencesResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.DailyStepGoal.Should().Be(preferences.DailyStepGoal);
        response.Data.DistanceUnit.Should().Be(preferences.DistanceUnit);
        response.Data.NotificationsEnabled.Should().Be(preferences.NotificationsEnabled);
        response.Data.PrivateProfile.Should().Be(preferences.PrivateProfile);
        _mockUserService.Verify(x => x.GetPreferencesAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetMyPreferences_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetMyPreferences();

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<UserPreferencesResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockUserService.Verify(x => x.GetPreferencesAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetMyPreferences_WithNonExistentUser_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.GetPreferencesAsync(userId))
            .ThrowsAsync(new KeyNotFoundException($"User profile not found for user ID: {userId}"));

        // Act
        var result = await _sut.GetMyPreferences();

        // Assert
        result.Should().NotBeNull();
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<ApiResponse<UserPreferencesResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain($"User profile not found for user ID: {userId}");
    }

    [Fact]
    public async Task GetMyPreferences_WhenServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.GetPreferencesAsync(userId))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _sut.GetMyPreferences();

        // Assert
        result.Should().NotBeNull();
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        var response = statusCodeResult.Value.Should().BeOfType<ApiResponse<UserPreferencesResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("An error occurred: Database connection failed");
    }

    #endregion

    #region UpdateMyPreferences Tests

    [Fact]
    public async Task UpdateMyPreferences_WithValidRequest_ReturnsOkWithUpdatedPreferences()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateUserPreferencesRequest(
            NotificationsEnabled: false,
            DailyStepGoal: 15000,
            DistanceUnit: "imperial",
            PrivateProfile: true
        );
        var updatedPreferences = new UserPreferencesResponse(
            NotificationsEnabled: false,
            DailyStepGoal: 15000,
            DistanceUnit: "imperial",
            PrivateProfile: true
        );
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UpdatePreferencesAsync(userId, request))
            .ReturnsAsync(updatedPreferences);

        // Act
        var result = await _sut.UpdateMyPreferences(request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<UserPreferencesResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.DailyStepGoal.Should().Be(15000);
        response.Data.DistanceUnit.Should().Be("imperial");
        response.Data.NotificationsEnabled.Should().BeFalse();
        response.Data.PrivateProfile.Should().BeTrue();
        _mockUserService.Verify(x => x.UpdatePreferencesAsync(userId, request), Times.Once);
    }

    [Fact]
    public async Task UpdateMyPreferences_WithPartialUpdate_ReturnsOkWithUpdatedPreferences()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateUserPreferencesRequest(
            NotificationsEnabled: null,
            DailyStepGoal: 12000,
            DistanceUnit: null,
            PrivateProfile: null
        );
        var updatedPreferences = new UserPreferencesResponse(
            NotificationsEnabled: true,
            DailyStepGoal: 12000,
            DistanceUnit: "metric",
            PrivateProfile: false
        );
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UpdatePreferencesAsync(userId, request))
            .ReturnsAsync(updatedPreferences);

        // Act
        var result = await _sut.UpdateMyPreferences(request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<UserPreferencesResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data!.DailyStepGoal.Should().Be(12000);
        _mockUserService.Verify(x => x.UpdatePreferencesAsync(userId, request), Times.Once);
    }

    [Fact]
    public async Task UpdateMyPreferences_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var request = new UpdateUserPreferencesRequest(null, 10000, null, null);
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.UpdateMyPreferences(request);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<UserPreferencesResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockUserService.Verify(x => x.UpdatePreferencesAsync(It.IsAny<Guid>(), It.IsAny<UpdateUserPreferencesRequest>()), Times.Never);
    }

    [Fact]
    public async Task UpdateMyPreferences_WithNullRequest_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        // Act
        var result = await _sut.UpdateMyPreferences(null!);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<UserPreferencesResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Request body cannot be null.");
        _mockUserService.Verify(x => x.UpdatePreferencesAsync(It.IsAny<Guid>(), It.IsAny<UpdateUserPreferencesRequest>()), Times.Never);
    }

    [Fact]
    public async Task UpdateMyPreferences_WithInvalidDailyStepGoal_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateUserPreferencesRequest(null, 50, null, null); // Below minimum
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UpdatePreferencesAsync(userId, request))
            .ThrowsAsync(new ArgumentException("Daily step goal must be between 100 and 100000."));

        // Act
        var result = await _sut.UpdateMyPreferences(request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<UserPreferencesResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Daily step goal must be between 100 and 100000.");
    }

    [Fact]
    public async Task UpdateMyPreferences_WithInvalidDistanceUnit_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateUserPreferencesRequest(null, null, "kilometers", null);
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UpdatePreferencesAsync(userId, request))
            .ThrowsAsync(new ArgumentException("Distance unit must be either 'metric' or 'imperial'."));

        // Act
        var result = await _sut.UpdateMyPreferences(request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<UserPreferencesResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Distance unit must be either 'metric' or 'imperial'.");
    }

    [Fact]
    public async Task UpdateMyPreferences_WithNonExistentUser_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateUserPreferencesRequest(null, 10000, null, null);
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UpdatePreferencesAsync(userId, request))
            .ThrowsAsync(new KeyNotFoundException($"User profile not found for user ID: {userId}"));

        // Act
        var result = await _sut.UpdateMyPreferences(request);

        // Assert
        result.Should().NotBeNull();
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<ApiResponse<UserPreferencesResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain($"User profile not found for user ID: {userId}");
    }

    [Fact]
    public async Task UpdateMyPreferences_WhenServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateUserPreferencesRequest(null, 10000, null, null);
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UpdatePreferencesAsync(userId, request))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _sut.UpdateMyPreferences(request);

        // Assert
        result.Should().NotBeNull();
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        var response = statusCodeResult.Value.Should().BeOfType<ApiResponse<UserPreferencesResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("An error occurred: Database connection failed");
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

    private static UserPreferencesResponse CreateTestPreferencesResponse()
    {
        return new UserPreferencesResponse(
            NotificationsEnabled: true,
            DailyStepGoal: 10000,
            DistanceUnit: "metric",
            PrivateProfile: false
        );
    }

    #endregion
}
