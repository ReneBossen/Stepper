// Create mocks that can be tracked
const mockGetSession = jest.fn();
const mockGetUser = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockSignInWithIdToken = jest.fn();
const mockSetSession = jest.fn();
const mockOnAuthStateChange = jest.fn(() => ({
  data: { subscription: { unsubscribe: jest.fn() } },
}));

// Track createClient calls
let createClientCalls: any[] = [];

// Mock @supabase/supabase-js before importing
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn((...args: any[]) => {
    createClientCalls.push(args);
    return {
      auth: {
        getSession: mockGetSession,
        getUser: mockGetUser,
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
        signOut: mockSignOut,
        resetPasswordForEmail: mockResetPasswordForEmail,
        signInWithOAuth: mockSignInWithOAuth,
        signInWithIdToken: mockSignInWithIdToken,
        setSession: mockSetSession,
        onAuthStateChange: mockOnAuthStateChange,
      },
    };
  }),
}));

import {
  supabase,
  getSession,
  getCurrentUser,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  resetPassword,
  signInWithGoogleOAuth,
  signInWithIdToken,
} from '../supabase';
import { ExpoSecureStoreAdapter } from '../secureStore';

describe('Supabase Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create Supabase client with correct URL and key', () => {
    expect(createClientCalls.length).toBeGreaterThan(0);
    const [url, key, config] = createClientCalls[0];

    expect(url).toBe('https://test.supabase.co');
    expect(key).toBe('test-anon-key');
    expect(config.auth.storage).toBe(ExpoSecureStoreAdapter);
    expect(config.auth.autoRefreshToken).toBe(true);
    expect(config.auth.persistSession).toBe(true);
    expect(config.auth.detectSessionInUrl).toBe(false);
  });

  it('should export supabase client instance', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });

  it('should configure auth with SecureStore adapter', () => {
    expect(createClientCalls.length).toBeGreaterThan(0);
    const config = createClientCalls[0][2];
    expect(config?.auth?.storage).toBe(ExpoSecureStoreAdapter);
  });

  it('should enable auto refresh token', () => {
    expect(createClientCalls.length).toBeGreaterThan(0);
    const config = createClientCalls[0][2];
    expect(config?.auth?.autoRefreshToken).toBe(true);
  });

  it('should enable session persistence', () => {
    expect(createClientCalls.length).toBeGreaterThan(0);
    const config = createClientCalls[0][2];
    expect(config?.auth?.persistSession).toBe(true);
  });

  it('should disable session detection in URL', () => {
    expect(createClientCalls.length).toBeGreaterThan(0);
    const config = createClientCalls[0][2];
    expect(config?.auth?.detectSessionInUrl).toBe(false);
  });
});

describe('getSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return session when successful', async () => {
    const mockSession = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      user: { id: '123', email: 'test@example.com' },
    };

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const result = await getSession();

    expect(mockGetSession).toHaveBeenCalled();
    expect(result).toEqual(mockSession);
  });

  it('should return null when session does not exist', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const result = await getSession();

    expect(result).toBeNull();
  });

  it('should handle errors and return null', async () => {
    const mockError = { message: 'Session error' };
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: mockError,
    });

    const result = await getSession();

    expect(console.error).toHaveBeenCalledWith('Error getting session:', mockError);
    expect(result).toBeNull();
  });

  it('should handle network errors gracefully', async () => {
    const networkError = new Error('Network error');
    mockGetSession.mockRejectedValue(networkError);

    await expect(getSession()).rejects.toThrow('Network error');
  });
});

