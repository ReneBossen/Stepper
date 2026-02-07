using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Stepper.IntegrationTests.Common;

/// <summary>
/// Test authentication handler that accepts any Bearer token and extracts claims from it.
/// The token format is simply the user ID as a GUID string.
/// This replaces the Supabase JWT handler during integration tests.
/// </summary>
public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "TestScheme";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder) : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // No Authorization header means no authentication
        if (!Request.Headers.ContainsKey("Authorization"))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var authHeader = Request.Headers.Authorization.ToString();
        var token = authHeader.Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase).Trim();

        // Token must be a valid GUID
        if (!Guid.TryParse(token, out var userId))
        {
            return Task.FromResult(AuthenticateResult.Fail("Invalid token format. Token must be a valid GUID."));
        }

        // Create claims that match what ClaimsPrincipalExtensions expects
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, token),
            new Claim("sub", token),
        };
        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        // Set the SupabaseToken in HttpContext.Items for repositories that need it
        Request.HttpContext.Items["SupabaseToken"] = "test-token";

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
