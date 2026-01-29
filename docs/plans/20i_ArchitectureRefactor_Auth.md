# Plan: Architecture Refactor - Authentication

## Summary

Refactor authentication to route all auth operations through the .NET API instead of direct Supabase Auth calls. This creates a new Auth feature slice in the backend that proxies to Supabase Auth, returning JWT tokens that the mobile app stores securely. The mobile app will no longer use the Supabase SDK for authentication - all auth flows go through the backend API.

**Goal**: Zero Supabase SDK usage in mobile app - all communication through .NET API.

## Prerequisites

- **20a_ArchitectureRefactor_HttpClient.md** must be complete (needs HTTP client)

## Execution Order Note

This plan should be executed:
- AFTER 20a (requires HTTP client infrastructure)
- BEFORE 20b-20g (other features depend on auth working)

## Affected Feature Slices

### Backend (Stepper.Api) - NEW Feature Slice

```
Stepper.Api/
  Auth/                           # NEW feature sliceLets 
    AuthController.cs             # HTTP endpoints
    AuthService.cs                # Business logic
    IAuthService.cs               # Service interface
    DTOs/
      LoginRequest.cs
      RegisterRequest.cs
      AuthResponse.cs
      RefreshTokenRequest.cs
      ForgotPasswordRequest.cs
      ResetPasswordRequest.cs
```

### Mobile (Stepper.Mobile)

- `services/api/authApi.ts`: NEW - Auth API calls via HTTP client
- `services/supabase.ts`: Remove auth functions, keep only client init
- `services/secureStore.ts`: Keep - used for JWT storage
- `store/authStore.ts`: Refactor to use authApi
- `App.tsx`: Refactor auth state management
- `screens/auth/`: Update hooks to use authApi

## Proposed Types

### Backend - Auth Feature Slice

| Type Name | Location | Responsibility |
|-----------|----------|----------------|
| `AuthController` | Auth/ | HTTP endpoints for auth operations |
| `AuthService` | Auth/ | Auth business logic, Supabase Auth proxy |
| `IAuthService` | Auth/ | Service interface |
| `LoginRequest` | Auth/DTOs | Email/password login request |
| `RegisterRequest` | Auth/DTOs | Registration with email, password, display name |
| `AuthResponse` | Auth/DTOs | JWT tokens + user info response |
| `RefreshTokenRequest` | Auth/DTOs | Refresh token for new access token |
| `ForgotPasswordRequest` | Auth/DTOs | Email for password reset |
| `ResetPasswordRequest` | Auth/DTOs | Token + new password |

### Mobile - Auth Types

| Type Name | Location | Responsibility |
|-----------|----------|----------------|
| `authApi` | services/api/authApi.ts | Auth API client |
| `AuthTokens` | types/auth.ts | Access/refresh token pair |
| `LoginCredentials` | types/auth.ts | Login request type |
| `RegisterCredentials` | types/auth.ts | Registration request type |

## Implementation Steps

### Phase 1: Backend - Auth Feature Slice Setup

#### Step 1.1: Create Auth DTOs

Create `Stepper.Api/Auth/DTOs/LoginRequest.cs`:
```csharp
namespace Stepper.Api.Auth.DTOs;

/// <summary>
/// Request to log in with email and password.
/// </summary>
public record LoginRequest(
    /// <summary>User's email address.</summary>
    string Email,
    /// <summary>User's password.</summary>
    string Password
);
```

Create `Stepper.Api/Auth/DTOs/RegisterRequest.cs`:
```csharp
namespace Stepper.Api.Auth.DTOs;

/// <summary>
/// Request to create a new account.
/// </summary>
public record RegisterRequest(
    /// <summary>User's email address.</summary>
    string Email,
    /// <summary>User's password (min 8 characters).</summary>
    string Password,
    /// <summary>User's display name.</summary>
    string DisplayName
);
```

Create `Stepper.Api/Auth/DTOs/AuthResponse.cs`:
```csharp
namespace Stepper.Api.Auth.DTOs;

/// <summary>
/// Response containing authentication tokens and user info.
/// </summary>
public record AuthResponse(
    /// <summary>JWT access token for API requests.</summary>
    string AccessToken,
    /// <summary>Refresh token for obtaining new access tokens.</summary>
    string RefreshToken,
    /// <summary>Token expiration time in seconds.</summary>
    int ExpiresIn,
    /// <summary>Authenticated user information.</summary>
    AuthUserInfo User
);

/// <summary>
/// Basic user information returned after authentication.
/// </summary>
public record AuthUserInfo(
    /// <summary>User's unique identifier.</summary>
    Guid Id,
    /// <summary>User's email address.</summary>
    string Email,
    /// <summary>User's display name.</summary>
    string? DisplayName
);
```