describe('getCurrentUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user when successful', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      user_metadata: { display_name: 'Test User' },
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const result = await getCurrentUser();

    expect(mockGetUser).toHaveBeenCalled();
    expect(result).toEqual(mockUser);
  });

  it('should return null when user does not exist', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await getCurrentUser();

    expect(result).toBeNull();
  });

  it('should handle errors and return null', async () => {
    const mockError = { message: 'User error' };
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: mockError,
    });

    const result = await getCurrentUser();

    expect(console.error).toHaveBeenCalledWith('Error getting user:', mockError);
    expect(result).toBeNull();
  });

  it('should handle authentication errors', async () => {
    const authError = { message: 'Invalid token' };
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: authError,
    });

    const result = await getCurrentUser();

    expect(result).toBeNull();
  });
});

describe('signInWithEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should sign in successfully with valid credentials', async () => {
    const mockData = {
      user: { id: '123', email: 'test@example.com' },
      session: { access_token: 'token' },
    };

    mockSignInWithPassword.mockResolvedValue({
      data: mockData,
      error: null,
    });

    const result = await signInWithEmail('test@example.com', 'password123');

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result).toEqual(mockData);
  });

  it('should throw error when credentials are invalid', async () => {
    const mockError = { message: 'Invalid login credentials' };
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: mockError,
    });

    await expect(
      signInWithEmail('test@example.com', 'wrongpassword')
    ).rejects.toEqual(mockError);
  });

  it('should throw error when email is not found', async () => {
    const mockError = { message: 'User not found' };
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: mockError,
    });

    await expect(
      signInWithEmail('nonexistent@example.com', 'password123')
    ).rejects.toEqual(mockError);
  });

  it('should handle network errors', async () => {
    const networkError = new Error('Network request failed');
    mockSignInWithPassword.mockRejectedValue(networkError);

    await expect(
      signInWithEmail('test@example.com', 'password123')
    ).rejects.toThrow('Network request failed');
  });

  it('should call signInWithPassword with correct parameters', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: {}, session: {} },
      error: null,
    });

    await signInWithEmail('user@test.com', 'secure-password');

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'secure-password',
    });
  });
});

describe('signUpWithEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should sign up successfully with valid data', async () => {
    const mockData = {
      user: { id: '123', email: 'newuser@example.com' },
      session: { access_token: 'token' },
    };

    mockSignUp.mockResolvedValue({
      data: mockData,
      error: null,
    });

    const result = await signUpWithEmail(
      'newuser@example.com',
      'password123',
      'New User'
    );

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'password123',
      options: {
        data: {
          display_name: 'New User',
        },
      },
    });
    expect(result).toEqual(mockData);
  });

  it('should throw error when email already exists', async () => {
    const mockError = { message: 'User already registered' };
    mockSignUp.mockResolvedValue({
      data: null,
      error: mockError,
    });

    await expect(
      signUpWithEmail('existing@example.com', 'password123', 'Existing User')
    ).rejects.toEqual(mockError);
  });

  it('should throw error when password is too weak', async () => {
    const mockError = { message: 'Password must be at least 6 characters' };
    mockSignUp.mockResolvedValue({
      data: null,
      error: mockError,
    });

    await expect(
      signUpWithEmail('test@example.com', '123', 'Test User')
    ).rejects.toEqual(mockError);
  });

  it('should include display name in user metadata', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: {}, session: {} },
      error: null,
    });

    await signUpWithEmail('test@example.com', 'password123', 'John Doe');

    const call = mockSignUp.mock.calls[0][0];
    expect(call.options.data.display_name).toBe('John Doe');
  });

  it('should handle special characters in display name', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: {}, session: {} },
      error: null,
    });

    await signUpWithEmail('test@example.com', 'password123', "O'Brien-Smith");

    const call = mockSignUp.mock.calls[0][0];
    expect(call.options.data.display_name).toBe("O'Brien-Smith");
  });
});

describe('signOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should sign out successfully', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    await signOut();

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('should throw error when sign out fails', async () => {
    const mockError = { message: 'Sign out failed' };
    mockSignOut.mockResolvedValue({ error: mockError });

    await expect(signOut()).rejects.toEqual(mockError);
  });

  it('should handle network errors during sign out', async () => {
    const networkError = new Error('Network error');
    mockSignOut.mockRejectedValue(networkError);

    await expect(signOut()).rejects.toThrow('Network error');
  });

  it('should call signOut without parameters', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    await signOut();

    expect(mockSignOut).toHaveBeenCalledWith();
  });
});

