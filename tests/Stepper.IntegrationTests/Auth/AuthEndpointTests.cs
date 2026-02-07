using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Moq;
using Stepper.Api.Auth.DTOs;
using Stepper.Api.Common.Models;
using Stepper.IntegrationTests.Common;

namespace Stepper.IntegrationTests.Auth;

/// <summary>
/// Integration tests for the Auth API endpoints.
/// Tests registration, login, and token handling.
/// </summary>
public class AuthEndpointTests : IAsyncLifetime
{
    private StepperWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _factory = new StepperWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client?.Dispose();
        _factory?.Dispose();
    }

    #region Register Tests

    [Fact]
    public async Task Register_WithValidRequest_Returns200WithAuthResponse()
    {
        // Arrange
        var request = new RegisterRequest(
            Email: "newuser@example.com",
            Password: "SecurePass123!",
            DisplayName: "New User"
        );

        var expectedResponse = new AuthResponse(
            AccessToken: "test-access-token",
            RefreshToken: "test-refresh-token",
            ExpiresIn: 3600,
            User: new AuthUserInfo(
                Id: Guid.NewGuid(),
                Email: "newuser@example.com",
                DisplayName: "New User"
            ),
            RequiresEmailConfirmation: false
        );

        _factory.MockAuthService
            .Setup(x => x.RegisterAsync(It.IsAny<RegisterRequest>()))
            .ReturnsAsync(expectedResponse);

        var jsonContent = JsonSerializer.Serialize(request);
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "api/v1/auth/register")
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
        };

        // Act
        var response = await _client.SendAsync(httpRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<AuthResponse>>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        apiResponse.Should().NotBeNull();
        apiResponse!.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.User.Email.Should().Be("newuser@example.com");
        apiResponse.Data.AccessToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Register_WithNullRequest_Returns400BadRequest()
    {
        // Arrange
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "api/v1/auth/register")
        {
            Content = new StringContent("null", Encoding.UTF8, "application/json")
        };

        // Act
        var response = await _client.SendAsync(httpRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region Login Tests

    [Fact]
    public async Task Login_WithValidCredentials_Returns200WithAuthResponse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new LoginRequest(
            Email: "user@example.com",
            Password: "SecurePass123!"
        );

        var expectedResponse = new AuthResponse(
            AccessToken: "test-access-token",
            RefreshToken: "test-refresh-token",
            ExpiresIn: 3600,
            User: new AuthUserInfo(
                Id: userId,
                Email: "user@example.com",
                DisplayName: "User Name"
            ),
            RequiresEmailConfirmation: false
        );

        _factory.MockAuthService
            .Setup(x => x.LoginAsync(It.IsAny<LoginRequest>()))
            .ReturnsAsync(expectedResponse);

        var jsonContent = JsonSerializer.Serialize(request);
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "api/v1/auth/login")
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
        };

        // Act
        var response = await _client.SendAsync(httpRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<AuthResponse>>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        apiResponse.Should().NotBeNull();
        apiResponse!.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.User.Id.Should().Be(userId);
        apiResponse.Data.RefreshToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_WithNullRequest_Returns400BadRequest()
    {
        // Arrange
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "api/v1/auth/login")
        {
            Content = new StringContent("null", Encoding.UTF8, "application/json")
        };

        // Act
        var response = await _client.SendAsync(httpRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region Logout Tests

    [Fact]
    public async Task Logout_WithValidToken_Returns200WithSuccessMessage()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _factory.MockAuthService
            .Setup(x => x.LogoutAsync(It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        var request = new HttpRequestMessage(HttpMethod.Post, "api/v1/auth/logout")
        {
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<object>>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        apiResponse.Should().NotBeNull();
        apiResponse!.Success.Should().BeTrue();
    }

    [Fact]
    public async Task Logout_WithoutAuthToken_Returns401Unauthorized()
    {
        // Arrange
        var request = new HttpRequestMessage(HttpMethod.Post, "api/v1/auth/logout");

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region RefreshToken Tests

    [Fact]
    public async Task RefreshToken_WithValidRefreshToken_Returns200WithNewTokens()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RefreshTokenRequest(
            RefreshToken: "test-refresh-token"
        );

        var expectedResponse = new AuthResponse(
            AccessToken: "new-access-token",
            RefreshToken: "new-refresh-token",
            ExpiresIn: 3600,
            User: new AuthUserInfo(
                Id: userId,
                Email: "user@example.com",
                DisplayName: "User Name"
            ),
            RequiresEmailConfirmation: false
        );

        _factory.MockAuthService
            .Setup(x => x.RefreshTokenAsync(It.IsAny<RefreshTokenRequest>()))
            .ReturnsAsync(expectedResponse);

        var jsonContent = JsonSerializer.Serialize(request);
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "api/v1/auth/refresh")
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
        };

        // Act
        var response = await _client.SendAsync(httpRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<AuthResponse>>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        apiResponse.Should().NotBeNull();
        apiResponse!.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.AccessToken.Should().Be("new-access-token");
    }

    #endregion

    #region ForgotPassword Tests

    [Fact]
    public async Task ForgotPassword_WithValidEmail_Returns200AlwaysForSecurity()
    {
        // Arrange
        var request = new ForgotPasswordRequest(
            Email: "user@example.com"
        );

        _factory.MockAuthService
            .Setup(x => x.ForgotPasswordAsync(It.IsAny<ForgotPasswordRequest>()))
            .Returns(Task.CompletedTask);

        var jsonContent = JsonSerializer.Serialize(request);
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "api/v1/auth/forgot-password")
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
        };

        // Act
        var response = await _client.SendAsync(httpRequest);

        // Assert
        // Always returns 200 to prevent email enumeration attacks
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<object>>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        apiResponse.Should().NotBeNull();
        apiResponse!.Success.Should().BeTrue();
    }

    #endregion
}
