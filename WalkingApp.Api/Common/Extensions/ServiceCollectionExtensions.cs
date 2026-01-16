using WalkingApp.Api.Common.Configuration;
using WalkingApp.Api.Common.Database;
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
}