Create `Stepper.Api/Auth/DTOs/RefreshTokenRequest.cs`:
```csharp
namespace Stepper.Api.Auth.DTOs;

/// <summary>
/// Request to refresh an expired access token.
/// </summary>
public record RefreshTokenRequest(
    /// <summary>The refresh token from previous authentication.</summary>
    string RefreshToken
);
```

Create `Stepper.Api/Auth/DTOs/ForgotPasswordRequest.cs`:
```csharp
namespace Stepper.Api.Auth.DTOs;

/// <summary>
/// Request to send a password reset email.
/// </summary>
public record ForgotPasswordRequest(
    /// <summary>Email address to send reset link to.</summary>
    string Email
);
```

Create `Stepper.Api/Auth/DTOs/ResetPasswordRequest.cs`:
```csharp
namespace Stepper.Api.Auth.DTOs;

/// <summary>
/// Request to complete password reset with new password.
/// </summary>
public record ResetPasswordRequest(
    /// <summary>The reset token from the email link.</summary>
    string Token,
    /// <summary>The new password (min 8 characters).</summary>
    string NewPassword
);
```

#### Step 1.2: Create Auth Service Interface

Create `Stepper.Api/Auth/IAuthService.cs`:
```csharp
using Stepper.Api.Auth.DTOs;

namespace Stepper.Api.Auth;

/// <summary>
/// Service for authentication operations.
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Register a new user account.
    /// </summary>
    Task<AuthResponse> RegisterAsync(RegisterRequest request);

    /// <summary>
    /// Log in with email and password.
    /// </summary>
    Task<AuthResponse> LoginAsync(LoginRequest request);

    /// <summary>
    /// Log out and invalidate the session.
    /// </summary>
    Task LogoutAsync(string accessToken);

    /// <summary>
    /// Refresh an expired access token.
    /// </summary>
    Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request);

    /// <summary>
    /// Send a password reset email.
    /// </summary>
    Task ForgotPasswordAsync(ForgotPasswordRequest request);

    /// <summary>
    /// Complete password reset with new password.
    /// </summary>
    Task ResetPasswordAsync(ResetPasswordRequest request);
}
```

#### Step 1.3: Implement Auth Service

