using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WalkingApp.Api.Common.Models;
using WalkingApp.Api.Users;
using WalkingApp.Api.Users.DTOs;

namespace WalkingApp.UnitTests.Users;

public class UsersControllerTests
{
    private readonly Mock<IUserService> _mockUserService;
    private readonly UsersController _sut;

    public UsersControllerTests()
    {
        _mockUserService = new Mock<IUserService>();
        _sut = new UsersController(_mockUserService.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullUserService_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new UsersController(null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region GetMyProfile Tests

    [Fact]
    public async Task GetMyProfile_WithAuthenticatedUser_ReturnsOkWithProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var profile = CreateTestProfileResponse(userId);
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.EnsureProfileExistsAsync(userId))
            .ReturnsAsync(profile);

        // Act
        var result = await _sut.GetMyProfile();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<GetProfileResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.Id.Should().Be(userId);
        response.Data.DisplayName.Should().Be(profile.DisplayName);
        _mockUserService.Verify(x => x.EnsureProfileExistsAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetMyProfile_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetMyProfile();

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<GetProfileResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockUserService.Verify(x => x.EnsureProfileExistsAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetMyProfile_WhenServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.EnsureProfileExistsAsync(userId))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _sut.GetMyProfile();

        // Assert
        result.Should().NotBeNull();
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        var response = statusCodeResult.Value.Should().BeOfType<ApiResponse<GetProfileResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("An error occurred: Database connection failed");
    }

    #endregion

    #region UpdateMyProfile Tests

    [Fact]
    public async Task UpdateMyProfile_WithValidRequest_ReturnsOkWithUpdatedProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateProfileRequest
        {
            DisplayName = "Updated Name",
            AvatarUrl = "https://example.com/new-avatar.jpg"
        };
        var updatedProfile = CreateTestProfileResponse(userId, request.DisplayName);
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UpdateProfileAsync(userId, request))
            .ReturnsAsync(updatedProfile);

        // Act
        var result = await _sut.UpdateMyProfile(request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<GetProfileResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.DisplayName.Should().Be(request.DisplayName);
        _mockUserService.Verify(x => x.UpdateProfileAsync(userId, request), Times.Once);
    }

    [Fact]
    public async Task UpdateMyProfile_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var request = new UpdateProfileRequest { DisplayName = "Test" };
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.UpdateMyProfile(request);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<GetProfileResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockUserService.Verify(x => x.UpdateProfileAsync(It.IsAny<Guid>(), It.IsAny<UpdateProfileRequest>()), Times.Never);
    }

    [Fact]
    public async Task UpdateMyProfile_WithNullRequest_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        // Act
        var result = await _sut.UpdateMyProfile(null!);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<GetProfileResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Request body cannot be null.");
        _mockUserService.Verify(x => x.UpdateProfileAsync(It.IsAny<Guid>(), It.IsAny<UpdateProfileRequest>()), Times.Never);
    }

    [Fact]
    public async Task UpdateMyProfile_WithInvalidDisplayName_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateProfileRequest { DisplayName = "A" }; // Too short
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UpdateProfileAsync(userId, request))
            .ThrowsAsync(new ArgumentException("Display name must be at least 2 characters long."));

        // Act
        var result = await _sut.UpdateMyProfile(request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<GetProfileResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Display name must be at least 2 characters long.");
    }

    [Fact]
    public async Task UpdateMyProfile_WithInvalidAvatarUrl_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateProfileRequest
        {
            DisplayName = "Valid Name",
            AvatarUrl = "not-a-valid-url"
        };
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UpdateProfileAsync(userId, request))
            .ThrowsAsync(new ArgumentException("Avatar URL must be a valid HTTP or HTTPS URL."));

        // Act
        var result = await _sut.UpdateMyProfile(request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<GetProfileResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Avatar URL must be a valid HTTP or HTTPS URL.");
    }

    [Fact]
    public async Task UpdateMyProfile_WithNonExistentUser_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateProfileRequest { DisplayName = "Test" };
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UpdateProfileAsync(userId, request))
            .ThrowsAsync(new KeyNotFoundException($"User profile not found for user ID: {userId}"));

        // Act
        var result = await _sut.UpdateMyProfile(request);

        // Assert
        result.Should().NotBeNull();
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<ApiResponse<GetProfileResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain($"User profile not found for user ID: {userId}");
    }

    [Fact]
    public async Task UpdateMyProfile_WhenServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateProfileRequest { DisplayName = "Test" };
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UpdateProfileAsync(userId, request))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _sut.UpdateMyProfile(request);

        // Assert
        result.Should().NotBeNull();
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        var response = statusCodeResult.Value.Should().BeOfType<ApiResponse<GetProfileResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("An error occurred: Database connection failed");
    }

    #endregion

    #region GetProfileById Tests

    [Fact]
    public async Task GetProfileById_WithValidUserId_ReturnsOkWithProfile()
    {
        // Arrange
        var currentUserId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var profile = CreateTestProfileResponse(targetUserId);
        SetupAuthenticatedUser(currentUserId);

        _mockUserService.Setup(x => x.GetProfileAsync(targetUserId))
            .ReturnsAsync(profile);

        // Act
        var result = await _sut.GetProfileById(targetUserId);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<GetProfileResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.Id.Should().Be(targetUserId);
        _mockUserService.Verify(x => x.GetProfileAsync(targetUserId), Times.Once);
    }

    [Fact]
    public async Task GetProfileById_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var targetUserId = Guid.NewGuid();
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetProfileById(targetUserId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<GetProfileResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockUserService.Verify(x => x.GetProfileAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetProfileById_WithEmptyGuid_ReturnsBadRequest()
    {
        // Arrange
        var currentUserId = Guid.NewGuid();
        SetupAuthenticatedUser(currentUserId);

        // Act
        var result = await _sut.GetProfileById(Guid.Empty);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<GetProfileResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User ID cannot be empty.");
        _mockUserService.Verify(x => x.GetProfileAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetProfileById_WithNonExistentUser_ReturnsNotFound()
    {
        // Arrange
        var currentUserId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        SetupAuthenticatedUser(currentUserId);

        _mockUserService.Setup(x => x.GetProfileAsync(targetUserId))
            .ThrowsAsync(new KeyNotFoundException($"User profile not found for user ID: {targetUserId}"));

        // Act
        var result = await _sut.GetProfileById(targetUserId);

        // Assert
        result.Should().NotBeNull();
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<ApiResponse<GetProfileResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain($"User profile not found for user ID: {targetUserId}");
    }

    [Fact]
    public async Task GetProfileById_WhenServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var currentUserId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        SetupAuthenticatedUser(currentUserId);

        _mockUserService.Setup(x => x.GetProfileAsync(targetUserId))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _sut.GetProfileById(targetUserId);

        // Assert
        result.Should().NotBeNull();
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        var response = statusCodeResult.Value.Should().BeOfType<ApiResponse<GetProfileResponse>>().Subject;
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

    private static GetProfileResponse CreateTestProfileResponse(Guid userId, string? displayName = "Test User")
    {
        return new GetProfileResponse
        {
            Id = userId,
            DisplayName = displayName ?? "Test User",
            AvatarUrl = "https://example.com/avatar.jpg",
            CreatedAt = DateTime.UtcNow.AddDays(-30)
        };
    }

    #endregion
}
