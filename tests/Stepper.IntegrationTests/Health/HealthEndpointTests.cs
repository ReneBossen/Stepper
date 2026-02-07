using System.Net;
using FluentAssertions;
using Stepper.IntegrationTests.Common;

namespace Stepper.IntegrationTests.Health;

/// <summary>
/// Integration tests for the Health endpoint.
/// Tests that the health check endpoint is working and doesn't require authentication.
/// </summary>
public class HealthEndpointTests : IAsyncLifetime
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
    public async Task Health_WithoutAuthToken_Returns200OK()
    {
        // Arrange
        var request = new HttpRequestMessage(HttpMethod.Get, "/health");

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        content.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Health_DoesNotRequireAuthentication()
    {
        // Arrange - No auth header provided
        var request = new HttpRequestMessage(HttpMethod.Get, "/health");

        // Act
        var response = await _client.SendAsync(request);

        // Assert - Should succeed without authentication
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
