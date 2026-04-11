using System.Net.Http.Headers;
using System.Text.Json;
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
    private readonly IHttpClientFactory _httpClientFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthRepository"/> class.
    /// </summary>
    /// <param name="settings">The Supabase configuration settings.</param>
    /// <param name="httpClientFactory">HTTP client factory for direct Supabase API calls.</param>
    public AuthRepository(IOptions<SupabaseSettings> settings, IHttpClientFactory httpClientFactory)
    {
        ArgumentNullException.ThrowIfNull(settings);
        ArgumentNullException.ThrowIfNull(httpClientFactory);
        _settings = settings.Value;
        _httpClientFactory = httpClientFactory;
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
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        httpClient.DefaultRequestHeaders.Add("apikey", _settings.AnonKey);

        var response = await httpClient.PostAsync($"{_settings.Url}/auth/v1/logout", null);
        response.EnsureSuccessStatusCode();
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
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        httpClient.DefaultRequestHeaders.Add("apikey", _settings.AnonKey);

        var content = new StringContent(
            JsonSerializer.Serialize(new { password = newPassword }),
            System.Text.Encoding.UTF8,
            "application/json");

        var response = await httpClient.PutAsync($"{_settings.Url}/auth/v1/user", content);
        response.EnsureSuccessStatusCode();
    }

    /// <inheritdoc />
    public async Task<string?> GetUserEmailAsync(string accessToken)
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        httpClient.DefaultRequestHeaders.Add("apikey", _settings.AnonKey);

        var response = await httpClient.GetAsync($"{_settings.Url}/auth/v1/user");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.TryGetProperty("email", out var emailProp)
            ? emailProp.GetString()
            : null;
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

}
