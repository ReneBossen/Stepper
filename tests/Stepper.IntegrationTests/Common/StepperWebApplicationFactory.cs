using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Stepper.Api.Activity;
using Stepper.Api.Auth;
using Stepper.Api.Common.Database;
using Stepper.Api.Friends;
using Stepper.Api.Friends.Discovery;
using Stepper.Api.Groups;
using Stepper.Api.Notifications;
using Stepper.Api.Steps;
using Stepper.Api.Users;

namespace Stepper.IntegrationTests.Common;

/// <summary>
/// Custom WebApplicationFactory that sets up the API with mocked services for integration testing.
/// This allows testing the full HTTP pipeline without hitting real databases.
/// </summary>
public class StepperWebApplicationFactory : WebApplicationFactory<Program>
{
    // Public mocks so tests can configure them
    public Mock<IStepRepository> MockStepRepository { get; } = new();
    public Mock<IStepService> MockStepService { get; } = new();
    public Mock<IUserRepository> MockUserRepository { get; } = new();
    public Mock<IUserService> MockUserService { get; } = new();
    public Mock<IFriendRepository> MockFriendRepository { get; } = new();
    public Mock<IFriendService> MockFriendService { get; } = new();
    public Mock<IFriendDiscoveryService> MockFriendDiscoveryService { get; } = new();
    public Mock<IGroupRepository> MockGroupRepository { get; } = new();
    public Mock<IGroupService> MockGroupService { get; } = new();
    public Mock<IAuthRepository> MockAuthRepository { get; } = new();
    public Mock<IAuthService> MockAuthService { get; } = new();
    public Mock<IActivityRepository> MockActivityRepository { get; } = new();
    public Mock<IActivityService> MockActivityService { get; } = new();
    public Mock<INotificationRepository> MockNotificationRepository { get; } = new();
    public Mock<INotificationService> MockNotificationService { get; } = new();
    public Mock<ISupabaseClientFactory> MockSupabaseClientFactory { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Use Testing environment to skip certain configurations
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // Replace authentication handler with test handler
            var authenticationBuilder = services
                .AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, null);

            // Remove the original Supabase authentication handler if it exists
            var supabaseAuthDescriptor = services.FirstOrDefault(d =>
                d.ServiceType == typeof(IAuthenticationHandler) &&
                d.ImplementationType?.Name == "SupabaseAuthHandler");
            if (supabaseAuthDescriptor != null)
            {
                services.Remove(supabaseAuthDescriptor);
            }

            // Replace service implementations with mocks
            ReplaceService(services, MockStepService.Object);
            ReplaceService(services, MockUserService.Object);
            ReplaceService(services, MockFriendService.Object);
            ReplaceService(services, MockFriendDiscoveryService.Object);
            ReplaceService(services, MockGroupService.Object);
            ReplaceService(services, MockAuthService.Object);
            ReplaceService(services, MockActivityService.Object);
            ReplaceService(services, MockNotificationService.Object);
            ReplaceService(services, MockSupabaseClientFactory.Object);
        });
    }

    /// <summary>
    /// Replaces a service registration with a mock implementation.
    /// </summary>
    private static void ReplaceService<T>(IServiceCollection services, T implementation)
        where T : class
    {
        var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(T));
        if (descriptor != null)
        {
            services.Remove(descriptor);
        }
        services.AddSingleton(implementation);
    }
}
