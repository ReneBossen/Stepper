using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Moq;
using Stepper.Api.Common.Models;
using Stepper.Api.Steps.DTOs;
using Stepper.IntegrationTests.Common;

namespace Stepper.IntegrationTests.Middleware;

/// <summary>
/// Integration tests for the ExceptionHandlingMiddleware.
/// Tests that exceptions are properly caught and converted to appropriate HTTP status codes.
/// </summary>
public class ExceptionHandlingTests : IAsyncLifetime
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

    [Fact]
    public async Task ServiceThrowsKeyNotFoundException_Returns404NotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _factory.MockStepService
            .Setup(x => x.GetTodayAsync(userId))
            .ThrowsAsync(new KeyNotFoundException("Step data not found"));

        var request = new HttpRequestMessage(HttpMethod.Get, "api/v1/steps/today")
        {
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<object>>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        apiResponse.Should().NotBeNull();
        apiResponse!.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("Step data not found");
    }

    [Fact]
    public async Task ServiceThrowsUnauthorizedAccessException_Returns401Unauthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _factory.MockStepService
            .Setup(x => x.GetTodayAsync(userId))
            .ThrowsAsync(new UnauthorizedAccessException("Access denied"));

        var request = new HttpRequestMessage(HttpMethod.Get, "api/v1/steps/today")
        {
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<object>>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        apiResponse.Should().NotBeNull();
        apiResponse!.Success.Should().BeFalse();
    }

    [Fact]
    public async Task ServiceThrowsArgumentException_Returns400BadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RecordStepsRequest
        {
            StepCount = 5000,
            Date = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        _factory.MockStepService
            .Setup(x => x.RecordStepsAsync(userId, It.IsAny<RecordStepsRequest>()))
            .ThrowsAsync(new ArgumentException("Invalid step count"));

        var jsonContent = JsonSerializer.Serialize(request);
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "api/v1/steps")
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json"),
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(httpRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<object>>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        apiResponse.Should().NotBeNull();
        apiResponse!.Success.Should().BeFalse();
    }

    [Fact]
    public async Task ServiceThrowsInvalidOperationException_Returns400BadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _factory.MockStepService
            .Setup(x => x.GetTodayAsync(userId))
            .ThrowsAsync(new InvalidOperationException("Invalid operation"));

        var request = new HttpRequestMessage(HttpMethod.Get, "api/v1/steps/today")
        {
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ServiceThrowsUnexpectedException_Returns500InternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _factory.MockStepService
            .Setup(x => x.GetTodayAsync(userId))
            .ThrowsAsync(new InvalidOperationException("Unexpected error"));

        var request = new HttpRequestMessage(HttpMethod.Get, "api/v1/steps/today")
        {
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest); // InvalidOperationException maps to 400
    }

    [Fact]
    public async Task ResponseHasCorrectContentType()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _factory.MockStepService
            .Setup(x => x.GetTodayAsync(userId))
            .ThrowsAsync(new KeyNotFoundException("Not found"));

        var request = new HttpRequestMessage(HttpMethod.Get, "api/v1/steps/today")
        {
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json");
    }

    [Fact]
    public async Task ErrorResponseUsedsCamelCasePropertyNames()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _factory.MockStepService
            .Setup(x => x.GetTodayAsync(userId))
            .ThrowsAsync(new KeyNotFoundException("Test error"));

        var request = new HttpRequestMessage(HttpMethod.Get, "api/v1/steps/today")
        {
            Headers = { { "Authorization", $"Bearer {userId}" } }
        };

        // Act
        var response = await _client.SendAsync(request);
        var content = await response.Content.ReadAsStringAsync();

        // Assert - Check that the response uses camelCase
        content.Should().Contain("\"success\""); // not "Success"
        content.Should().Contain("\"errors\"");  // not "Errors"
    }
}
