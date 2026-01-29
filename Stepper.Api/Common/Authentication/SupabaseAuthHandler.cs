using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using Stepper.Api.Common.Configuration;

namespace Stepper.Api.Common.Authentication;

/// <summary>
/// Authentication handler that validates Supabase JWT tokens.
/// Supports both HS256 (symmetric) tokens and RS256/ES256 (asymmetric) OAuth tokens via JWKS.
/// </summary>
public class SupabaseAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly SupabaseSettings _settings;
    private readonly ConfigurationManager<OpenIdConnectConfiguration> _jwksConfigManager;
    private readonly JwtSecurityTokenHandler _tokenHandler;

    /// <summary>
    /// Initializes a new instance of <see cref="SupabaseAuthHandler"/>.
    /// </summary>
    public SupabaseAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IOptions<SupabaseSettings> settings)
        : base(options, logger, encoder)
    {
        _settings = settings.Value;
        _tokenHandler = new JwtSecurityTokenHandler();
        _jwksConfigManager = CreateJwksConfigManager(_settings.Url);
    }

    /// <summary>
    /// Handles the authentication request by validating the JWT token.
    /// </summary>
    /// <returns>The authentication result.</returns>
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var token = ExtractToken();

        if (string.IsNullOrWhiteSpace(token))
        {
            return AuthenticateResult.NoResult();
        }

        try
        {
            var claimsPrincipal = await ValidateTokenAsync(token);
            if (claimsPrincipal == null)
            {
                return AuthenticateResult.Fail("Invalid token");
            }

            // Store the token in HttpContext.Items for repositories to use
            Context.Items["SupabaseToken"] = token;

            var ticket = new AuthenticationTicket(claimsPrincipal, Scheme.Name);
            return AuthenticateResult.Success(ticket);
        }
        catch (SecurityTokenException ex)
        {
            Logger.LogWarning(ex, "Token validation failed: {Message}", ex.Message);
            return AuthenticateResult.Fail(ex.Message);
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "Unexpected error during token validation");
            return AuthenticateResult.Fail("Token validation error");
        }
    }

    private static ConfigurationManager<OpenIdConnectConfiguration> CreateJwksConfigManager(string supabaseUrl)
    {
        var openIdConfigUri = BuildOpenIdConfigUri(supabaseUrl);

        return new ConfigurationManager<OpenIdConnectConfiguration>(
            openIdConfigUri,
            new OpenIdConnectConfigurationRetriever(),
            new HttpDocumentRetriever());
    }

    private static string BuildOpenIdConfigUri(string supabaseUrl)
    {
        var baseUrl = supabaseUrl.TrimEnd('/');
        return $"{baseUrl}/auth/v1/.well-known/openid-configuration";
    }

    private string? ExtractToken()
    {
        var authHeader = Request.Headers.Authorization.FirstOrDefault();
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

    private async Task<ClaimsPrincipal?> ValidateTokenAsync(string token)
    {
        var hasKid = TokenHasKid(token);

        return hasKid
            ? await ValidateWithJwksAsync(token)
            : ValidateWithSymmetricKey(token);
    }

    private bool TokenHasKid(string token)
    {
        try
        {
            var jwtToken = _tokenHandler.ReadJwtToken(token);
            return jwtToken.Header.Kid != null;
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "Failed to read JWT header");
            return false;
        }
    }

    private async Task<ClaimsPrincipal?> ValidateWithJwksAsync(string token)
    {
        var config = await _jwksConfigManager.GetConfigurationAsync(CancellationToken.None);
        var signingKeys = config.SigningKeys;

        var validationParameters = CreateValidationParameters();
        validationParameters.IssuerSigningKeys = signingKeys;

        var principal = _tokenHandler.ValidateToken(token, validationParameters, out _);
        return principal;
    }

    private ClaimsPrincipal? ValidateWithSymmetricKey(string token)
    {
        var key = Encoding.UTF8.GetBytes(_settings.JwtSecret);
        var validationParameters = CreateValidationParameters();
        validationParameters.IssuerSigningKey = new SymmetricSecurityKey(key);

        var principal = _tokenHandler.ValidateToken(token, validationParameters, out _);
        return principal;
    }

    private TokenValidationParameters CreateValidationParameters()
    {
        return new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            ValidateIssuer = true,
            ValidIssuer = _settings.JwtIssuer,
            ValidateAudience = true,
            ValidAudience = _settings.JwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
    }
}
