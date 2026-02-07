using Supabase.Gotrue;
using Supabase.Gotrue.Exceptions;
using Stepper.Api.Auth.DTOs;

namespace Stepper.Api.Auth;

/// <summary>
/// Service implementation for authentication operations.
/// Contains business logic, validation, and error mapping.
/// Delegates Supabase interactions to <see cref="IAuthRepository"/>.
/// </summary>
public class AuthService : IAuthService
{
    private const int MinPasswordLength = 6;
    private const int MinDisplayNameLength = 2;
    private const int MaxDisplayNameLength = 50;

    private readonly IAuthRepository _authRepository;
    private readonly ILogger<AuthService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthService"/> class.
    /// </summary>
    /// <param name="authRepository">The authentication repository for Supabase operations.</param>
    /// <param name="logger">The logger instance.</param>
    public AuthService(IAuthRepository authRepository, ILogger<AuthService> logger)
    {
        ArgumentNullException.ThrowIfNull(authRepository);
        ArgumentNullException.ThrowIfNull(logger);
        _authRepository = authRepository;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        ValidateRegisterRequest(request);

        try
        {
            var metadata = new Dictionary<string, object>
            {
                { "display_name", request.DisplayName }
            };

            var session = await _authRepository.SignUpAsync(request.Email, request.Password, metadata);

            if (IsAwaitingEmailConfirmation(session))
            {
                _logger.LogInformation("Registration successful for email: {Email}, awaiting email confirmation", request.Email);
                return MapToEmailConfirmationResponse(session!, request.DisplayName);
            }

            EnsureSessionValid(session);

            return MapToAuthResponse(session!);
        }
        catch (GotrueException ex)
        {
            _logger.LogWarning(ex, "Registration failed for email: {Email}. Supabase error: {Message}", request.Email, ex.Message);
            throw new InvalidOperationException(GetFriendlyAuthErrorMessage(ex), ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during registration for email: {Email}. Error type: {Type}, Message: {Message}",
                request.Email, ex.GetType().Name, ex.Message);
            throw new InvalidOperationException("Registration failed. Please try again.", ex);
        }
    }

    /// <inheritdoc />
    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        ValidateLoginRequest(request);

        try
        {
            var session = await _authRepository.SignInAsync(request.Email, request.Password);

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

        try
        {
            await _authRepository.SignOutAsync(accessToken);
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

        try
        {
            var session = await _authRepository.RefreshSessionAsync(request.RefreshToken);

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

        try
        {
            await _authRepository.ResetPasswordForEmailAsync(request.Email);
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

        try
        {
            var session = await _authRepository.ExchangeCodeForSessionAsync(request.Token);

            if (session?.AccessToken == null)
            {
                throw new InvalidOperationException("Invalid or expired reset token.");
            }

            await _authRepository.UpdateUserPasswordAsync(session.AccessToken, request.NewPassword);
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

        var email = await _authRepository.GetUserEmailAsync(accessToken);
        EnsureUserEmailResolved(email);

        await VerifyCurrentPassword(email!, request.CurrentPassword);
        await UpdatePassword(accessToken, request.NewPassword);
    }

    private async Task VerifyCurrentPassword(string email, string currentPassword)
    {
        try
        {
            await _authRepository.SignInAsync(email, currentPassword);
        }
        catch (GotrueException ex)
        {
            _logger.LogWarning(ex, "Password verification failed during change password for email: {Email}", email);
            throw new UnauthorizedAccessException("Current password is incorrect.", ex);
        }
    }

    private async Task UpdatePassword(string accessToken, string newPassword)
    {
        try
        {
            await _authRepository.UpdateUserPasswordAsync(accessToken, newPassword);
        }
        catch (GotrueException ex)
        {
            throw new InvalidOperationException("Failed to update password. Please try again.", ex);
        }
    }

    private static void EnsureUserEmailResolved(string? email)
    {
        if (string.IsNullOrEmpty(email))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }
    }

    private static bool IsAwaitingEmailConfirmation(Session? session)
    {
        return session?.User != null && session.AccessToken == null;
    }

    private static AuthResponse MapToEmailConfirmationResponse(Session session, string displayName)
    {
        return new AuthResponse(
            AccessToken: string.Empty,
            RefreshToken: string.Empty,
            ExpiresIn: 0,
            User: new AuthUserInfo(
                Id: Guid.Parse(session.User!.Id!),
                Email: session.User.Email!,
                DisplayName: displayName
            ),
            RequiresEmailConfirmation: true
        );
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
        var message = ex.Message?.ToLowerInvariant() ?? string.Empty;

        if (message.Contains("rate limit") || message.Contains("over_email_send_rate_limit"))
        {
            return "Too many attempts. Please wait a minute and try again.";
        }

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
