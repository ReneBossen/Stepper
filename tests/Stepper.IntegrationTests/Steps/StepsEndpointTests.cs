using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Moq;
using Stepper.Api.Common.Models;
using Stepper.Api.Steps.DTOs;
using Stepper.IntegrationTests.Common;

namespace Stepper.IntegrationTests.Steps;

/// <summary>
/// Integration tests for the Steps API endpoints.
/// Tests the full HTTP pipeline including authentication, validation, and JSON serialization.
/// </summary>
public class StepsEndpointTests : IAsyncLifetime
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

    #region GetToday Tests

    [Fact]
    public async Task GetToday_WithValidToken_Returns200WithDailySteps()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var expectedSteps = new DailyStepsResponse
        {
            Date = today,
            TotalSteps = 8500,
            TotalDistanceMeters = 5950.0
        };

        _factory.MockStepService
            .Setup(x => x.GetTodayAsync(userId))
            .ReturnsAsync(expectedSteps);

        var request = new HttpRequestMessage(HttpMethod.Get, "api/v1/steps/today")
        {
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<DailyStepsResponse>>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        apiResponse.Should().NotBeNull();
        apiResponse!.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.TotalSteps.Should().Be(8500);
        apiResponse.Data.TotalDistanceMeters.Should().Be(5950.0);
    }

    [Fact]
    public async Task GetToday_WithoutAuthToken_Returns401Unauthorized()
    {
        // Arrange
        var request = new HttpRequestMessage(HttpMethod.Get, "api/v1/steps/today");
        // No Authorization header

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetToday_WithInvalidToken_Returns401Unauthorized()
    {
        // Arrange
        var request = new HttpRequestMessage(HttpMethod.Get, "api/v1/steps/today")
        {
            Headers = { { "Authorization", "Bearer invalid-guid-not-valid" } }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region RecordSteps Tests

    [Fact]
    public async Task RecordSteps_WithValidRequest_Returns201CreatedWithEntry()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RecordStepsRequest
        {
            StepCount = 5000,
            DistanceMeters = 3500.5,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Source = "Apple Health"
        };

        var expectedEntry = new StepEntryResponse
        {
            Id = Guid.NewGuid(),
            StepCount = request.StepCount,
            DistanceMeters = request.DistanceMeters,
            Date = request.Date,
            RecordedAt = DateTime.UtcNow,
            Source = request.Source
        };

        _factory.MockStepService
            .Setup(x => x.RecordStepsAsync(userId, It.IsAny<RecordStepsRequest>()))
            .ReturnsAsync(expectedEntry);

        var jsonContent = JsonSerializer.Serialize(request);
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "api/v1/steps")
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json"),
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(httpRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<StepEntryResponse>>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        apiResponse.Should().NotBeNull();
        apiResponse!.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.StepCount.Should().Be(5000);
        apiResponse.Data.Source.Should().Be("Apple Health");
    }

    [Fact]
    public async Task RecordSteps_WithoutAuthToken_Returns401Unauthorized()
    {
        // Arrange
        var request = new RecordStepsRequest
        {
            StepCount = 5000,
            Date = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        var jsonContent = JsonSerializer.Serialize(request);
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "api/v1/steps")
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
            // No Authorization header
        };

        // Act
        var response = await _client.SendAsync(httpRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType?.MediaType.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task RecordSteps_WithInvalidStepCount_Returns400BadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var invalidJson = """{"stepCount": 250000, "date": "2025-01-01"}""";

        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "api/v1/steps")
        {
            Content = new StringContent(invalidJson, Encoding.UTF8, "application/json"),
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(httpRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region GetStats Tests

    [Fact]
    public async Task GetStats_WithValidToken_Returns200WithStatistics()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var expectedStats = new StepStatsResponse(
            TodaySteps: 8500,
            TodayDistance: 5950.0,
            WeekSteps: 60000,
            WeekDistance: 42000.0,
            MonthSteps: 250000,
            MonthDistance: 175000.0,
            CurrentStreak: 15,
            LongestStreak: 42,
            DailyGoal: 10000
        );

        _factory.MockStepService
            .Setup(x => x.GetStatsAsync(userId))
            .ReturnsAsync(expectedStats);

        var request = new HttpRequestMessage(HttpMethod.Get, "api/v1/steps/stats")
        {
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<StepStatsResponse>>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        apiResponse.Should().NotBeNull();
        apiResponse!.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.CurrentStreak.Should().Be(15);
        apiResponse.Data.TodaySteps.Should().Be(8500);
        apiResponse.Data.DailyGoal.Should().Be(10000);
    }

    [Fact]
    public async Task GetStats_WithoutAuthToken_Returns401Unauthorized()
    {
        // Arrange
        var request = new HttpRequestMessage(HttpMethod.Get, "api/v1/steps/stats");
        // No Authorization header

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region DeleteEntry Tests

    [Fact]
    public async Task DeleteEntry_WithValidToken_Returns204NoContent()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entryId = Guid.NewGuid();

        _factory.MockStepService
            .Setup(x => x.DeleteEntryAsync(userId, entryId))
            .ReturnsAsync(true);

        var request = new HttpRequestMessage(HttpMethod.Delete, $"api/v1/steps/{entryId}")
        {
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task DeleteEntry_WithNonExistentEntry_Returns404NotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entryId = Guid.NewGuid();

        _factory.MockStepService
            .Setup(x => x.DeleteEntryAsync(userId, entryId))
            .ReturnsAsync(false);

        var request = new HttpRequestMessage(HttpMethod.Delete, $"api/v1/steps/{entryId}")
        {
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion
}
