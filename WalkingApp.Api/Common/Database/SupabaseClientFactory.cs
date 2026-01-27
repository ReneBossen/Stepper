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
        ArgumentNullException.ThrowIfNull(settings);
        ArgumentNullException.ThrowIfNull(settings.Value);
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
            AutoConnectRealtime = false,
            Headers = new Dictionary<string, string>
            {
                { "Authorization", $"Bearer {jwtToken}" },
                { "apikey", _settings.AnonKey }
            }
        };

        var client = new Client(_settings.Url, _settings.AnonKey, options);
        await client.InitializeAsync();

        // Ensure Postgrest sub-client has both required headers for auth.uid() to resolve
        client.Postgrest.Options.Headers["Authorization"] = $"Bearer {jwtToken}";
        client.Postgrest.Options.Headers["apikey"] = _settings.AnonKey;

        return client;
    }

    /// <inheritdoc />
    public async Task<Client> CreateAnonymousClientAsync()
    {
        var options = new SupabaseOptions
        {
            // Disable auto-connect to Realtime websockets - causes 403 errors when using
            // per-request JWT tokens since Realtime requires a persistent connection
            AutoConnectRealtime = false
        };

        var client = new Client(_settings.Url, _settings.AnonKey, options);
        await client.InitializeAsync();

        return client;
    }
}
