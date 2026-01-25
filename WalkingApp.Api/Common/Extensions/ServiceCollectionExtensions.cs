using WalkingApp.Api.Auth;
using WalkingApp.Api.Common.Configuration;
using WalkingApp.Api.Common.Database;
using WalkingApp.Api.Friends;
using WalkingApp.Api.Friends.Discovery;
using WalkingApp.Api.Groups;
using WalkingApp.Api.Steps;
using WalkingApp.Api.Users;

namespace WalkingApp.Api.Common.Extensions;

/// <summary>
/// Extension methods for IServiceCollection to register application services.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers Supabase-related services in the dependency injection container.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The application configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddSupabaseServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Register strongly-typed Supabase settings
        services.Configure<SupabaseSettings>(configuration.GetSection("Supabase"));

        // Register Supabase client factory as singleton
        services.AddSingleton<ISupabaseClientFactory, SupabaseClientFactory>();

        return services;
    }

    /// <summary>
    /// Registers user-related services in the dependency injection container.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddUserServices(this IServiceCollection services)
    {
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IUserService, UserService>();

        return services;
    }

    /// <summary>
    /// Registers step-related services in the dependency injection container.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddStepServices(this IServiceCollection services)
    {
        services.AddScoped<IStepRepository, StepRepository>();
        services.AddScoped<IStepService, StepService>();

        return services;
    }

    /// <summary>
    /// Registers friend-related services in the dependency injection container.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddFriendServices(this IServiceCollection services)
    {
        services.AddScoped<IFriendRepository, FriendRepository>();
        services.AddScoped<IFriendService, FriendService>();

        // Add friend discovery services
        services.AddScoped<IInviteCodeRepository, InviteCodeRepository>();
        services.AddScoped<IFriendDiscoveryService, FriendDiscoveryService>();

        return services;
    }

    /// <summary>
    /// Registers group-related services in the dependency injection container.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddGroupServices(this IServiceCollection services)
    {
        services.AddScoped<IGroupRepository, GroupRepository>();
        services.AddScoped<IGroupService, GroupService>();

        return services;
    }

    /// <summary>
    /// Registers authentication-related services in the dependency injection container.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddAuthServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();

        return services;
    }
}
