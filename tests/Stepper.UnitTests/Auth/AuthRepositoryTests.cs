using FluentAssertions;
using Microsoft.Extensions.Options;
using Stepper.Api.Auth;
using Stepper.Api.Common.Configuration;

namespace Stepper.UnitTests.Auth;

/// <summary>
/// Unit tests for AuthRepository focusing on validation and initialization logic.
/// Note: Full auth operations should be tested via integration tests with a real Supabase instance
/// due to the complexity of mocking the Supabase client.
/// </summary>
public class AuthRepositoryTests
{
    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullSettings_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new AuthRepository(null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithValidSettings_CreatesInstance()
    {
        // Arrange
        var settings = Options.Create(new SupabaseSettings
        {
            Url = "https://test.supabase.co",
            AnonKey = "test-anon-key",
            ServiceRoleKey = "test-service-role-key",
            JwtSecret = "test-jwt-secret",
            JwtIssuer = "https://test.supabase.co/auth/v1",
            JwtAudience = "authenticated"
        });

        // Act
        var repository = new AuthRepository(settings);

        // Assert
        repository.Should().NotBeNull();
        repository.Should().BeAssignableTo<IAuthRepository>();
    }

    #endregion
}