describe('resetPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send password reset email successfully', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    await resetPassword('test@example.com');

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      { redirectTo: 'walkingapp://reset-password' }
    );
  });

  it('should throw error when email is invalid', async () => {
    const mockError = { message: 'Invalid email' };
    mockResetPasswordForEmail.mockResolvedValue({ error: mockError });

    await expect(resetPassword('invalid-email')).rejects.toEqual(mockError);
  });

  it('should throw error when email does not exist', async () => {
    const mockError = { message: 'User not found' };
    mockResetPasswordForEmail.mockResolvedValue({ error: mockError });

    await expect(resetPassword('nonexistent@example.com')).rejects.toEqual(mockError);
  });

  it('should use correct redirect URL for deep linking', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    await resetPassword('test@example.com');

    const call = mockResetPasswordForEmail.mock.calls[0];
    expect(call[1].redirectTo).toBe('walkingapp://reset-password');
  });

  it('should handle network errors', async () => {
    const networkError = new Error('Network error');
    mockResetPasswordForEmail.mockRejectedValue(networkError);

    await expect(resetPassword('test@example.com')).rejects.toThrow('Network error');
  });
});

describe('signInWithGoogleOAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signInWithGoogleOAuth_WithValidConfiguration_ReturnsOAuthUrl', async () => {
    const mockOAuthData = {
      provider: 'google',
      url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&redirect_uri=walkingapp://&response_type=code',
    };

    mockSignInWithOAuth.mockResolvedValue({
      data: mockOAuthData,
      error: null,
    });

    const result = await signInWithGoogleOAuth();

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        skipBrowserRedirect: true,
        redirectTo: undefined,
      },
    });
    expect(result).toEqual(mockOAuthData);
    expect(result.url).toBeDefined();
    expect(result.provider).toBe('google');
  });

  it('signInWithGoogleOAuth_WhenCalled_UsesCorrectProvider', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { provider: 'google', url: 'https://test.com' },
      error: null,
    });

    await signInWithGoogleOAuth();

    const call = mockSignInWithOAuth.mock.calls[0][0];
    expect(call.provider).toBe('google');
  });

  it('signInWithGoogleOAuth_WhenCalled_SkipsBrowserRedirect', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { provider: 'google', url: 'https://test.com' },
      error: null,
    });

    await signInWithGoogleOAuth();

    const call = mockSignInWithOAuth.mock.calls[0][0];
    expect(call.options.skipBrowserRedirect).toBe(true);
  });

  it('signInWithGoogleOAuth_WhenCalled_RedirectToIsUndefined', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { provider: 'google', url: 'https://test.com' },
      error: null,
    });

    await signInWithGoogleOAuth();

    const call = mockSignInWithOAuth.mock.calls[0][0];
    expect(call.options.redirectTo).toBeUndefined();
  });

  it('signInWithGoogleOAuth_WhenSupabaseReturnsError_ThrowsError', async () => {
    const mockError = { message: 'OAuth configuration error' };
    mockSignInWithOAuth.mockResolvedValue({
      data: null,
      error: mockError,
    });

    await expect(signInWithGoogleOAuth()).rejects.toEqual(mockError);
  });

  it('signInWithGoogleOAuth_WhenNetworkFails_ThrowsNetworkError', async () => {
    const networkError = new Error('Network request failed');
    mockSignInWithOAuth.mockRejectedValue(networkError);

    await expect(signInWithGoogleOAuth()).rejects.toThrow('Network request failed');
  });

  it('signInWithGoogleOAuth_WhenProviderUnavailable_ThrowsError', async () => {
    const mockError = { message: 'Google provider not configured' };
    mockSignInWithOAuth.mockResolvedValue({
      data: null,
      error: mockError,
    });

    await expect(signInWithGoogleOAuth()).rejects.toEqual(mockError);
  });

  it('signInWithGoogleOAuth_ReturnsDataWithUrlProperty', async () => {
    const mockData = {
      provider: 'google',
      url: 'https://accounts.google.com/oauth',
    };
    mockSignInWithOAuth.mockResolvedValue({
      data: mockData,
      error: null,
    });

    const result = await signInWithGoogleOAuth();

    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('provider');
  });
});

