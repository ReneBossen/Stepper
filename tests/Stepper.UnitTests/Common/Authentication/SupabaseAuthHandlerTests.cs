using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Stepper.Api.Common.Authentication;
using Stepper.Api.Common.Configuration;
using Stepper.Api.Common.Extensions;

namespace Stepper.UnitTests.Common.Authentication;

/// <summary>
/// Unit tests for SupabaseAuthHandler.
/// Tests token validation for HS256 (symmetric key) tokens.
/// Note: JWKS-based (asymmetric) token validation requires integration tests with real JWKS endpoint.
/// </summary>
public class SupabaseAuthHandlerTests
{
    private readonly SupabaseSettings _settings;
    private readonly Mock<ILoggerFactory> _loggerFactoryMock;
    private readonly Mock<ILogger<SupabaseAuthHandler>> _loggerMock;

    public SupabaseAuthHandlerTests()
    {
        _settings = new SupabaseSettings
        {
            Url = "https://test.supabase.co",
            AnonKey = "test-anon-key",
            ServiceRoleKey = "test-service-role-key",
            JwtSecret = "test-jwt-secret-with-at-least-32-characters-for-hs256-algorithm",
            JwtIssuer = "https://test.supabase.co/auth/v1",
            JwtAudience = "authenticated"
        };

        _loggerMock = new Mock<ILogger<SupabaseAuthHandler>>();
        _loggerFactoryMock = new Mock<ILoggerFactory>();
        _loggerFactoryMock
            .Setup(x => x.CreateLogger(It.IsAny<string>()))
            .Returns(_loggerMock.Object);
    }

    [Fact]
    public async Task HandleAuthenticateAsync_WithValidToken_ReturnsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = GenerateValidToken(userId);
        var handler = await CreateHandlerAsync($"Bearer {token}");

        // Act
        var result = await handler.AuthenticateAsync();

