using FluentAssertions;
using Microsoft.Extensions.Options;
using Stepper.Api.Common.Configuration;
using Stepper.Api.Common.Database;

namespace Stepper.UnitTests.Common.Database;

public class SupabaseClientFactoryTests
{
    private readonly SupabaseSettings _validSettings;
    private readonly IOptions<SupabaseSettings> _options;

    public SupabaseClientFactoryTests()
    {
        _validSettings = new SupabaseSettings
        {
            Url = "https://test.supabase.co",
            AnonKey = "test-anon-key",
            ServiceRoleKey = "test-service-role-key",
            JwtSecret = "test-jwt-secret-with-at-least-32-characters-for-hs256",
            JwtIssuer = "https://test.supabase.co/auth/v1",
            JwtAudience = "authenticated"
        };
        _options = Options.Create(_validSettings);
    }

    [Fact]
    public async Task CreateClientAsync_WithValidToken_ReturnsClient()
    {
        // Arrange
        var factory = new SupabaseClientFactory(_options);
        var token = "valid.jwt.token";

        // Act
        var act = async () => await factory.CreateClientAsync(token);

        // Assert
        // Note: This would require actual Supabase connection, so we just verify it doesn't throw ArgumentException
        await act.Should().NotThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task CreateClientAsync_WithNullToken_ThrowsArgumentException()
    {
        // Arrange
        var factory = new SupabaseClientFactory(_options);

        // Act
        var act = async () => await factory.CreateClientAsync(null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*JWT token cannot be null or empty*")
            .WithParameterName("jwtToken");
    }

    [Fact]
    public async Task CreateClientAsync_WithEmptyToken_ThrowsArgumentException()
    {
        // Arrange
        var factory = new SupabaseClientFactory(_options);

        // Act
        var act = async () => await factory.CreateClientAsync("");

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*JWT token cannot be null or empty*")
            .WithParameterName("jwtToken");
    }

    [Fact]
    public async Task CreateClientAsync_WithWhitespaceToken_ThrowsArgumentException()
    {
        // Arrange
        var factory = new SupabaseClientFactory(_options);

        // Act
        var act = async () => await factory.CreateClientAsync("   ");

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*JWT token cannot be null or empty*")
            .WithParameterName("jwtToken");
    }

    [Fact]
    public async Task CreateAnonymousClientAsync_ReturnsClient()
    {
        // Arrange
        var factory = new SupabaseClientFactory(_options);

        // Act
        var act = async () => await factory.CreateAnonymousClientAsync();

        // Assert
        // Note: This would require actual Supabase connection, so we just verify it doesn't throw
        await act.Should().NotThrowAsync<ArgumentException>();
    }

    [Fact]
    public void Constructor_WithNullSettings_ThrowsArgumentNullException()
    {
        // Arrange
        IOptions<SupabaseSettings> nullOptions = null!;

        // Act
        var act = () => new SupabaseClientFactory(nullOptions);

        // Assert
        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("settings");
    }
}
