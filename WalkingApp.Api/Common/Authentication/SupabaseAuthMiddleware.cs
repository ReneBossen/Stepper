using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using WalkingApp.Api.Common.Configuration;

namespace WalkingApp.Api.Common.Authentication;

/// <summary>
/// Middleware to validate Supabase JWT tokens and populate the user identity.
/// </summary>
public class SupabaseAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly SupabaseSettings _settings;
    private readonly ILogger<SupabaseAuthMiddleware> _logger;

    public SupabaseAuthMiddleware(
        RequestDelegate next,
        IOptions<SupabaseSettings> settings,
        ILogger<SupabaseAuthMiddleware> logger)
    {
        _next = next;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var token = ExtractToken(context);

        if (!string.IsNullOrWhiteSpace(token))
        {
            try
            {
                var claimsPrincipal = ValidateToken(token);
                if (claimsPrincipal != null)
                {
                    context.User = claimsPrincipal;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to validate JWT token");
            }
        }

        await _next(context);
    }

    private static string? ExtractToken(HttpContext context)
    {
        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(authHeader))
        {
            return null;
        }

        const string bearerPrefix = "Bearer ";
        if (authHeader.StartsWith(bearerPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return authHeader[bearerPrefix.Length..].Trim();
        }

        return null;
    }

    private ClaimsPrincipal? ValidateToken(string token)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_settings.JwtSecret);

        try
        {
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _settings.JwtIssuer,
                ValidateAudience = true,
                ValidAudience = _settings.JwtAudience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(5)
            };

            var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
            return principal;
        }
        catch (SecurityTokenException ex)
        {
            _logger.LogWarning(ex, "Security token validation failed");
            return null;
        }
    }
}
