/**
 * Authentication tokens returned by the backend.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * User information returned after authentication.
 */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

/**
 * Full authentication response from the backend.
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
  /** Whether the user needs to confirm their email before logging in. */
  requiresEmailConfirmation?: boolean;
}

/**
 * Credentials for login request.
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Credentials for registration request.
 */
export interface RegisterCredentials {
  email: string;
  password: string;
  displayName: string;
}
