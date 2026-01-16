using System.Security.Claims;

namespace WalkingApp.Api.Common.Extensions;

/// <summary>
/// Extension methods for ClaimsPrincipal to extract user information.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Gets the user ID from the JWT token claims.
    /// Supabase stores the user ID in the "sub" (subject) claim.
    /// </summary>
    /// <param name="principal">The claims principal.</param>
    /// <returns>The user ID as a Guid, or null if not found or invalid.</returns>
    public static Guid? GetUserId(this ClaimsPrincipal principal)
    {
        if (principal == null)
        {
            return null;
        }

        var subClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? principal.FindFirst("sub")?.Value;

        if (string.IsNullOrWhiteSpace(subClaim))
        {
            return null;
        }

        return Guid.TryParse(subClaim, out var userId) ? userId : null;
    }

    /// <summary>
    /// Gets the user's email from the JWT token claims.
    /// </summary>
    /// <param name="principal">The claims principal.</param>
    /// <returns>The user's email, or null if not found.</returns>
    public static string? GetUserEmail(this ClaimsPrincipal principal)
    {
        if (principal == null)
        {
            return null;
        }

        return principal.FindFirst(ClaimTypes.Email)?.Value
               ?? principal.FindFirst("email")?.Value;
    }
}
