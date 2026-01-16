using Microsoft.Extensions.Options;
using Supabase;
using WalkingApp.Api.Common.Configuration;

namespace WalkingApp.Api.Common.Database;

/// <summary>
/// Factory implementation for creating Supabase client instances.
/// </summary>
public class SupabaseClientFactory : ISupabaseClientFactory
{
    private readonly SupabaseSettings _settings;

    public SupabaseClientFactory(IOptions<SupabaseSettings> settings)
    {
        _settings = settings.Value;
    }

    /// <inheritdoc />
    public async Task<Client> CreateClientAsync(string jwtToken)
    {
        if (string.IsNullOrWhiteSpace(jwtToken))
        {
            throw new ArgumentException("JWT token cannot be null or empty.", nameof(jwtToken));
        }

        var options = new SupabaseOptions
        {
            AutoConnectRealtime = true
        };

        var client = new Client(_settings.Url, _settings.AnonKey, options);
        await client.InitializeAsync();

        // Set the user's JWT token for RLS enforcement
        client.Auth.SetAuth(jwtToken);

        return client;
    }

    /// <inheritdoc />
    public async Task<Client> CreateAnonymousClientAsync()
    {
        var options = new SupabaseOptions
        {
            AutoConnectRealtime = false
        };

        var client = new Client(_settings.Url, _settings.AnonKey, options);
        await client.InitializeAsync();

        return client;
    }
}