describe('signInWithIdToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signInWithIdToken_WithValidIdToken_SignsInSuccessfully', async () => {
    const mockData = {
      user: { id: '123', email: 'test@gmail.com' },
      session: { access_token: 'access-token', refresh_token: 'refresh-token' },
    };

    mockSignInWithIdToken.mockResolvedValue({
      data: mockData,
      error: null,
    });

    const result = await signInWithIdToken('mock-id-token');

    expect(mockSignInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'mock-id-token',
      access_token: undefined,
    });
    expect(result).toEqual(mockData);
  });

  it('signInWithIdToken_WithIdTokenAndAccessToken_IncludesBothTokens', async () => {
    const mockData = {
      user: { id: '123', email: 'test@gmail.com' },
      session: { access_token: 'supabase-token' },
    };

    mockSignInWithIdToken.mockResolvedValue({
      data: mockData,
      error: null,
    });

    await signInWithIdToken('mock-id-token', 'mock-access-token');

    expect(mockSignInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'mock-id-token',
      access_token: 'mock-access-token',
    });
  });

  it('signInWithIdToken_WithOnlyIdToken_AccessTokenIsUndefined', async () => {
    mockSignInWithIdToken.mockResolvedValue({
      data: { user: {}, session: {} },
      error: null,
    });

    await signInWithIdToken('mock-id-token');

    const call = mockSignInWithIdToken.mock.calls[0][0];
    expect(call.access_token).toBeUndefined();
  });

  it('signInWithIdToken_WhenInvalidToken_ThrowsError', async () => {
    const mockError = { message: 'Invalid ID token' };
    mockSignInWithIdToken.mockResolvedValue({
      data: null,
      error: mockError,
    });

    await expect(signInWithIdToken('invalid-token')).rejects.toEqual(mockError);
  });

  it('signInWithIdToken_WhenTokenExpired_ThrowsError', async () => {
    const mockError = { message: 'Token has expired' };
    mockSignInWithIdToken.mockResolvedValue({
      data: null,
      error: mockError,
    });

    await expect(signInWithIdToken('expired-token')).rejects.toEqual(mockError);
  });

  it('signInWithIdToken_AlwaysUsesGoogleProvider', async () => {
    mockSignInWithIdToken.mockResolvedValue({
      data: { user: {}, session: {} },
      error: null,
    });

    await signInWithIdToken('mock-id-token');

    const call = mockSignInWithIdToken.mock.calls[0][0];
    expect(call.provider).toBe('google');
  });

  it('signInWithIdToken_ReturnsUserAndSession', async () => {
    const mockUser = { id: 'user-123', email: 'user@gmail.com' };
    const mockSession = {
      access_token: 'token-123',
      refresh_token: 'refresh-123',
    };

    mockSignInWithIdToken.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const result = await signInWithIdToken('mock-id-token', 'mock-access-token');

    expect(result.user).toEqual(mockUser);
    expect(result.session).toEqual(mockSession);
  });

  it('signInWithIdToken_WhenNetworkFails_ThrowsNetworkError', async () => {
    const networkError = new Error('Network connection lost');
    mockSignInWithIdToken.mockRejectedValue(networkError);

    await expect(
      signInWithIdToken('mock-id-token')
    ).rejects.toThrow('Network connection lost');
  });
});