        // Assert
        result.Succeeded.Should().BeTrue();
        result.Principal.Should().NotBeNull();
        result.Principal!.GetUserId().Should().Be(userId);
    }

    [Fact]
    public async Task HandleAuthenticateAsync_WithMissingAuthorizationHeader_ReturnsNoResult()
    {
        // Arrange
        var handler = await CreateHandlerAsync(null);

        // Act
        var result = await handler.AuthenticateAsync();

        // Assert
        result.None.Should().BeTrue();
        result.Succeeded.Should().BeFalse();
    }

    [Fact]
    public async Task HandleAuthenticateAsync_WithEmptyAuthorizationHeader_ReturnsNoResult()
    {
        // Arrange
        var handler = await CreateHandlerAsync("");

        // Act
        var result = await handler.AuthenticateAsync();

        // Assert
        result.None.Should().BeTrue();
    }

    [Fact]
    public async Task HandleAuthenticateAsync_WithMalformedToken_ReturnsFailure()
    {
        // Arrange
        var handler = await CreateHandlerAsync("Bearer malformed.token.here");

        // Act
        var result = await handler.AuthenticateAsync();

        // Assert
        result.Succeeded.Should().BeFalse();
        result.None.Should().BeFalse();
        result.Failure.Should().NotBeNull();
    }

    [Fact]
    public async Task HandleAuthenticateAsync_WithExpiredToken_ReturnsFailure()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var expiredToken = GenerateExpiredToken(userId);
        var handler = await CreateHandlerAsync($"Bearer {expiredToken}");

        // Act
        var result = await handler.AuthenticateAsync();

        // Assert
        result.Succeeded.Should().BeFalse();
        result.None.Should().BeFalse();
    }

    [Fact]
    public async Task HandleAuthenticateAsync_WithInvalidSignature_ReturnsFailure()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var wrongSecret = "wrong-jwt-secret-with-at-least-32-characters-for-hs256";
        var token = GenerateTokenWithSecret(userId, wrongSecret);
        var handler = await CreateHandlerAsync($"Bearer {token}");

        // Act
        var result = await handler.AuthenticateAsync();

        // Assert
        result.Succeeded.Should().BeFalse();
        result.None.Should().BeFalse();
    }

    [Fact]
    public async Task HandleAuthenticateAsync_WithoutBearerPrefix_ReturnsNoResult()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = GenerateValidToken(userId);
        var handler = await CreateHandlerAsync(token); // No "Bearer " prefix

        // Act
        var result = await handler.AuthenticateAsync();

        // Assert
        result.None.Should().BeTrue();
    }

    [Fact]
    public async Task HandleAuthenticateAsync_WithBasicAuthScheme_ReturnsNoResult()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = GenerateValidToken(userId);
        var handler = await CreateHandlerAsync($"Basic {token}");

        // Act
        var result = await handler.AuthenticateAsync();

        // Assert
        result.None.Should().BeTrue();
    }

    [Fact]
    public async Task HandleAuthenticateAsync_WithCaseInsensitiveBearerPrefix_ReturnsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = GenerateValidToken(userId);
        var handler = await CreateHandlerAsync($"bearer {token}"); // lowercase

        // Act
        var result = await handler.AuthenticateAsync();

        // Assert
        result.Succeeded.Should().BeTrue();
        result.Principal!.GetUserId().Should().Be(userId);
    }

    [Fact]
    public async Task HandleAuthenticateAsync_WithWhitespaceAfterBearer_ReturnsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = GenerateValidToken(userId);
        var handler = await CreateHandlerAsync($"Bearer   {token}"); // extra whitespace

        // Act
        var result = await handler.AuthenticateAsync();

        // Assert
        result.Succeeded.Should().BeTrue();
        result.Principal!.GetUserId().Should().Be(userId);
    }

    [Fact]
    public async Task HandleAuthenticateAsync_WithValidToken_ExtractsEmail()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = GenerateValidToken(userId);
        var handler = await CreateHandlerAsync($"Bearer {token}");

        // Act
        var result = await handler.AuthenticateAsync();

        // Assert
        result.Succeeded.Should().BeTrue();
        result.Principal!.GetUserEmail().Should().Be("test@example.com");
    }

    private async Task<SupabaseAuthHandler> CreateHandlerAsync(string? authorizationHeader)
    {
        var context = new DefaultHttpContext();
        if (authorizationHeader != null)
        {
            context.Request.Headers.Authorization = authorizationHeader;
        }

        var options = Options.Create(new AuthenticationSchemeOptions());
        var optionsMonitor = new TestOptionsMonitor(options.Value);
        var settingsOptions = Options.Create(_settings);

        var handler = new SupabaseAuthHandler(
            optionsMonitor,
            _loggerFactoryMock.Object,
            UrlEncoder.Default,
            settingsOptions);

        var scheme = new AuthenticationScheme(
            SupabaseAuthDefaults.AuthenticationScheme,
            SupabaseAuthDefaults.AuthenticationScheme,
            typeof(SupabaseAuthHandler));

        await handler.InitializeAsync(scheme, context);

        return handler;
    }

    private string GenerateValidToken(Guid userId)
    {
        return GenerateTokenWithSecret(userId, _settings.JwtSecret);
    }

    private string GenerateTokenWithSecret(Guid userId, string secret)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(secret);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("sub", userId.ToString()),
                new Claim("email", "test@example.com")
            }),
            Expires = DateTime.UtcNow.AddHours(1),
            Issuer = _settings.JwtIssuer,
            Audience = _settings.JwtAudience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private string GenerateExpiredToken(Guid userId)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_settings.JwtSecret);

        var expiredTime = DateTime.UtcNow.AddMinutes(-10); // Expired 10 minutes ago (beyond 5 min clock skew)
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("sub", userId.ToString())
            }),
            NotBefore = expiredTime.AddMinutes(-60), // Set NotBefore to be before Expires
            Expires = expiredTime,
            Issuer = _settings.JwtIssuer,
            Audience = _settings.JwtAudience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    /// <summary>
    /// Simple IOptionsMonitor implementation for testing.
    /// </summary>
    private sealed class TestOptionsMonitor : IOptionsMonitor<AuthenticationSchemeOptions>
    {
        public TestOptionsMonitor(AuthenticationSchemeOptions currentValue)
        {
            CurrentValue = currentValue;
        }

        public AuthenticationSchemeOptions CurrentValue { get; }

        public AuthenticationSchemeOptions Get(string? name) => CurrentValue;

        public IDisposable? OnChange(Action<AuthenticationSchemeOptions, string?> listener) => null;
    }
}