Create `Stepper.Api/Auth/AuthService.cs`:
```csharp
using Microsoft.Extensions.Options;
using Supabase.Gotrue;
using Stepper.Api.Auth.DTOs;
using Stepper.Api.Common.Configuration;

namespace Stepper.Api.Auth;

/// <summary>
/// Authentication service that proxies to Supabase Auth.
/// </summary>
public class AuthService : IAuthService
{
    private readonly SupabaseSettings _settings;
    private readonly ILogger<AuthService> _logger;
    private readonly HttpClient _httpClient;

    public AuthService(
        IOptions<SupabaseSettings> settings,
        ILogger<AuthService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _settings = settings.Value;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("Supabase");
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException("Email is required.");
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
            throw new ArgumentException("Password must be at least 8 characters.");
        if (string.IsNullOrWhiteSpace(request.DisplayName))
            throw new ArgumentException("Display name is required.");

        // Call Supabase Auth API
        var supabaseClient = await CreateSupabaseClientAsync();
        var session = await supabaseClient.Auth.SignUp(request.Email, request.Password, new SignUpOptions
        {
            Data = new Dictionary<string, object>
            {
                { "display_name", request.DisplayName }
            }
        });

        if (session?.User == null)
            throw new InvalidOperationException("Registration failed. Please check your email for verification.");

        return CreateAuthResponse(session);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            throw new ArgumentException("Email and password are required.");

        var supabaseClient = await CreateSupabaseClientAsync();
        var session = await supabaseClient.Auth.SignIn(request.Email, request.Password);

        if (session?.User == null)
            throw new InvalidOperationException("Invalid email or password.");

        return CreateAuthResponse(session);
    }

    public async Task LogoutAsync(string accessToken)
    {
        // Supabase logout via API
        var supabaseClient = await CreateSupabaseClientAsync();
        await supabaseClient.Auth.SignOut(accessToken);
    }

    public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            throw new ArgumentException("Refresh token is required.");

        var supabaseClient = await CreateSupabaseClientAsync();
        var session = await supabaseClient.Auth.RefreshSession(request.RefreshToken);

        if (session?.User == null)
            throw new InvalidOperationException("Failed to refresh token. Please log in again.");

        return CreateAuthResponse(session);
    }

    public async Task ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException("Email is required.");

        var supabaseClient = await CreateSupabaseClientAsync();
        await supabaseClient.Auth.ResetPasswordForEmail(request.Email, new ResetPasswordForEmailOptions
        {
            RedirectTo = "Stepper://reset-password"
        });
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            throw new ArgumentException("Reset token is required.");
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
            throw new ArgumentException("New password must be at least 8 characters.");

        var supabaseClient = await CreateSupabaseClientAsync();
        // Exchange token for session, then update password
        var session = await supabaseClient.Auth.ExchangeCodeForSession(request.Token);
        if (session == null)
            throw new InvalidOperationException("Invalid or expired reset token.");

        await supabaseClient.Auth.Update(new UserAttributes
        {
            Password = request.NewPassword
        });
    }

    private async Task<Supabase.Client> CreateSupabaseClientAsync()
    {
        var options = new Supabase.SupabaseOptions
        {
            AutoRefreshToken = false
        };

        var client = new Supabase.Client(_settings.Url, _settings.Key, options);
        await client.InitializeAsync();
        return client;
    }

    private static AuthResponse CreateAuthResponse(Session session)
    {
        var user = session.User!;
        var displayName = user.UserMetadata?.ContainsKey("display_name") == true
            ? user.UserMetadata["display_name"]?.ToString()
            : null;

        return new AuthResponse(
            AccessToken: session.AccessToken!,
            RefreshToken: session.RefreshToken!,
            ExpiresIn: session.ExpiresIn,
            User: new AuthUserInfo(
                Id: Guid.Parse(user.Id!),
                Email: user.Email!,
                DisplayName: displayName
            )
        );
    }
}
```

#### Step 1.4: Create Auth Controller

Create `Stepper.Api/Auth/AuthController.cs`:
```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Stepper.Api.Auth.DTOs;
using Stepper.Api.Common.Models;

namespace Stepper.Api.Auth;

/// <summary>
/// Authentication endpoints.
/// </summary>
[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    /// <summary>
    /// Register a new user account.
    /// </summary>
    /// <param name="request">Registration details.</param>
    /// <returns>Authentication tokens and user info.</returns>
    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var response = await _authService.RegisterAsync(request);
            return Ok(ApiResponse<AuthResponse>.Success(response));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.Failure(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Failure(ex.Message));
        }
    }

    /// <summary>
    /// Log in with email and password.
    /// </summary>
    /// <param name="request">Login credentials.</param>
    /// <returns>Authentication tokens and user info.</returns>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login([FromBody] LoginRequest request)
    {
        try
        {
            var response = await _authService.LoginAsync(request);
            return Ok(ApiResponse<AuthResponse>.Success(response));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.Failure(ex.Message));
        }
        catch (InvalidOperationException)
        {
            return Unauthorized(ApiResponse<object>.Failure("Invalid email or password."));
        }
    }

    /// <summary>
    /// Log out and invalidate the current session.
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<object>>> Logout()
    {
        var token = HttpContext.Request.Headers.Authorization
            .FirstOrDefault()?.Replace("Bearer ", "");

        if (!string.IsNullOrEmpty(token))
        {
            await _authService.LogoutAsync(token);
        }

        return Ok(ApiResponse<object>.Success(null!));
    }

    /// <summary>
    /// Refresh an expired access token.
    /// </summary>
    /// <param name="request">Refresh token.</param>
    /// <returns>New authentication tokens.</returns>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        try
        {
            var response = await _authService.RefreshTokenAsync(request);
            return Ok(ApiResponse<AuthResponse>.Success(response));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.Failure(ex.Message));
        }
        catch (InvalidOperationException)
        {
            return Unauthorized(ApiResponse<object>.Failure("Session expired. Please log in again."));
        }
    }

    /// <summary>
    /// Send a password reset email.
    /// </summary>
    /// <param name="request">Email address.</param>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<object>>> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        try
        {
            await _authService.ForgotPasswordAsync(request);
            // Always return success to prevent email enumeration
            return Ok(ApiResponse<object>.Success(null!));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.Failure(ex.Message));
        }
    }

    /// <summary>
    /// Reset password with token from email.
    /// </summary>
    /// <param name="request">Reset token and new password.</param>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<object>>> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        try
        {
            await _authService.ResetPasswordAsync(request);
            return Ok(ApiResponse<object>.Success(null!));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.Failure(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Failure(ex.Message));
        }
    }
}
```

