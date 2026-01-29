import { API_CONFIG } from '../../config/api';
import { ApiError } from './types';
import type { ApiResponse, ApiErrorResponse } from './types';
import type { AuthResponse, LoginCredentials, RegisterCredentials } from '../../types/auth';

/**
 * Authentication API service.
 *
 * All auth calls go through the .NET backend API, NOT directly to Supabase.
 * This service does NOT use the apiClient because auth calls don't have
 * an existing token (they're used to obtain tokens).
 */
export const authApi = {
  /**
   * Register a new user account.
   *
   * @param credentials - Email, password, and display name
   * @returns Authentication response with tokens and user info
   * @throws ApiError on failure
   */
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await fetch(`${API_CONFIG.API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const json = await response.json() as ApiResponse<AuthResponse> | ApiErrorResponse;

    if (!response.ok || !json.success) {
      throw ApiError.fromResponse(json as ApiErrorResponse, response.status);
    }

    return (json as ApiResponse<AuthResponse>).data;
  },

  /**
   * Log in with email and password.
   *
   * @param credentials - Email and password
   * @returns Authentication response with tokens and user info
   * @throws ApiError on failure
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await fetch(`${API_CONFIG.API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const json = await response.json() as ApiResponse<AuthResponse> | ApiErrorResponse;

    if (!response.ok || !json.success) {
      throw ApiError.fromResponse(json as ApiErrorResponse, response.status);
    }

    return (json as ApiResponse<AuthResponse>).data;
  },

  /**
   * Log out and invalidate the current session.
   *
   * @param accessToken - Current access token to invalidate
   */
  logout: async (accessToken: string): Promise<void> => {
    // Fire and forget - we clear tokens locally regardless of server response
    try {
      await fetch(`${API_CONFIG.API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    } catch {
      // Ignore errors - we're logging out anyway
    }
  },

  /**
   * Refresh an expired access token using the refresh token.
   *
   * @param refreshToken - The refresh token from previous authentication
   * @returns New authentication response with fresh tokens
   * @throws ApiError on failure (e.g., refresh token expired)
   */
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_CONFIG.API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const json = await response.json() as ApiResponse<AuthResponse> | ApiErrorResponse;

    if (!response.ok || !json.success) {
      throw ApiError.fromResponse(json as ApiErrorResponse, response.status);
    }

    return (json as ApiResponse<AuthResponse>).data;
  },

  /**
   * Request a password reset email.
   *
   * @param email - Email address to send reset link to
   * @throws ApiError on failure
   */
  forgotPassword: async (email: string): Promise<void> => {
    const response = await fetch(`${API_CONFIG.API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const json = await response.json() as ApiResponse<null> | ApiErrorResponse;

    if (!response.ok || !json.success) {
      throw ApiError.fromResponse(json as ApiErrorResponse, response.status);
    }
  },

  /**
   * Reset password using token from email.
   *
   * @param token - Reset token from the email link
   * @param newPassword - New password (minimum 8 characters)
   * @throws ApiError on failure
   */
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    const response = await fetch(`${API_CONFIG.API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    const json = await response.json() as ApiResponse<null> | ApiErrorResponse;

    if (!response.ok || !json.success) {
      throw ApiError.fromResponse(json as ApiErrorResponse, response.status);
    }
  },

  /**
   * Change password for the currently authenticated user.
   *
   * @param currentPassword - The user's current password for verification
   * @param newPassword - The new password (minimum 8 characters)
   * @throws ApiError on failure
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    const { tokenStorage } = await import('../tokenStorage');
    const accessToken = await tokenStorage.getAccessToken();

    if (!accessToken) {
      throw new ApiError('Not authenticated', 401);
    }

    const response = await fetch(`${API_CONFIG.API_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const json = await response.json() as ApiResponse<null> | ApiErrorResponse;

    if (!response.ok || !json.success) {
      throw ApiError.fromResponse(json as ApiErrorResponse, response.status);
    }
  },
};
