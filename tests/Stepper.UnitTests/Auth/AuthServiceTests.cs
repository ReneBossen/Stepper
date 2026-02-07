using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Stepper.Api.Auth;
using Stepper.Api.Auth.DTOs;
using Supabase.Gotrue;

namespace Stepper.UnitTests.Auth;

/// <summary>
/// Unit tests for AuthService.
/// Tests input validation, business logic, and repository interaction.
/// </summary>
public class AuthServiceTests
{
    private readonly Mock<IAuthRepository> _mockAuthRepository;
    private readonly Mock<ILogger<AuthService>> _mockLogger;
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        _mockAuthRepository = new Mock<IAuthRepository>();
        _mockLogger = new Mock<ILogger<AuthService>>();
        _sut = new AuthService(_mockAuthRepository.Object, _mockLogger.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullAuthRepository_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new AuthService(null!, _mockLogger.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullLogger_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new AuthService(_mockAuthRepository.Object, null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region RegisterAsync Validation Tests

    [Fact]
    public async Task RegisterAsync_WithNullRequest_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = async () => await _sut.RegisterAsync(null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task RegisterAsync_WithNullOrWhitespaceEmail_ThrowsArgumentException(string? email)
    {
        // Arrange
        var request = new RegisterRequest(email!, "password123", "Display Name");

        // Act
        var act = async () => await _sut.RegisterAsync(request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Email cannot be empty.");
    }

    [Theory]
    [InlineData("invalid")]
    [InlineData("invalid@")]
    [InlineData("@invalid")]
    [InlineData("invalid.com")]
    public async Task RegisterAsync_WithInvalidEmailFormat_ThrowsArgumentException(string email)
    {
        // Arrange
        var request = new RegisterRequest(email, "password123", "Display Name");

        // Act
        var act = async () => await _sut.RegisterAsync(request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Invalid email format.");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task RegisterAsync_WithNullOrWhitespacePassword_ThrowsArgumentException(string? password)
    {
        // Arrange
        var request = new RegisterRequest("test@example.com", password!, "Display Name");

        // Act
        var act = async () => await _sut.RegisterAsync(request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Password cannot be empty.");
    }

    [Theory]
    [InlineData("12345")]  // 5 characters
    [InlineData("a")]      // 1 character
    [InlineData("abc")]    // 3 characters
    public async Task RegisterAsync_WithShortPassword_ThrowsArgumentException(string password)
    {
        // Arrange
        var request = new RegisterRequest("test@example.com", password, "Display Name");

        // Act
        var act = async () => await _sut.RegisterAsync(request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Password must be at least 6 characters long.");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task RegisterAsync_WithNullOrWhitespaceDisplayName_ThrowsArgumentException(string? displayName)
    {
        // Arrange
        var request = new RegisterRequest("test@example.com", "password123", displayName!);

        // Act
        var act = async () => await _sut.RegisterAsync(request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Display name cannot be empty.");
    }

    [Fact]
    public async Task RegisterAsync_WithShortDisplayName_ThrowsArgumentException()
    {
        // Arrange
        var request = new RegisterRequest("test@example.com", "password123", "A");

        // Act
        var act = async () => await _sut.RegisterAsync(request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Display name must be at least 2 characters long.");
    }

    [Fact]
    public async Task RegisterAsync_WithLongDisplayName_ThrowsArgumentException()
    {
        // Arrange
        var longName = new string('A', 51); // 51 characters
        var request = new RegisterRequest("test@example.com", "password123", longName);

        // Act
        var act = async () => await _sut.RegisterAsync(request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Display name cannot exceed 50 characters.");
    }

    #endregion

    #region LoginAsync Validation Tests

    [Fact]
    public async Task LoginAsync_WithNullRequest_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = async () => await _sut.LoginAsync(null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task LoginAsync_WithNullOrWhitespaceEmail_ThrowsArgumentException(string? email)
    {
        // Arrange
        var request = new LoginRequest(email!, "password123");

        // Act
        var act = async () => await _sut.LoginAsync(request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Email cannot be empty.");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task LoginAsync_WithNullOrWhitespacePassword_ThrowsArgumentException(string? password)
    {
        // Arrange
        var request = new LoginRequest("test@example.com", password!);

        // Act
        var act = async () => await _sut.LoginAsync(request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Password cannot be empty.");
    }

    #endregion

    #region LogoutAsync Validation Tests

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task LogoutAsync_WithNullOrWhitespaceAccessToken_ThrowsArgumentException(string? accessToken)
    {
        // Arrange & Act
        var act = async () => await _sut.LogoutAsync(accessToken!);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Access token cannot be empty.*");
    }

    #endregion

    #region RefreshTokenAsync Validation Tests

    [Fact]
    public async Task RefreshTokenAsync_WithNullRequest_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = async () => await _sut.RefreshTokenAsync(null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task RefreshTokenAsync_WithNullOrWhitespaceRefreshToken_ThrowsArgumentException(string? refreshToken)
    {
        // Arrange
        var request = new RefreshTokenRequest(refreshToken!);

        // Act
        var act = async () => await _sut.RefreshTokenAsync(request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Refresh token cannot be empty.");
    }

    #endregion

    #region ForgotPasswordAsync Validation Tests

    [Fact]
    public async Task ForgotPasswordAsync_WithNullRequest_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = async () => await _sut.ForgotPasswordAsync(null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task ForgotPasswordAsync_WithNullOrWhitespaceEmail_ThrowsArgumentException(string? email)
    {
        // Arrange
        var request = new ForgotPasswordRequest(email!);

        // Act
        var act = async () => await _sut.ForgotPasswordAsync(request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Email cannot be empty.");
    }

    [Theory]
    [InlineData("invalid")]
    [InlineData("invalid@")]
    [InlineData("@invalid")]
    [InlineData("invalid.com")]
    public async Task ForgotPasswordAsync_WithInvalidEmailFormat_ThrowsArgumentException(string email)
    {
        // Arrange
        var request = new ForgotPasswordRequest(email);

        // Act
        var act = async () => await _sut.ForgotPasswordAsync(request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Invalid email format.");
    }

    #endregion

    #region ResetPasswordAsync Validation Tests

    [Fact]
    public async Task ResetPasswordAsync_WithNullRequest_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = async () => await _sut.ResetPasswordAsync(null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task ResetPasswordAsync_WithNullOrWhitespaceToken_ThrowsArgumentException(string? token)
    {
        // Arrange
        var request = new ResetPasswordRequest(token!, "newPassword123");

        // Act
        var act = async () => await _sut.ResetPasswordAsync(request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Reset token cannot be empty.");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task ResetPasswordAsync_WithNullOrWhitespaceNewPassword_ThrowsArgumentException(string? newPassword)
    {
        // Arrange
        var request = new ResetPasswordRequest("valid-token", newPassword!);

        // Act
        var act = async () => await _sut.ResetPasswordAsync(request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("New password cannot be empty.");
    }

    [Theory]
    [InlineData("12345")]  // 5 characters
    [InlineData("a")]      // 1 character
    [InlineData("abc")]    // 3 characters
    public async Task ResetPasswordAsync_WithShortNewPassword_ThrowsArgumentException(string newPassword)
    {
        // Arrange
        var request = new ResetPasswordRequest("valid-token", newPassword);

        // Act
        var act = async () => await _sut.ResetPasswordAsync(request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Password must be at least 6 characters long.");
    }

    #endregion

    #region RegisterAsync Repository Interaction Tests

    [Fact]
    public async Task RegisterAsync_WithValidRequest_CallsRepositorySignUp()
    {
        // Arrange
        var request = new RegisterRequest("test@example.com", "password123", "Test User");
        var session = CreateTestSession();

        _mockAuthRepository
            .Setup(x => x.SignUpAsync(
                request.Email,
                request.Password,
                It.Is<Dictionary<string, object>>(d => d.ContainsKey("display_name"))))
            .ReturnsAsync(session);

        // Act
        var result = await _sut.RegisterAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.AccessToken.Should().Be("test-access-token");
        result.RefreshToken.Should().Be("test-refresh-token");
        result.User.Email.Should().Be("test@example.com");

        _mockAuthRepository.Verify(x => x.SignUpAsync(
            request.Email,
            request.Password,
            It.IsAny<Dictionary<string, object>>()), Times.Once);
    }

    #endregion

    #region LoginAsync Repository Interaction Tests

    [Fact]
    public async Task LoginAsync_WithValidRequest_CallsRepositorySignIn()
    {
        // Arrange
        var request = new LoginRequest("test@example.com", "password123");
        var session = CreateTestSession();

        _mockAuthRepository
            .Setup(x => x.SignInAsync(request.Email, request.Password))
            .ReturnsAsync(session);

        // Act
        var result = await _sut.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.AccessToken.Should().Be("test-access-token");
        result.User.Email.Should().Be("test@example.com");

        _mockAuthRepository.Verify(x => x.SignInAsync(request.Email, request.Password), Times.Once);
    }

    #endregion

    #region LogoutAsync Repository Interaction Tests

    [Fact]
    public async Task LogoutAsync_WithValidToken_CallsRepositorySignOut()
    {
        // Arrange
        var accessToken = "valid-access-token";

        _mockAuthRepository
            .Setup(x => x.SignOutAsync(accessToken))
            .Returns(Task.CompletedTask);

        // Act
        await _sut.LogoutAsync(accessToken);

        // Assert
        _mockAuthRepository.Verify(x => x.SignOutAsync(accessToken), Times.Once);
    }

    #endregion

    #region RefreshTokenAsync Repository Interaction Tests

    [Fact]
    public async Task RefreshTokenAsync_WithValidRequest_CallsRepositoryRefreshSession()
    {
        // Arrange
        var request = new RefreshTokenRequest("valid-refresh-token");
        var session = CreateTestSession();

        _mockAuthRepository
            .Setup(x => x.RefreshSessionAsync(request.RefreshToken))
            .ReturnsAsync(session);

        // Act
        var result = await _sut.RefreshTokenAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.AccessToken.Should().Be("test-access-token");

        _mockAuthRepository.Verify(x => x.RefreshSessionAsync(request.RefreshToken), Times.Once);
    }

    #endregion

    #region ForgotPasswordAsync Repository Interaction Tests

    [Fact]
    public async Task ForgotPasswordAsync_WithValidRequest_CallsRepositoryResetPasswordForEmail()
    {
        // Arrange
        var request = new ForgotPasswordRequest("test@example.com");

        _mockAuthRepository
            .Setup(x => x.ResetPasswordForEmailAsync(request.Email))
            .Returns(Task.CompletedTask);

        // Act
        await _sut.ForgotPasswordAsync(request);

        // Assert
        _mockAuthRepository.Verify(x => x.ResetPasswordForEmailAsync(request.Email), Times.Once);
    }

    #endregion

    #region ChangePasswordAsync Validation Tests

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task ChangePasswordAsync_WithNullOrWhitespaceAccessToken_ThrowsArgumentException(string? accessToken)
    {
        // Arrange
        var request = new ChangePasswordRequest("currentPass", "newPass123");

        // Act
        var act = async () => await _sut.ChangePasswordAsync(accessToken!, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Access token cannot be empty.*");
    }

    [Fact]
    public async Task ChangePasswordAsync_WithNullRequest_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = async () => await _sut.ChangePasswordAsync("valid-token", null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [Fact]
    public async Task ChangePasswordAsync_WithSamePasswords_ThrowsArgumentException()
    {
        // Arrange
        var request = new ChangePasswordRequest("samePassword", "samePassword");

        // Act
        var act = async () => await _sut.ChangePasswordAsync("valid-token", request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("New password must be different from current password.");
    }

    [Fact]
    public async Task ChangePasswordAsync_WithShortNewPassword_ThrowsArgumentException()
    {
        // Arrange
        var request = new ChangePasswordRequest("currentPass", "short");

        // Act
        var act = async () => await _sut.ChangePasswordAsync("valid-token", request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("New password must be at least 6 characters long.");
    }

    #endregion

    #region Helper Methods

    private static Session CreateTestSession()
    {
        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            UserMetadata = new Dictionary<string, object>
            {
                { "display_name", "Test User" }
            }
        };

        return new Session
        {
            AccessToken = "test-access-token",
            RefreshToken = "test-refresh-token",
            ExpiresIn = 3600,
            User = user
        };
    }

    #endregion
}
