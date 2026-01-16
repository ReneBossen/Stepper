using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Moq;
using WalkingApp.Api.Common.Authentication;
using WalkingApp.Api.Common.Configuration;
using WalkingApp.Api.Common.Extensions;

namespace WalkingApp.UnitTests.Common.Authentication;

public class SupabaseAuthMiddlewareTests
{
    private readonly Mock<RequestDelegate> _nextMock;
    private readonly Mock<ILogger<SupabaseAuthMiddleware>> _loggerMock;
    private readonly SupabaseSettings _settings;
    private readonly IOptions<SupabaseSettings> _options;

    public SupabaseAuthMiddlewareTests()
    {
        _nextMock = new Mock<RequestDelegate>();
        _loggerMock = new Mock<ILogger<SupabaseAuthMiddleware>>();
        _settings = new SupabaseSettings
        {
            Url = "https://test.supabase.co",
            AnonKey = "test-anon-key",
            JwtSecret = "test-jwt-secret-with-at-least-32-characters-for-hs256-algorithm"
        };
        _options = Options.Create(_settings);
    }

    [Fact]
    public async Task InvokeAsync_WithValidToken_SetsUserOnContext()
    {
        // Arrange
        var middleware = new SupabaseAuthMiddleware(_nextMock.Object, _options, _loggerMock.Object);
        var context = new DefaultHttpContext();
        var userId = Guid.NewGuid();
        var token = GenerateValidToken(userId);

        context.Request.Headers.Authorization = $"Bearer {token}";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.User.Should().NotBeNull();
        context.User.GetUserId().Should().Be(userId);
        _nextMock.Verify(next => next(context), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WithMissingAuthorizationHeader_DoesNotSetUser()
    {
        // Arrange
        var middleware = new SupabaseAuthMiddleware(_nextMock.Object, _options, _loggerMock.Object);
        var context = new DefaultHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.User.Identity?.IsAuthenticated.Should().BeFalse();
        _nextMock.Verify(next => next(context), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WithEmptyAuthorizationHeader_DoesNotSetUser()
    {
        // Arrange
        var middleware = new SupabaseAuthMiddleware(_nextMock.Object, _options, _loggerMock.Object);
        var context = new DefaultHttpContext();
        context.Request.Headers.Authorization = "";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.User.Identity?.IsAuthenticated.Should().BeFalse();
        _nextMock.Verify(next => next(context), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WithMalformedToken_DoesNotSetUser()
    {
        // Arrange
        var middleware = new SupabaseAuthMiddleware(_nextMock.Object, _options, _loggerMock.Object);
        var context = new DefaultHttpContext();
        context.Request.Headers.Authorization = "Bearer malformed.token.here";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.User.Identity?.IsAuthenticated.Should().BeFalse();
        _nextMock.Verify(next => next(context), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WithExpiredToken_DoesNotSetUser()
    {
        // Arrange
        var middleware = new SupabaseAuthMiddleware(_nextMock.Object, _options, _loggerMock.Object);
        var context = new DefaultHttpContext();
        var userId = Guid.NewGuid();
        var expiredToken = GenerateExpiredToken(userId);

        context.Request.Headers.Authorization = $"Bearer {expiredToken}";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.User.Identity?.IsAuthenticated.Should().BeFalse();
        _nextMock.Verify(next => next(context), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WithInvalidSignature_DoesNotSetUser()
    {
        // Arrange
        var middleware = new SupabaseAuthMiddleware(_nextMock.Object, _options, _loggerMock.Object);
        var context = new DefaultHttpContext();
        var userId = Guid.NewGuid();

        // Generate token with different secret
        var wrongSecret = "wrong-jwt-secret-with-at-least-32-characters-for-hs256";
        var token = GenerateTokenWithSecret(userId, wrongSecret);

        context.Request.Headers.Authorization = $"Bearer {token}";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.User.Identity?.IsAuthenticated.Should().BeFalse();
        _nextMock.Verify(next => next(context), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WithoutBearerPrefix_DoesNotSetUser()
    {
        // Arrange
        var middleware = new SupabaseAuthMiddleware(_nextMock.Object, _options, _loggerMock.Object);
        var context = new DefaultHttpContext();
        var userId = Guid.NewGuid();
        var token = GenerateValidToken(userId);

        context.Request.Headers.Authorization = token; // No "Bearer " prefix

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.User.Identity?.IsAuthenticated.Should().BeFalse();
        _nextMock.Verify(next => next(context), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WithBasicAuthScheme_DoesNotSetUser()
    {
        // Arrange
        var middleware = new SupabaseAuthMiddleware(_nextMock.Object, _options, _loggerMock.Object);
        var context = new DefaultHttpContext();
        var userId = Guid.NewGuid();
        var token = GenerateValidToken(userId);

        context.Request.Headers.Authorization = $"Basic {token}";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.User.Identity?.IsAuthenticated.Should().BeFalse();
        _nextMock.Verify(next => next(context), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WithCaseInsensitiveBearerPrefix_SetsUserOnContext()
    {
        // Arrange
        var middleware = new SupabaseAuthMiddleware(_nextMock.Object, _options, _loggerMock.Object);
        var context = new DefaultHttpContext();
        var userId = Guid.NewGuid();
        var token = GenerateValidToken(userId);

        context.Request.Headers.Authorization = $"bearer {token}"; // lowercase

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.User.Should().NotBeNull();
        context.User.GetUserId().Should().Be(userId);
        _nextMock.Verify(next => next(context), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WithWhitespaceAfterBearer_SetsUserOnContext()
    {
        // Arrange
        var middleware = new SupabaseAuthMiddleware(_nextMock.Object, _options, _loggerMock.Object);
        var context = new DefaultHttpContext();
        var userId = Guid.NewGuid();
        var token = GenerateValidToken(userId);

        context.Request.Headers.Authorization = $"Bearer   {token}"; // extra whitespace

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.User.Should().NotBeNull();
        context.User.GetUserId().Should().Be(userId);
        _nextMock.Verify(next => next(context), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_CallsNextMiddleware()
    {
        // Arrange
        var middleware = new SupabaseAuthMiddleware(_nextMock.Object, _options, _loggerMock.Object);
        var context = new DefaultHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextMock.Verify(next => next(context), Times.Once);
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
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
