using Microsoft.Extensions.Options;
using Supabase.Gotrue;
using Supabase.Gotrue.Exceptions;
using WalkingApp.Api.Auth.DTOs;
using WalkingApp.Api.Common.Configuration;
using SupabaseClient = Supabase.Client;

namespace WalkingApp.Api.Auth;

/// <summary>
/// Service implementation for authentication operations using Supabase Auth.
/// </summary>
public class AuthService : IAuthService
{
    private const int MinPasswordLength = 6;
    private const int MinDisplayNameLength = 2;
    private const int MaxDisplayNameLength = 50;

    private readonly SupabaseSettings _settings;
    private readonly ILogger<AuthService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthService"/> class.
    /// </summary>
    /// <param name="settings">The Supabase configuration settings.</param>
    /// <param name="logger">The logger instance.</param>
    public AuthService(IOptions<SupabaseSettings> settings, ILogger<AuthService> logger)
    {
        ArgumentNullException.ThrowIfNull(settings);
        ArgumentNullException.ThrowIfNull(logger);
        _settings = settings.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        ValidateRegisterRequest(request);

        var client = await CreateSupabaseClientAsync();

        try
        {
            var session = await client.Auth.SignUp(
                request.Email,
                request.Password,
                new SignUpOptions
                {
                    Data = new Dictionary<string, object>
                    {
                        { "display_name", request.DisplayName }
                    }
                });

            EnsureSessionValid(session);

            return MapToAuthResponse(session!);
        }
        catch (GotrueException ex)
        {
            _logger.LogWarning(ex, "Registration failed for email: {Email}", request.Email);
            throw new InvalidOperationException(GetFriendlyAuthErrorMessage(ex), ex);
        }
    }

    /// <inheritdoc />
    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        ValidateLoginRequest(request);

        var client = await CreateSupabaseClientAsync();

