using System.Security.Claims;
using FluentAssertions;
using Stepper.Api.Common.Extensions;

namespace Stepper.UnitTests.Common.Extensions;

public class ClaimsPrincipalExtensionsTests
{
    [Fact]
    public void GetUserId_WithValidSubClaim_ReturnsGuid()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var claims = new List<Claim>
        {
            new Claim("sub", userId.ToString())
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));

        // Act
        var result = principal.GetUserId();

        // Assert
        result.Should().Be(userId);
    }

    [Fact]
    public void GetUserId_WithValidNameIdentifierClaim_ReturnsGuid()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));

        // Act
        var result = principal.GetUserId();

        // Assert
        result.Should().Be(userId);
    }

    [Fact]
    public void GetUserId_WithBothClaims_PrefersNameIdentifier()
    {
        // Arrange
        var nameIdentifierId = Guid.NewGuid();
        var subId = Guid.NewGuid();
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, nameIdentifierId.ToString()),
            new Claim("sub", subId.ToString())
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));

        // Act
        var result = principal.GetUserId();

        // Assert
        result.Should().Be(nameIdentifierId);
    }

    [Fact]
    public void GetUserId_WithInvalidGuid_ReturnsNull()
    {
        // Arrange
        var claims = new List<Claim>
        {
            new Claim("sub", "not-a-valid-guid")
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));

        // Act
        var result = principal.GetUserId();

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetUserId_WithEmptyString_ReturnsNull()
    {
        // Arrange
        var claims = new List<Claim>
        {
            new Claim("sub", "")
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));

        // Act
        var result = principal.GetUserId();

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetUserId_WithWhitespace_ReturnsNull()
    {
        // Arrange
        var claims = new List<Claim>
        {
            new Claim("sub", "   ")
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));

        // Act
        var result = principal.GetUserId();

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetUserId_WithNullPrincipal_ReturnsNull()
    {
        // Arrange
        ClaimsPrincipal principal = null!;

        // Act
        var result = principal.GetUserId();

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetUserId_WithNoClaims_ReturnsNull()
    {
        // Arrange
        var principal = new ClaimsPrincipal(new ClaimsIdentity());

        // Act
        var result = principal.GetUserId();

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetUserId_WithMissingSubClaim_ReturnsNull()
    {
        // Arrange
        var claims = new List<Claim>
        {
            new Claim("email", "test@example.com")
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));

        // Act
        var result = principal.GetUserId();

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetUserEmail_WithValidEmailClaim_ReturnsEmail()
    {
        // Arrange
        var email = "test@example.com";
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Email, email)
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));

        // Act
        var result = principal.GetUserEmail();

        // Assert
        result.Should().Be(email);
    }

    [Fact]
    public void GetUserEmail_WithValidEmailClaimLowercase_ReturnsEmail()
    {
        // Arrange
        var email = "test@example.com";
        var claims = new List<Claim>
        {
            new Claim("email", email)
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));

        // Act
        var result = principal.GetUserEmail();

        // Assert
        result.Should().Be(email);
    }

    [Fact]
    public void GetUserEmail_WithBothClaims_PrefersClaimTypesEmail()
    {
        // Arrange
        var claimTypesEmail = "claimtypes@example.com";
        var lowercaseEmail = "lowercase@example.com";
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Email, claimTypesEmail),
            new Claim("email", lowercaseEmail)
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));

        // Act
        var result = principal.GetUserEmail();

        // Assert
        result.Should().Be(claimTypesEmail);
    }

    [Fact]
    public void GetUserEmail_WithNullPrincipal_ReturnsNull()
    {
        // Arrange
        ClaimsPrincipal principal = null!;

        // Act
        var result = principal.GetUserEmail();

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetUserEmail_WithNoClaims_ReturnsNull()
    {
        // Arrange
        var principal = new ClaimsPrincipal(new ClaimsIdentity());

        // Act
        var result = principal.GetUserEmail();

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetUserEmail_WithMissingEmailClaim_ReturnsNull()
    {
        // Arrange
        var claims = new List<Claim>
        {
            new Claim("sub", Guid.NewGuid().ToString())
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));

        // Act
        var result = principal.GetUserEmail();

        // Assert
        result.Should().BeNull();
    }
}