#### Step 1.5: Register Auth Services

Update `Stepper.Api/Common/Extensions/ServiceCollectionExtensions.cs` or `Program.cs`:
```csharp
// Add to service registration
services.AddScoped<IAuthService, AuthService>();
services.AddHttpClient("Supabase"); // For Supabase API calls
```

### Phase 2: Mobile - Auth API Client

#### Step 2.1: Create Auth Types

Create `Stepper.Mobile/src/types/auth.ts`:
```typescript
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  displayName: string;
}
```

#### Step 2.2: Create Auth API Service

Create `Stepper.Mobile/src/services/api/authApi.ts`:
```typescript
import { API_CONFIG } from '../../config/api';
import { ApiError, ApiResponse } from './types';
import type { AuthResponse, LoginCredentials, RegisterCredentials } from '../../types/auth';

/**
 * Auth API - calls go to backend, NOT Supabase directly
 */
export const authApi = {
  /**
   * Register a new account
   */
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await fetch(`${API_CONFIG.API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const json = await response.json() as ApiResponse<AuthResponse>;

    if (!response.ok || !json.success) {
      throw ApiError.fromResponse(json as any, response.status);
    }

    return json.data;
  },

  /**
   * Log in with email and password
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await fetch(`${API_CONFIG.API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const json = await response.json() as ApiResponse<AuthResponse>;

    if (!response.ok || !json.success) {
      throw ApiError.fromResponse(json as any, response.status);
    }

    return json.data;
  },

  /**
   * Log out current session
   */
  logout: async (accessToken: string): Promise<void> => {
    await fetch(`${API_CONFIG.API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    // Ignore errors - we're logging out anyway
  },

  /**
   * Refresh expired access token
   */
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_CONFIG.API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const json = await response.json() as ApiResponse<AuthResponse>;

    if (!response.ok || !json.success) {
      throw ApiError.fromResponse(json as any, response.status);
    }

    return json.data;
  },

  /**
   * Request password reset email
   */
  forgotPassword: async (email: string): Promise<void> => {
    const response = await fetch(`${API_CONFIG.API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const json = await response.json() as ApiResponse<void>;

    if (!response.ok || !json.success) {
      throw ApiError.fromResponse(json as any, response.status);
    }
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    const response = await fetch(`${API_CONFIG.API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    const json = await response.json() as ApiResponse<void>;

    if (!response.ok || !json.success) {
      throw ApiError.fromResponse(json as any, response.status);
    }
  },
};
```

#### Step 2.3: Create Token Storage Service

Create `Stepper.Mobile/src/services/tokenStorage.ts`:
```typescript
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

export const tokenStorage = {
  /**
   * Store auth tokens securely
   */
  setTokens: async (accessToken: string, refreshToken: string, expiresIn: number): Promise<void> => {
    const expiryTime = Date.now() + (expiresIn * 1000);
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiryTime.toString()),
    ]);
  },

  /**
   * Get stored access token
   */
  getAccessToken: async (): Promise<string | null> => {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  /**
   * Get stored refresh token
   */
  getRefreshToken: async (): Promise<string | null> => {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  /**
   * Check if access token is expired (with 60s buffer)
   */
  isAccessTokenExpired: async (): Promise<boolean> => {
    const expiryStr = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
    if (!expiryStr) return true;
    const expiryTime = parseInt(expiryStr, 10);
    return Date.now() > (expiryTime - 60000); // 60s buffer
  },

  /**
   * Clear all stored tokens
   */
  clearTokens: async (): Promise<void> => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY),
    ]);
  },
};
```

#### Step 2.4: Update HTTP Client to Use Token Storage

Update `Stepper.Mobile/src/services/api/client.ts`:
```typescript
// Replace getAuthToken function:
import { tokenStorage } from '../tokenStorage';
import { authApi } from './authApi';

async function getAuthToken(): Promise<string | null> {
  const accessToken = await tokenStorage.getAccessToken();
  if (!accessToken) return null;

  // Check if token is expired and refresh if needed
  const isExpired = await tokenStorage.isAccessTokenExpired();
  if (isExpired) {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        const response = await authApi.refreshToken(refreshToken);
        await tokenStorage.setTokens(
          response.accessToken,
          response.refreshToken,
          response.expiresIn
        );
        return response.accessToken;
      } catch {
        // Refresh failed, clear tokens
        await tokenStorage.clearTokens();
        return null;
      }
    }
    return null;
  }

  return accessToken;
}
```

### Phase 3: Mobile - Refactor Auth Store and Screens

#### Step 3.1: Update Auth Store

Update `Stepper.Mobile/src/store/authStore.ts`:
```typescript
import { create } from 'zustand';
import { authApi } from '@services/api/authApi';
import { tokenStorage } from '@services/tokenStorage';
import { getErrorMessage } from '@utils/errorUtils';
import type { AuthUser } from '../types/auth';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ email, password });
      await tokenStorage.setTokens(
        response.accessToken,
        response.refreshToken,
        response.expiresIn
      );
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
      throw error;
    }
  },

  signUp: async (email, password, displayName) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register({ email, password, displayName });
      // Note: Supabase may require email verification
      // If tokens are returned, store them
      if (response.accessToken) {
        await tokenStorage.setTokens(
          response.accessToken,
          response.refreshToken,
          response.expiresIn
        );
        set({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // Email verification required
        set({ isLoading: false });
      }
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      const accessToken = await tokenStorage.getAccessToken();
      if (accessToken) {
        await authApi.logout(accessToken);
      }
      await tokenStorage.clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error: unknown) {
      // Clear tokens even if logout fails
      await tokenStorage.clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        error: getErrorMessage(error),
        isLoading: false,
      });
    }
  },

  resetPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.forgotPassword(email);
      set({ isLoading: false });
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
      throw error;
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const accessToken = await tokenStorage.getAccessToken();
      if (!accessToken) {
        set({ isLoading: false });
        return;
      }

      const isExpired = await tokenStorage.isAccessTokenExpired();
      if (isExpired) {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (refreshToken) {
          const response = await authApi.refreshToken(refreshToken);
          await tokenStorage.setTokens(
            response.accessToken,
            response.refreshToken,
            response.expiresIn
          );
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
        // No refresh token, clear and return
        await tokenStorage.clearTokens();
        set({ isLoading: false });
        return;
      }

      // Token is valid - fetch user info if needed
      // For now, we don't have user info without re-authenticating
      // This could be enhanced with a /auth/me endpoint
      set({
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      await tokenStorage.clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  clearError: () => set({ error: null }),
}));
```

#### Step 3.2: Update App.tsx

Update `Stepper.Mobile/App.tsx`:
```typescript
// Replace Supabase auth state management with:
import { useAuthStore } from '@store/authStore';

// In AppContent useEffect:
useEffect(() => {
  async function prepare() {
    try {
      // Validate configuration
      if (!validateConfig()) {
        const error = 'Invalid app configuration.';
        setInitError(error);
        setIsReady(true);
        await SplashScreen.hideAsync();
        return;
      }

      // Restore session from secure storage
      await restoreSession();

      // Fetch user profile if authenticated
      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        await fetchCurrentUser();
      }

      setIsReady(true);
      await SplashScreen.hideAsync();
    } catch (error) {
      setInitError('Failed to initialize app.');
      setIsReady(true);
      await SplashScreen.hideAsync();
    }
  }

  prepare();
}, []);
```

#### Step 3.3: Update Auth Screen Hooks

Update auth hooks to use `authApi` instead of direct Supabase calls:

- `src/screens/auth/hooks/useLogin.ts`
- `src/screens/auth/hooks/useRegister.ts`
- `src/screens/auth/hooks/useForgotPassword.ts`

### Phase 4: Cleanup

#### Step 4.1: Remove Supabase Auth from Mobile

Update `Stepper.Mobile/src/services/supabase.ts`:
```typescript
// Remove all auth-related exports
// Keep only the Supabase client for real-time subscriptions (if still needed)

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// NOTE: This client is ONLY for real-time subscriptions
// All data operations go through the .NET API
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Disable auto-refresh since we handle tokens manually
    autoRefreshToken: false,
    persistSession: false,
  },
});

// All auth functions REMOVED - use authApi instead
```

#### Step 4.2: Remove Unused Hooks

Delete or update:
- `src/hooks/useSupabaseAuth.ts` - Remove or update

## Dependencies

### New Packages Required

**Backend**: None - Uses existing Supabase SDK

**Mobile**: None - Uses existing expo-secure-store

## Database Changes

**None** - Auth is handled by Supabase Auth, no schema changes

## Tests

### Backend Unit Tests

Create tests in `Stepper.Api.Tests/Auth/`:
- `AuthServiceTests.cs` - Test register, login, logout, refresh
- Mock Supabase client for unit tests

### Backend Integration Tests

Create tests in `Stepper.Api.Tests/Auth/`:
- `AuthControllerTests.cs` - Test HTTP endpoints
- Test error responses (400, 401)
- Test success responses

### Mobile Tests

Update/create tests:
- `Stepper.Mobile/src/services/api/__tests__/authApi.test.ts`
- `Stepper.Mobile/src/services/__tests__/tokenStorage.test.ts`
- `Stepper.Mobile/src/store/__tests__/authStore.test.ts`
- Update screen tests to mock `authApi` instead of Supabase

## Acceptance Criteria

### Backend

- [ ] `POST /api/v1/auth/register` creates account and returns JWT
- [ ] `POST /api/v1/auth/login` authenticates and returns JWT
- [ ] `POST /api/v1/auth/logout` invalidates session
- [ ] `POST /api/v1/auth/refresh` returns new tokens from refresh token
- [ ] `POST /api/v1/auth/forgot-password` sends reset email
- [ ] `POST /api/v1/auth/reset-password` completes password reset
- [ ] All endpoints return proper error responses
- [ ] All endpoints have XML documentation
- [ ] Auth endpoints are unauthenticated (except logout)

### Mobile

- [ ] Login works through backend API
- [ ] Registration works through backend API
- [ ] Password reset works through backend API
- [ ] JWT tokens stored securely in expo-secure-store
- [ ] Token auto-refresh works when expired
- [ ] Session restoration works on app restart
- [ ] Logout clears all tokens
- [ ] ZERO direct Supabase Auth calls in production code
- [ ] All existing auth functionality works as before

## Risks & Open Questions

### Risks

1. **Token refresh timing**: Race conditions when multiple requests need refresh
   - Mitigation: Implement request queuing during refresh

2. **Deep linking for password reset**: Reset links need to open app
   - Mitigation: Document deep link setup requirements

3. **Email verification flow**: Supabase may require email verification
   - Mitigation: Handle "email not verified" response appropriately

### Open Questions

1. **OAuth (Google/Apple Sign-In)**: Not in scope for this plan
   - Future work: Would require deep linking and OAuth flow through backend
   - Note: Google OAuth currently uses browser-based flow with Supabase
   - To fully remove Supabase SDK, OAuth would need backend implementation

2. **Remember Me**: Should we support longer session durations?
   - Current: Use Supabase default expiration
   - Future: Can add "rememberMe" flag to login request

## OAuth Future Considerations

Currently, Google OAuth uses:
```typescript
// Current implementation (Supabase SDK)
const { url } = await supabase.auth.signInWithOAuth({ provider: 'google' });
// Opens browser, redirects back with tokens in URL fragment
```

To fully remove Supabase SDK, OAuth would need:
1. Backend endpoint to initiate OAuth: `GET /api/v1/auth/oauth/google`
2. Backend callback endpoint: `GET /api/v1/auth/oauth/callback`
3. Deep linking configuration in mobile app
4. URL scheme handling for redirect

This is OUT OF SCOPE for this plan and documented for future reference.

## Agent Assignment

| Phase | Agent | Notes |
|-------|-------|-------|
| 1 | Backend Engineer | Create Auth feature slice |
| 2-3 | Frontend Engineer | Auth API and store refactoring |
| 4 | Frontend Engineer | Cleanup |
| Tests | Tester | Write and verify tests |

## Handoff to Next Plans

After this plan is complete:
- Plans 20b through 20g can proceed (they depend on auth working)
- All feature APIs will use the HTTP client that now handles JWT from backend