        try
        {
            var session = await client.Auth.SignIn(request.Email, request.Password);

            EnsureSessionValid(session);

            return MapToAuthResponse(session!);
        }
        catch (GotrueException ex)
        {
            _logger.LogWarning(ex, "Login failed for email: {Email}", request.Email);
            throw new UnauthorizedAccessException("Invalid email or password.", ex);
        }
    }

    /// <inheritdoc />
    public async Task LogoutAsync(string accessToken)
    {
        if (string.IsNullOrWhiteSpace(accessToken))
        {
            throw new ArgumentException("Access token cannot be empty.", nameof(accessToken));
        }

        var client = await CreateAuthenticatedClientAsync(accessToken);

        try
        {
            await client.Auth.SignOut();
        }
        catch (GotrueException ex)
        {
            _logger.LogWarning(ex, "Logout failed");
            throw new InvalidOperationException("Failed to logout. Please try again.", ex);
        }
    }

    /// <inheritdoc />
    public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request)
    {
        ValidateRefreshTokenRequest(request);

        var client = await CreateSupabaseClientAsync();

        try
        {
            // Set the session with the refresh token to enable refresh
            await client.Auth.SetSession(string.Empty, request.RefreshToken);
            var session = await client.Auth.RefreshSession();

            EnsureSessionValid(session);

            return MapToAuthResponse(session!);
        }
        catch (GotrueException ex)
        {
            _logger.LogWarning(ex, "Token refresh failed");
            throw new UnauthorizedAccessException("Invalid or expired refresh token.", ex);
        }
    }

    /// <inheritdoc />
    public async Task ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        ValidateForgotPasswordRequest(request);

        var client = await CreateSupabaseClientAsync();

        try
        {
            await client.Auth.ResetPasswordForEmail(request.Email);
        }
        catch (GotrueException ex)
        {
            // Log but don't expose whether the email exists
            _logger.LogWarning(ex, "Password reset request failed for email: {Email}", request.Email);
            // Don't throw - we don't want to reveal if email exists
        }
    }

    /// <inheritdoc />
    public async Task ResetPasswordAsync(ResetPasswordRequest request)
    {
        ValidateResetPasswordRequest(request);

        var client = await CreateSupabaseClientAsync();

        try
        {
            // First verify the token by exchanging it for a session
            var session = await client.Auth.ExchangeCodeForSession(request.Token, request.Token);

            if (session?.AccessToken == null)
            {
                throw new InvalidOperationException("Invalid or expired reset token.");
            }

            // Now update the password using the session
            var authenticatedClient = await CreateAuthenticatedClientAsync(session.AccessToken);
            await authenticatedClient.Auth.Update(new UserAttributes
            {
                Password = request.NewPassword
            });
        }
        catch (GotrueException ex)
        {
            _logger.LogWarning(ex, "Password reset failed");
            throw new InvalidOperationException("Failed to reset password. The link may have expired.", ex);
        }
    }

    /// <inheritdoc />
    public async Task ChangePasswordAsync(string accessToken, ChangePasswordRequest request)
    {
        ValidateChangePasswordRequest(accessToken, request);

        var client = await CreateAuthenticatedClientAsync(accessToken);
        var currentUser = client.Auth.CurrentUser;

        EnsureUserIsAuthenticated(currentUser);

        await VerifyCurrentPassword(currentUser!.Email!, request.CurrentPassword);
        await UpdatePassword(client, request.NewPassword);
    }

    private async Task VerifyCurrentPassword(string email, string currentPassword)
    {
        var client = await CreateSupabaseClientAsync();

        try
        {
            await client.Auth.SignIn(email, currentPassword);
        }
        catch (GotrueException ex)
        {
            _logger.LogWarning(ex, "Password verification failed during change password for email: {Email}", email);
            throw new UnauthorizedAccessException("Current password is incorrect.", ex);
        }
    }

    private static async Task UpdatePassword(SupabaseClient client, string newPassword)
    {
        try
        {
            await client.Auth.Update(new UserAttributes
            {
                Password = newPassword
            });
        }
        catch (GotrueException ex)
        {
            throw new InvalidOperationException("Failed to update password. Please try again.", ex);
        }
    }

    private static void EnsureUserIsAuthenticated(Supabase.Gotrue.User? user)
    {
        if (user?.Email == null)
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }
    }

    private static void ValidateChangePasswordRequest(string accessToken, ChangePasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(accessToken))
        {
            throw new ArgumentException("Access token cannot be empty.", nameof(accessToken));
        }

        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            throw new ArgumentException("Current password cannot be empty.");
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw new ArgumentException("New password cannot be empty.");
        }

        if (request.NewPassword.Length < MinPasswordLength)
        {
            throw new ArgumentException($"New password must be at least {MinPasswordLength} characters long.");
        }

        if (request.CurrentPassword == request.NewPassword)
        {
            throw new ArgumentException("New password must be different from current password.");
        }
    }

    private async Task<SupabaseClient> CreateSupabaseClientAsync()
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

        // Set the session with the access token
        await client.Auth.SetSession(accessToken, string.Empty);

        return client;
    }

    private static void ValidateRegisterRequest(RegisterRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            throw new ArgumentException("Email cannot be empty.");
        }

        if (!IsValidEmail(request.Email))
        {
            throw new ArgumentException("Invalid email format.");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            throw new ArgumentException("Password cannot be empty.");
        }

        if (request.Password.Length < MinPasswordLength)
        {
            throw new ArgumentException($"Password must be at least {MinPasswordLength} characters long.");
        }

        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            throw new ArgumentException("Display name cannot be empty.");
        }

        if (request.DisplayName.Length < MinDisplayNameLength)
        {
            throw new ArgumentException($"Display name must be at least {MinDisplayNameLength} characters long.");
        }

        if (request.DisplayName.Length > MaxDisplayNameLength)
        {
            throw new ArgumentException($"Display name cannot exceed {MaxDisplayNameLength} characters.");
        }
    }

    private static void ValidateLoginRequest(LoginRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            throw new ArgumentException("Email cannot be empty.");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            throw new ArgumentException("Password cannot be empty.");
        }
    }

    private static void ValidateRefreshTokenRequest(RefreshTokenRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            throw new ArgumentException("Refresh token cannot be empty.");
        }
    }

    private static void ValidateForgotPasswordRequest(ForgotPasswordRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            throw new ArgumentException("Email cannot be empty.");
        }

        if (!IsValidEmail(request.Email))
        {
            throw new ArgumentException("Invalid email format.");
        }
    }

    private static void ValidateResetPasswordRequest(ResetPasswordRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.Token))
        {
            throw new ArgumentException("Reset token cannot be empty.");
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw new ArgumentException("New password cannot be empty.");
        }

        if (request.NewPassword.Length < MinPasswordLength)
        {
            throw new ArgumentException($"Password must be at least {MinPasswordLength} characters long.");
        }
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }

    private static void EnsureSessionValid(Session? session)
    {
        if (session?.AccessToken == null || session.User == null)
        {
            throw new InvalidOperationException("Authentication failed. Please try again.");
        }
    }

    private static AuthResponse MapToAuthResponse(Session session)
    {
        var displayName = session.User?.UserMetadata?.TryGetValue("display_name", out var name) == true
            ? name?.ToString()
            : null;

        return new AuthResponse(
            AccessToken: session.AccessToken!,
            RefreshToken: session.RefreshToken ?? string.Empty,
            ExpiresIn: session.ExpiresIn,
            User: new AuthUserInfo(
                Id: Guid.Parse(session.User!.Id!),
                Email: session.User.Email!,
                DisplayName: displayName
            )
        );
    }

    private static string GetFriendlyAuthErrorMessage(GotrueException ex)
    {
        // Supabase error messages can vary, so we provide friendly alternatives
        var message = ex.Message?.ToLowerInvariant() ?? string.Empty;

        if (message.Contains("already registered") || message.Contains("user already exists"))
        {
            return "An account with this email already exists.";
        }

        if (message.Contains("invalid") && message.Contains("email"))
        {
            return "Invalid email address.";
        }

        if (message.Contains("weak") || message.Contains("password"))
        {
            return "Password is too weak. Please use a stronger password.";
        }

        return "Registration failed. Please check your information and try again.";
    }
}
