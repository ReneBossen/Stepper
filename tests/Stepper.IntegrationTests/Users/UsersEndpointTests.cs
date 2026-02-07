using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Moq;
using Stepper.Api.Common.Models;
using Stepper.Api.Users.DTOs;
using Stepper.IntegrationTests.Common;

namespace Stepper.IntegrationTests.Users;

/// <summary>
/// Integration tests for the Users API endpoints.
/// Tests profile retrieval, updates, and authentication flows.
/// </summary>
public class UsersEndpointTests : IAsyncLifetime
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

    #region GetMyProfile Tests

    [Fact]
    public async Task GetMyProfile_WithValidToken_Returns200WithProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var expectedProfile = new GetProfileResponse
        {
            Id = userId,
            DisplayName = "John Doe",
            AvatarUrl = "https://example.com/avatar.png",
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            OnboardingCompleted = true
        };

        _factory.MockUserService
            .Setup(x => x.EnsureProfileExistsAsync(userId))
            .ReturnsAsync(expectedProfile);

        var request = new HttpRequestMessage(HttpMethod.Get, "api/v1/users/me")
        {
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<GetProfileResponse>>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        apiResponse.Should().NotBeNull();
        apiResponse!.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.Id.Should().Be(userId);
        apiResponse.Data.DisplayName.Should().Be("John Doe");
        apiResponse.Data.OnboardingCompleted.Should().BeTrue();
    }

    [Fact]
    public async Task GetMyProfile_WithoutAuthToken_Returns401Unauthorized()
    {
        // Arrange
        var request = new HttpRequestMessage(HttpMethod.Get, "api/v1/users/me");
        // No Authorization header

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region UpdateMyProfile Tests

    [Fact]
    public async Task UpdateMyProfile_WithValidRequest_Returns200WithUpdatedProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var updateRequest = new UpdateProfileRequest
        {
            DisplayName = "Jane Doe"
        };

        var expectedProfile = new GetProfileResponse
        {
            Id = userId,
            DisplayName = "Jane Doe",
            AvatarUrl = null,
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            OnboardingCompleted = true
        };

        _factory.MockUserService
            .Setup(x => x.UpdateProfileAsync(userId, It.IsAny<UpdateProfileRequest>()))
            .ReturnsAsync(expectedProfile);

        var jsonContent = JsonSerializer.Serialize(updateRequest);
        var httpRequest = new HttpRequestMessage(HttpMethod.Put, "api/v1/users/me")
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json"),
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(httpRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<GetProfileResponse>>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        apiResponse.Should().NotBeNull();
        apiResponse!.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.DisplayName.Should().Be("Jane Doe");
    }

    [Fact]
    public async Task UpdateMyProfile_WithoutAuthToken_Returns401Unauthorized()
    {
        // Arrange
        var updateRequest = new UpdateProfileRequest { DisplayName = "Jane Doe" };
        var jsonContent = JsonSerializer.Serialize(updateRequest);
        var request = new HttpRequestMessage(HttpMethod.Put, "api/v1/users/me")
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
            // No Authorization header
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region GetProfileById Tests

    [Fact]
    public async Task GetProfileById_WithValidToken_Returns200WithProfile()
    {
        // Arrange
        var currentUserId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        var expectedProfile = new GetProfileResponse
        {
            Id = otherUserId,
            DisplayName = "Friend User",
            AvatarUrl = null,
            CreatedAt = DateTime.UtcNow.AddDays(-60),
            OnboardingCompleted = true
        };

        _factory.MockUserService
            .Setup(x => x.GetProfileAsync(otherUserId))
            .ReturnsAsync(expectedProfile);

        var request = new HttpRequestMessage(HttpMethod.Get, $"api/v1/users/{otherUserId}")
        {
            Headers = { { "Authorization", $"Bearer {currentUserId}" } }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<GetProfileResponse>>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        apiResponse.Should().NotBeNull();
        apiResponse!.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.Id.Should().Be(otherUserId);
    }

    [Fact]
    public async Task GetProfileById_WithInvalidUserId_Returns400BadRequest()
    {
        // Arrange
        var currentUserId = Guid.NewGuid();
        var invalidUserId = Guid.Empty;

        var request = new HttpRequestMessage(HttpMethod.Get, $"api/v1/users/{invalidUserId}")
        {
            Headers = { { "Authorization", $"Bearer {currentUserId}" } }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region Preferences Tests

    [Fact]
    public async Task GetMyPreferences_WithValidToken_Returns200WithPreferences()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var expectedPreferences = new UserPreferencesResponse(
            NotificationsEnabled: true,
            DailyStepGoal: 10000,
            DistanceUnit: "metric",
            PrivateProfile: false
        );

        _factory.MockUserService
            .Setup(x => x.GetPreferencesAsync(userId))
            .ReturnsAsync(expectedPreferences);

        var request = new HttpRequestMessage(HttpMethod.Get, "api/v1/users/me/preferences")
        {
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<UserPreferencesResponse>>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        apiResponse.Should().NotBeNull();
        apiResponse!.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.DailyStepGoal.Should().Be(10000);
        apiResponse.Data.NotificationsEnabled.Should().BeTrue();
        apiResponse.Data.DistanceUnit.Should().Be("metric");
    }

    [Fact]
    public async Task UpdateMyPreferences_WithValidRequest_Returns200WithUpdatedPreferences()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var updateRequest = new UpdateUserPreferencesRequest(
            NotificationsEnabled: false,
            DailyStepGoal: 12000,
            DistanceUnit: null,
            PrivateProfile: null
        );

        var expectedPreferences = new UserPreferencesResponse(
            NotificationsEnabled: false,
            DailyStepGoal: 12000,
            DistanceUnit: "metric",
            PrivateProfile: false
        );

        _factory.MockUserService
            .Setup(x => x.UpdatePreferencesAsync(userId, It.IsAny<UpdateUserPreferencesRequest>()))
            .ReturnsAsync(expectedPreferences);

        var jsonContent = JsonSerializer.Serialize(updateRequest);
        var httpRequest = new HttpRequestMessage(HttpMethod.Put, "api/v1/users/me/preferences")
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json"),
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(httpRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<UserPreferencesResponse>>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        apiResponse.Should().NotBeNull();
        apiResponse!.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.DailyStepGoal.Should().Be(12000);
        apiResponse.Data.NotificationsEnabled.Should().BeFalse();
    }

    #endregion
}
