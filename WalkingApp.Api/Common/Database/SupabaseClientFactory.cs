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
            AutoConnectRealtime = true,
            Headers = new Dictionary<string, string>
            {
                { "Authorization", $"Bearer {jwtToken}" }
            }
        };

        var client = new Client(_settings.Url, _settings.AnonKey, options);
        await client.InitializeAsync();

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
