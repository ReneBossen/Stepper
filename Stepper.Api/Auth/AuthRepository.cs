using Microsoft.Extensions.Options;
using Supabase.Gotrue;
using Stepper.Api.Common.Configuration;
using SupabaseClient = Supabase.Client;

namespace Stepper.Api.Auth;

/// <summary>
/// Repository implementation for Supabase authentication operations.
/// Manages Supabase client creation and delegates to the Supabase Auth SDK.
/// </summary>
public class AuthRepository : IAuthRepository
{
    private readonly SupabaseSettings _settings;

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthRepository"/> class.
    /// </summary>
    /// <param name="settings">The Supabase configuration settings.</param>
    public AuthRepository(IOptions<SupabaseSettings> settings)
    {
        ArgumentNullException.ThrowIfNull(settings);
        _settings = settings.Value;
    }

    /// <inheritdoc />
    public async Task<Session?> SignUpAsync(string email, string password, Dictionary<string, object>? metadata = null)
    {
        var client = await CreateClientAsync();

        var options = metadata != null
            ? new SignUpOptions { Data = metadata }
            : null;

        return await client.Auth.SignUp(email, password, options);
    }

    /// <inheritdoc />
    public async Task<Session?> SignInAsync(string email, string password)
    {
        var client = await CreateClientAsync();
        return await client.Auth.SignIn(email, password);
    }

    /// <inheritdoc />
    public async Task SignOutAsync(string accessToken)
    {
        var client = await CreateAuthenticatedClientAsync(accessToken);
        await client.Auth.SignOut();
    }

    /// <inheritdoc />
    public async Task<Session?> RefreshSessionAsync(string refreshToken)
    {
        var client = await CreateClientAsync();
        await client.Auth.SetSession(string.Empty, refreshToken);
        return await client.Auth.RefreshSession();
    }

    /// <inheritdoc />
    public async Task ResetPasswordForEmailAsync(string email)
    {
        var client = await CreateClientAsync();
        await client.Auth.ResetPasswordForEmail(email);
    }

    /// <inheritdoc />
    public async Task<Session?> ExchangeCodeForSessionAsync(string code)
    {
        var client = await CreateClientAsync();
        return await client.Auth.ExchangeCodeForSession(code, code);
    }

    /// <inheritdoc />
    public async Task UpdateUserPasswordAsync(string accessToken, string newPassword)
    {
        var client = await CreateAuthenticatedClientAsync(accessToken);
        await client.Auth.Update(new UserAttributes
        {
            Password = newPassword
        });
    }

    /// <inheritdoc />
    public async Task<string?> GetUserEmailAsync(string accessToken)
    {
        var client = await CreateAuthenticatedClientAsync(accessToken);
        return client.Auth.CurrentUser?.Email;
    }

    private async Task<SupabaseClient> CreateClientAsync()
    {
        var options = new Supabase.SupabaseOptions
        {
            AutoConnectRealtime = false
        };

        var client = new SupabaseClient(_settings.Url, _settings.AnonKey, options);
        await client.InitializeAsync();

        return client;
    }

    private async Task<SupabaseClient> CreateAuthenticatedClientAsync(string accessToken)
    {
        var options = new Supabase.SupabaseOptions
        {
            AutoConnectRealtime = false,
            Headers = new Dictionary<string, string>
            {
                { "Authorization", $"Bearer {accessToken}" }
            }
        };

        var client = new SupabaseClient(_settings.Url, _settings.AnonKey, options);
        await client.InitializeAsync();

        await client.Auth.SetSession(accessToken, string.Empty);

        return client;
    }
}
