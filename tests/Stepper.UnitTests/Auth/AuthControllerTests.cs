using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Stepper.Api.Auth;
using Stepper.Api.Auth.DTOs;
using Stepper.Api.Common.Models;

namespace Stepper.UnitTests.Auth;

/// <summary>
/// Unit tests for AuthController.
/// Tests HTTP endpoint behavior and service interaction.
/// </summary>
public class AuthControllerTests
{
    private readonly Mock<IAuthService> _mockAuthService;
    private readonly AuthController _sut;

    public AuthControllerTests()
    {
        _mockAuthService = new Mock<IAuthService>();
        _sut = new AuthController(_mockAuthService.Object);
        SetupDefaultHttpContext();
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullAuthService_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new AuthController(null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region Register Tests

    [Fact]
    public async Task Register_WithValidRequest_ReturnsOkWithAuthResponse()
    {
        // Arrange
        var request = new RegisterRequest("test@example.com", "password123", "Test User");
        var authResponse = CreateTestAuthResponse();

        _mockAuthService.Setup(x => x.RegisterAsync(request))
            .ReturnsAsync(authResponse);

        // Act
        var result = await _sut.Register(request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<AuthResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.AccessToken.Should().Be(authResponse.AccessToken);
        response.Data.RefreshToken.Should().Be(authResponse.RefreshToken);
        response.Data.User.Email.Should().Be(authResponse.User.Email);
        _mockAuthService.Verify(x => x.RegisterAsync(request), Times.Once);
    }

    [Fact]
    public async Task Register_WithNullRequest_ReturnsBadRequest()
    {
        // Arrange & Act
        var result = await _sut.Register(null!);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<AuthResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Request body cannot be null.");
        _mockAuthService.Verify(x => x.RegisterAsync(It.IsAny<RegisterRequest>()), Times.Never);
    }

    [Fact]
    public async Task Register_WithInvalidEmail_ReturnsBadRequest()
    {
        // Arrange
        var request = new RegisterRequest("invalid-email", "password123", "Test User");
        _mockAuthService.Setup(x => x.RegisterAsync(request))
            .ThrowsAsync(new ArgumentException("Invalid email format."));

        // Act
        var result = await _sut.Register(request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<AuthResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Invalid email format.");
    }

    [Fact]
    public async Task Register_WhenEmailAlreadyExists_ReturnsBadRequest()
    {
        // Arrange
        var request = new RegisterRequest("existing@example.com", "password123", "Test User");
        _mockAuthService.Setup(x => x.RegisterAsync(request))
            .ThrowsAsync(new InvalidOperationException("An account with this email already exists."));

        // Act
        var result = await _sut.Register(request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<AuthResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("An account with this email already exists.");
    }

    [Fact]
    public async Task Register_WithShortPassword_ReturnsBadRequest()
    {
        // Arrange
        var request = new RegisterRequest("test@example.com", "123", "Test User");
        _mockAuthService.Setup(x => x.RegisterAsync(request))
            .ThrowsAsync(new ArgumentException("Password must be at least 6 characters long."));

        // Act
        var result = await _sut.Register(request);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<AuthResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Password must be at least 6 characters long.");
    }

    #endregion

    #region Login Tests

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsOkWithAuthResponse()
    {
        // Arrange
        var request = new LoginRequest("test@example.com", "password123");
        var authResponse = CreateTestAuthResponse();

        _mockAuthService.Setup(x => x.LoginAsync(request))
            .ReturnsAsync(authResponse);

        // Act
        var result = await _sut.Login(request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<AuthResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.AccessToken.Should().Be(authResponse.AccessToken);
        _mockAuthService.Verify(x => x.LoginAsync(request), Times.Once);
    }

    [Fact]
    public async Task Login_WithNullRequest_ReturnsBadRequest()
    {
        // Arrange & Act
        var result = await _sut.Login(null!);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<AuthResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Request body cannot be null.");
    }

    [Fact]
    public async Task Login_WithEmptyEmail_ReturnsBadRequest()
    {
        // Arrange
        var request = new LoginRequest("", "password123");
        _mockAuthService.Setup(x => x.LoginAsync(request))
            .ThrowsAsync(new ArgumentException("Email cannot be empty."));

        // Act
        var result = await _sut.Login(request);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<AuthResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Email cannot be empty.");
    }

    [Fact]
    public async Task Login_WithInvalidCredentials_ReturnsUnauthorized()
    {
        // Arrange
        var request = new LoginRequest("test@example.com", "wrongpassword");
        _mockAuthService.Setup(x => x.LoginAsync(request))
            .ThrowsAsync(new UnauthorizedAccessException("Invalid email or password."));

        // Act
        var result = await _sut.Login(request);

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<AuthResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Invalid email or password.");
    }

    #endregion

    #region Logout Tests

    [Fact]
    public async Task Logout_WithValidToken_ReturnsOk()
    {
        // Arrange
        SetupHttpContextWithAuthToken("valid-access-token");
        _mockAuthService.Setup(x => x.LogoutAsync("valid-access-token"))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.Logout();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeTrue();
        _mockAuthService.Verify(x => x.LogoutAsync("valid-access-token"), Times.Once);
    }

    [Fact]
    public async Task Logout_WithoutAuthHeader_ReturnsUnauthorized()
    {
        // Arrange
        SetupHttpContextWithoutAuthToken();

        // Act
        var result = await _sut.Logout();

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("No valid access token provided.");
        _mockAuthService.Verify(x => x.LogoutAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Logout_WhenServiceFails_ReturnsBadRequest()
    {
        // Arrange
        SetupHttpContextWithAuthToken("valid-access-token");
        _mockAuthService.Setup(x => x.LogoutAsync("valid-access-token"))
            .ThrowsAsync(new InvalidOperationException("Failed to logout. Please try again."));

        // Act
        var result = await _sut.Logout();

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Failed to logout. Please try again.");
    }

    #endregion

    #region RefreshToken Tests

    [Fact]
    public async Task RefreshToken_WithValidRefreshToken_ReturnsOkWithNewTokens()
    {
        // Arrange
        var request = new RefreshTokenRequest("valid-refresh-token");
        var authResponse = CreateTestAuthResponse();

        _mockAuthService.Setup(x => x.RefreshTokenAsync(request))
            .ReturnsAsync(authResponse);

        // Act
        var result = await _sut.RefreshToken(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<AuthResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.AccessToken.Should().Be(authResponse.AccessToken);
        _mockAuthService.Verify(x => x.RefreshTokenAsync(request), Times.Once);
    }

    [Fact]
    public async Task RefreshToken_WithNullRequest_ReturnsBadRequest()
    {
        // Arrange & Act
        var result = await _sut.RefreshToken(null!);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<AuthResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Request body cannot be null.");
    }

    [Fact]
    public async Task RefreshToken_WithEmptyToken_ReturnsBadRequest()
    {
        // Arrange
        var request = new RefreshTokenRequest("");
        _mockAuthService.Setup(x => x.RefreshTokenAsync(request))
            .ThrowsAsync(new ArgumentException("Refresh token cannot be empty."));

        // Act
        var result = await _sut.RefreshToken(request);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<AuthResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Refresh token cannot be empty.");
    }

    [Fact]
    public async Task RefreshToken_WithExpiredToken_ReturnsUnauthorized()
    {
        // Arrange
        var request = new RefreshTokenRequest("expired-refresh-token");
        _mockAuthService.Setup(x => x.RefreshTokenAsync(request))
            .ThrowsAsync(new UnauthorizedAccessException("Invalid or expired refresh token."));

        // Act
        var result = await _sut.RefreshToken(request);

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<AuthResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Invalid or expired refresh token.");
    }

    #endregion

    #region ForgotPassword Tests

    [Fact]
    public async Task ForgotPassword_WithValidEmail_ReturnsOk()
    {
        // Arrange
        var request = new ForgotPasswordRequest("test@example.com");
        _mockAuthService.Setup(x => x.ForgotPasswordAsync(request))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.ForgotPassword(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeTrue();
        _mockAuthService.Verify(x => x.ForgotPasswordAsync(request), Times.Once);
    }

    [Fact]
    public async Task ForgotPassword_WithNullRequest_ReturnsBadRequest()
    {
        // Arrange & Act
        var result = await _sut.ForgotPassword(null!);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Request body cannot be null.");
    }

    [Fact]
    public async Task ForgotPassword_WithInvalidEmailFormat_ReturnsBadRequest()
    {
        // Arrange
        var request = new ForgotPasswordRequest("invalid-email");
        _mockAuthService.Setup(x => x.ForgotPasswordAsync(request))
            .ThrowsAsync(new ArgumentException("Invalid email format."));

        // Act
        var result = await _sut.ForgotPassword(request);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Invalid email format.");
    }

    [Fact]
    public async Task ForgotPassword_WithNonExistentEmail_StillReturnsOk()
    {
        // Arrange - The service should not throw for non-existent emails (security)
        var request = new ForgotPasswordRequest("nonexistent@example.com");
        _mockAuthService.Setup(x => x.ForgotPasswordAsync(request))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.ForgotPassword(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeTrue();
    }

    #endregion

    #region ResetPassword Tests

    [Fact]
    public async Task ResetPassword_WithValidRequest_ReturnsOk()
    {
        // Arrange
        var request = new ResetPasswordRequest("valid-token", "newPassword123");
        _mockAuthService.Setup(x => x.ResetPasswordAsync(request))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.ResetPassword(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeTrue();
        _mockAuthService.Verify(x => x.ResetPasswordAsync(request), Times.Once);
    }

    [Fact]
    public async Task ResetPassword_WithNullRequest_ReturnsBadRequest()
    {
        // Arrange & Act
        var result = await _sut.ResetPassword(null!);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Request body cannot be null.");
    }

    [Fact]
    public async Task ResetPassword_WithEmptyToken_ReturnsBadRequest()
    {
        // Arrange
        var request = new ResetPasswordRequest("", "newPassword123");
        _mockAuthService.Setup(x => x.ResetPasswordAsync(request))
            .ThrowsAsync(new ArgumentException("Reset token cannot be empty."));

        // Act
        var result = await _sut.ResetPassword(request);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Reset token cannot be empty.");
    }

    [Fact]
    public async Task ResetPassword_WithInvalidToken_ReturnsBadRequest()
    {
        // Arrange
        var request = new ResetPasswordRequest("invalid-token", "newPassword123");
        _mockAuthService.Setup(x => x.ResetPasswordAsync(request))
            .ThrowsAsync(new InvalidOperationException("Invalid or expired reset token."));

        // Act
        var result = await _sut.ResetPassword(request);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Invalid or expired reset token.");
    }

    [Fact]
    public async Task ResetPassword_WithShortPassword_ReturnsBadRequest()
    {
        // Arrange
        var request = new ResetPasswordRequest("valid-token", "123");
        _mockAuthService.Setup(x => x.ResetPasswordAsync(request))
            .ThrowsAsync(new ArgumentException("Password must be at least 6 characters long."));

        // Act
        var result = await _sut.ResetPassword(request);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Password must be at least 6 characters long.");
    }

    #endregion

    #region Helper Methods

    private void SetupDefaultHttpContext()
    {
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    private void SetupHttpContextWithAuthToken(string token)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["Authorization"] = $"Bearer {token}";
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    private void SetupHttpContextWithoutAuthToken()
    {
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    private static AuthResponse CreateTestAuthResponse()
    {
        return new AuthResponse(
            AccessToken: "test-access-token",
            RefreshToken: "test-refresh-token",
            ExpiresIn: 3600,
            User: new AuthUserInfo(
                Id: Guid.NewGuid(),
                Email: "test@example.com",
                DisplayName: "Test User"
            )
        );
    }

    #endregion
}
