// Create mocks that can be tracked
const mockSignInWithOAuth = jest.fn();
const mockOnAuthStateChange = jest.fn(() => ({
  data: { subscription: { unsubscribe: jest.fn() } },
}));

// Track createClient calls
let createClientCalls: unknown[] = [];

// Mock @supabase/supabase-js before importing
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn((...args: unknown[]) => {
    createClientCalls.push(args);
    return {
      auth: {
        signInWithOAuth: mockSignInWithOAuth,
        onAuthStateChange: mockOnAuthStateChange,
        // These are kept for compatibility with existing code that still uses them
        getUser: jest.fn(),
        setSession: jest.fn(),
        updateUser: jest.fn(),
      },
      // For database operations
      from: jest.fn(),
      storage: {
        from: jest.fn(),
      },
    };
  }),
}));

import { supabase, signInWithGoogleOAuth } from '../supabase';

describe('Supabase Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create Supabase client with correct URL and key', () => {
    expect(createClientCalls.length).toBeGreaterThan(0);
    const [url, key] = createClientCalls[0] as [string, string, unknown];

    expect(url).toBe('https://test.supabase.co');
    expect(key).toBe('test-anon-key');
  });

  it('should export supabase client instance', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });

  it('should disable auto refresh token (handled by tokenStorage)', () => {
    expect(createClientCalls.length).toBeGreaterThan(0);
    const config = (createClientCalls[0] as [string, string, { auth?: { autoRefreshToken?: boolean } }])[2];
    expect(config?.auth?.autoRefreshToken).toBe(false);
  });

  it('should disable session persistence (handled by tokenStorage)', () => {
    expect(createClientCalls.length).toBeGreaterThan(0);
    const config = (createClientCalls[0] as [string, string, { auth?: { persistSession?: boolean } }])[2];
    expect(config?.auth?.persistSession).toBe(false);
  });

  it('should disable session detection in URL', () => {
    expect(createClientCalls.length).toBeGreaterThan(0);
    const config = (createClientCalls[0] as [string, string, { auth?: { detectSessionInUrl?: boolean } }])[2];
    expect(config?.auth?.detectSessionInUrl).toBe(false);
  });

  it('should not use ExpoSecureStoreAdapter (tokens handled separately)', () => {
    expect(createClientCalls.length).toBeGreaterThan(0);
    const config = (createClientCalls[0] as [string, string, { auth?: { storage?: unknown } }])[2];
    expect(config?.auth?.storage).toBeUndefined();
  });
});

describe('signInWithGoogleOAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call signInWithOAuth with google provider', async () => {
    const mockData = {
      url: 'https://accounts.google.com/oauth...',
      provider: 'google',
    };

    mockSignInWithOAuth.mockResolvedValue({
      data: mockData,
      error: null,
    });

    const result = await signInWithGoogleOAuth();

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'walkingapp://',
        skipBrowserRedirect: false,
      },
    });
    expect(result).toEqual(mockData);
  });

  it('should throw error when OAuth fails', async () => {
    const mockError = { message: 'OAuth configuration error' };
    mockSignInWithOAuth.mockResolvedValue({
      data: null,
      error: mockError,
    });

    await expect(signInWithGoogleOAuth()).rejects.toEqual(mockError);
  });

  it('should use correct redirect URL for deep linking', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://...' },
      error: null,
    });

    await signInWithGoogleOAuth();

    const call = mockSignInWithOAuth.mock.calls[0][0];
    expect(call.options.redirectTo).toBe('walkingapp://');
  });

  it('should not skip browser redirect', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://...' },
      error: null,
    });

    await signInWithGoogleOAuth();

    const call = mockSignInWithOAuth.mock.calls[0][0];
    expect(call.options.skipBrowserRedirect).toBe(false);
  });

  it('should handle network errors', async () => {
    const networkError = new Error('Network error');
    mockSignInWithOAuth.mockRejectedValue(networkError);

    await expect(signInWithGoogleOAuth()).rejects.toThrow('Network error');
  });
});
