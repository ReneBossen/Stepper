using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using WalkingApp.Api.Auth;
using WalkingApp.Api.Auth.DTOs;
using WalkingApp.Api.Common.Configuration;

namespace WalkingApp.UnitTests.Auth;

/// <summary>
/// Unit tests for AuthService validation logic.
/// Note: Integration with Supabase is not tested here as it requires a real Supabase instance.
/// These tests focus on input validation and error handling.
/// </summary>
public class AuthServiceTests
{
    private readonly Mock<IOptions<SupabaseSettings>> _mockSettings;
    private readonly Mock<ILogger<AuthService>> _mockLogger;
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        _mockSettings = new Mock<IOptions<SupabaseSettings>>();
        _mockSettings.Setup(x => x.Value).Returns(new SupabaseSettings
        {
            Url = "https://test.supabase.co",
            AnonKey = "test-anon-key",
            JwtSecret = "test-jwt-secret",
            JwtIssuer = "https://test.supabase.co/auth/v1",
            JwtAudience = "authenticated"
        });

        _mockLogger = new Mock<ILogger<AuthService>>();
        _sut = new AuthService(_mockSettings.Object, _mockLogger.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullSettings_ThrowsArgumentNullException()
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
        var act = () => new AuthService(_mockSettings.Object, null!);

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

    #region Valid Input Tests (Will fail at Supabase connection)

    [Fact]
    public async Task RegisterAsync_WithValidRequest_AttemptsSupabaseConnection()
    {
        // Arrange
        var request = new RegisterRequest("test@example.com", "password123", "Test User");

        // Act & Assert
        // This will fail because it tries to connect to Supabase, but it proves validation passed
        var act = async () => await _sut.RegisterAsync(request);

        // The exception should be from Supabase connection, not validation
        var exception = await act.Should().ThrowAsync<Exception>();
        exception.Which.Message.Should().NotContain("cannot be empty")
            .And.NotContain("Invalid email format")
            .And.NotContain("at least");
    }

    [Fact]
    public async Task LoginAsync_WithValidRequest_AttemptsSupabaseConnection()
    {
        // Arrange
        var request = new LoginRequest("test@example.com", "password123");

        // Act & Assert
        var act = async () => await _sut.LoginAsync(request);

        // Should fail at Supabase connection, not validation
        var exception = await act.Should().ThrowAsync<Exception>();
        exception.Which.Message.Should().NotContain("cannot be empty");
    }

    #endregion
}
