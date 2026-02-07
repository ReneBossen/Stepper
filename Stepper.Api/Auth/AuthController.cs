using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Stepper.Api.Auth.DTOs;
using Stepper.Api.Common.Models;

namespace Stepper.Api.Auth;

/// <summary>
/// Controller for authentication endpoints.
/// </summary>
[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthController"/> class.
    /// </summary>
    /// <param name="authService">The authentication service.</param>
    public AuthController(IAuthService authService)
    {
        ArgumentNullException.ThrowIfNull(authService);
        _authService = authService;
    }

    /// <summary>
    /// Registers a new user account.
    /// </summary>
    /// <param name="request">The registration request.</param>
    /// <returns>The authentication response with tokens and user info.</returns>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Register([FromBody] RegisterRequest request)
    {
        if (request == null)
        {
            return BadRequest(ApiResponse<AuthResponse>.ErrorResponse("Request body cannot be null."));
        }

        var response = await _authService.RegisterAsync(request);
        return Ok(ApiResponse<AuthResponse>.SuccessResponse(response));
    }

    /// <summary>
    /// Authenticates a user with email and password.
    /// </summary>
    /// <param name="request">The login request.</param>
    /// <returns>The authentication response with tokens and user info.</returns>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login([FromBody] LoginRequest request)
    {
        if (request == null)
        {
            return BadRequest(ApiResponse<AuthResponse>.ErrorResponse("Request body cannot be null."));
        }

        var response = await _authService.LoginAsync(request);
        return Ok(ApiResponse<AuthResponse>.SuccessResponse(response));
    }

    /// <summary>
    /// Logs out the current user by invalidating their session.
    /// </summary>
    /// <returns>A success response if logout was successful.</returns>
    [HttpPost("logout")]
    public async Task<ActionResult<ApiResponse<object>>> Logout()
    {
        var accessToken = ExtractAccessToken();

        if (string.IsNullOrWhiteSpace(accessToken))
        {
            return Unauthorized(ApiResponse<object>.ErrorResponse("No valid access token provided."));
        }

        await _authService.LogoutAsync(accessToken);
        return Ok(ApiResponse<object>.SuccessResponse(new { message = "Successfully logged out." }));
    }

    /// <summary>
    /// Refreshes an expired access token using a refresh token.
    /// </summary>
    /// <param name="request">The refresh token request.</param>
    /// <returns>The authentication response with new tokens.</returns>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        if (request == null)
        {
            return BadRequest(ApiResponse<AuthResponse>.ErrorResponse("Request body cannot be null."));
        }

        var response = await _authService.RefreshTokenAsync(request);
        return Ok(ApiResponse<AuthResponse>.SuccessResponse(response));
    }

    /// <summary>
    /// Initiates a password reset by sending a reset email to the user.
    /// </summary>
    /// <param name="request">The forgot password request.</param>
    /// <returns>A success response (always returns success to prevent email enumeration).</returns>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<object>>> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (request == null)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse("Request body cannot be null."));
        }

        await _authService.ForgotPasswordAsync(request);
        // Always return success to prevent email enumeration attacks
        return Ok(ApiResponse<object>.SuccessResponse(new { message = "If an account with that email exists, a password reset link has been sent." }));
    }

    /// <summary>
    /// Completes a password reset using the token from the reset email.
    /// </summary>
    /// <param name="request">The reset password request.</param>
    /// <returns>A success response if the password was reset successfully.</returns>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<object>>> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (request == null)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse("Request body cannot be null."));
        }

        await _authService.ResetPasswordAsync(request);
        return Ok(ApiResponse<object>.SuccessResponse(new { message = "Password has been reset successfully." }));
    }

    /// <summary>
    /// Changes the authenticated user's password.
    /// </summary>
    /// <param name="request">The change password request.</param>
    /// <returns>A success response if the password was changed successfully.</returns>
    [HttpPost("change-password")]
    public async Task<ActionResult<ApiResponse<object>>> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (request == null)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse("Request body cannot be null."));
        }

        var accessToken = ExtractAccessToken();

        if (string.IsNullOrWhiteSpace(accessToken))
        {
            return Unauthorized(ApiResponse<object>.ErrorResponse("No valid access token provided."));
        }

        await _authService.ChangePasswordAsync(accessToken, request);
        return Ok(ApiResponse<object>.SuccessResponse(new { message = "Password has been changed successfully." }));
    }

    private string? ExtractAccessToken()
    {
        var authHeader = Request.Headers.Authorization.FirstOrDefault();

        if (string.IsNullOrWhiteSpace(authHeader))
        {
            return null;
        }

        const string bearerPrefix = "Bearer ";
        if (authHeader.StartsWith(bearerPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return authHeader[bearerPrefix.Length..].Trim();
        }

        return null;
    }
}
