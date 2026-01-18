import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as Google from 'expo-auth-session/providers/google';

// Mock environment variables first
jest.mock('@env', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  API_BASE_URL: 'http://localhost:5000/api',
  APP_ENV: 'test',
  GOOGLE_CLIENT_ID: 'test-google-client-id.apps.googleusercontent.com',
  GOOGLE_WEB_CLIENT_ID: 'test-google-web-client-id.apps.googleusercontent.com',
}));

// Mock expo-auth-session/providers/google
const mockPromptAsync = jest.fn();
const mockUseIdTokenAuthRequest = jest.fn();
jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: mockUseIdTokenAuthRequest,
}));

// Mock expo-web-browser
const mockMaybeCompleteAuthSession = jest.fn();
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: mockMaybeCompleteAuthSession,
}));

// Mock expo-auth-session
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'walkingapp://'),
}));

// Import after mocks
import { useGoogleAuth } from '../useGoogleAuth';

describe('useGoogleAuth', () => {
  const mockRequest = { clientId: 'test-client-id' };
  const mockResponse = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIdTokenAuthRequest.mockReturnValue([
      mockRequest,
      mockResponse,
      mockPromptAsync,
    ]);
  });

  describe('useGoogleAuth_Initialization_ConfiguresCorrectly', () => {
    it('useGoogleAuth_WhenInitialized_CallsUseIdTokenAuthRequest', () => {
      renderHook(() => useGoogleAuth());

      expect(mockUseIdTokenAuthRequest).toHaveBeenCalledWith({
        clientId: 'test-google-web-client-id.apps.googleusercontent.com',
        androidClientId: 'test-google-web-client-id.apps.googleusercontent.com',
        redirectUri: 'walkingapp://',
      });
    });

    it('useGoogleAuth_WhenInitialized_CallsMaybeCompleteAuthSession', () => {
      renderHook(() => useGoogleAuth());

      expect(mockMaybeCompleteAuthSession).toHaveBeenCalled();
    });

    it('useGoogleAuth_WhenInitialized_ReturnsCorrectProperties', () => {
      const { result } = renderHook(() => useGoogleAuth());

      expect(result.current).toHaveProperty('signInWithGoogle');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('request');
    });

    it('useGoogleAuth_WhenInitialized_InitialLoadingIsFalse', () => {
      const { result } = renderHook(() => useGoogleAuth());

      expect(result.current.isLoading).toBe(false);
    });

    it('useGoogleAuth_WhenInitialized_InitialErrorIsNull', () => {
      const { result } = renderHook(() => useGoogleAuth());

      expect(result.current.error).toBeNull();
    });

    it('useGoogleAuth_WhenInitialized_ReturnsRequestObject', () => {
      const { result } = renderHook(() => useGoogleAuth());

      expect(result.current.request).toEqual(mockRequest);
    });
  });

  describe('useGoogleAuth_SignInWithGoogle_HandlesSuccess', () => {
    it('useGoogleAuth_WhenSignInSucceeds_ReturnsTokens', async () => {
      const mockAuthentication = {
        idToken: 'test-id-token',
        accessToken: 'test-access-token',
      };

      mockPromptAsync.mockResolvedValue({
        type: 'success',
        authentication: mockAuthentication,
      });

      const { result } = renderHook(() => useGoogleAuth());

      let response;
      await act(async () => {
        response = await result.current.signInWithGoogle();
      });

      expect(response).toEqual({
        idToken: 'test-id-token',
        accessToken: 'test-access-token',
      });
    });

    it('useGoogleAuth_WhenSignInSucceeds_ClearsError', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        authentication: {
          idToken: 'test-token',
          accessToken: 'test-access',
        },
      });

      const { result } = renderHook(() => useGoogleAuth());

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.error).toBeNull();
    });

    it('useGoogleAuth_WhenSignInSucceeds_SetsLoadingToFalse', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        authentication: {
          idToken: 'test-token',
          accessToken: 'test-access',
        },
      });

      const { result } = renderHook(() => useGoogleAuth());

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('useGoogleAuth_WhenSignInSucceeds_CallsPromptAsync', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        authentication: {
          idToken: 'test-token',
        },
      });

      const { result } = renderHook(() => useGoogleAuth());

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(mockPromptAsync).toHaveBeenCalled();
    });

    it('useGoogleAuth_WhenSignInInProgress_SetsLoadingToTrue', async () => {
      let resolvePrompt: any;
      mockPromptAsync.mockReturnValue(
        new Promise(resolve => {
          resolvePrompt = resolve;
        })
      );

      const { result } = renderHook(() => useGoogleAuth());

      act(() => {
        result.current.signInWithGoogle();
      });

      expect(result.current.isLoading).toBe(true);

      // Clean up
      await act(async () => {
        resolvePrompt({ type: 'cancel' });
      });
    });
  });

  describe('useGoogleAuth_SignInWithGoogle_HandlesDismiss', () => {
    it('useGoogleAuth_WhenUserDismisses_ReturnsNull', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'dismiss',
      });

      const { result } = renderHook(() => useGoogleAuth());

      let response;
      await act(async () => {
        response = await result.current.signInWithGoogle();
      });

      expect(response).toBeNull();
    });

    it('useGoogleAuth_WhenUserCancels_ReturnsNull', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'cancel',
      });

      const { result } = renderHook(() => useGoogleAuth());

      let response;
      await act(async () => {
        response = await result.current.signInWithGoogle();
      });

      expect(response).toBeNull();
    });

    it('useGoogleAuth_WhenUserDismisses_SetsLoadingToFalse', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'dismiss',
      });

      const { result } = renderHook(() => useGoogleAuth());

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useGoogleAuth_SignInWithGoogle_HandlesErrors', () => {
    it('useGoogleAuth_WhenPromptAsyncThrows_SetsError', async () => {
      const mockError = new Error('Authentication failed');
      mockPromptAsync.mockRejectedValue(mockError);

      const { result } = renderHook(() => useGoogleAuth());

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.error).toBe('Authentication failed');
    });

    it('useGoogleAuth_WhenPromptAsyncThrows_ReturnsNull', async () => {
      mockPromptAsync.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useGoogleAuth());

      let response;
      await act(async () => {
        response = await result.current.signInWithGoogle();
      });

      expect(response).toBeNull();
    });

    it('useGoogleAuth_WhenPromptAsyncThrows_SetsLoadingToFalse', async () => {
      mockPromptAsync.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useGoogleAuth());

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('useGoogleAuth_WhenErrorHasNoMessage_SetsGenericError', async () => {
      mockPromptAsync.mockRejectedValue({});

      const { result } = renderHook(() => useGoogleAuth());

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.error).toBe('Failed to sign in with Google');
    });

    it('useGoogleAuth_WhenCalledAgain_ClearsPreviousError', async () => {
      // First call fails
      mockPromptAsync.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => useGoogleAuth());

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.error).toBe('First error');

      // Second call succeeds
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        authentication: { idToken: 'test' },
      });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('useGoogleAuth_ResponseEffect_HandlesErrorResponse', () => {
    it('useGoogleAuth_WhenResponseTypeIsError_SetsError', () => {
      const mockErrorResponse = {
        type: 'error',
        error: { message: 'OAuth error occurred' },
      };

      mockUseIdTokenAuthRequest.mockReturnValue([
        mockRequest,
        mockErrorResponse,
        mockPromptAsync,
      ]);

      const { result } = renderHook(() => useGoogleAuth());

      expect(result.current.error).toBe('OAuth error occurred');
    });

    it('useGoogleAuth_WhenResponseTypeIsError_SetsLoadingToFalse', () => {
      const mockErrorResponse = {
        type: 'error',
        error: { message: 'OAuth error' },
      };

      mockUseIdTokenAuthRequest.mockReturnValue([
        mockRequest,
        mockErrorResponse,
        mockPromptAsync,
      ]);

      const { result } = renderHook(() => useGoogleAuth());

      expect(result.current.isLoading).toBe(false);
    });

    it('useGoogleAuth_WhenResponseErrorHasNoMessage_SetsGenericError', () => {
      const mockErrorResponse = {
        type: 'error',
        error: {},
      };

      mockUseIdTokenAuthRequest.mockReturnValue([
        mockRequest,
        mockErrorResponse,
        mockPromptAsync,
      ]);

      const { result } = renderHook(() => useGoogleAuth());

      expect(result.current.error).toBe('Google authentication failed');
    });

    it('useGoogleAuth_WhenResponseErrorIsNull_SetsGenericError', () => {
      const mockErrorResponse = {
        type: 'error',
        error: null,
      };

      mockUseIdTokenAuthRequest.mockReturnValue([
        mockRequest,
        mockErrorResponse,
        mockPromptAsync,
      ]);

      const { result } = renderHook(() => useGoogleAuth());

      expect(result.current.error).toBe('Google authentication failed');
    });
  });

  describe('useGoogleAuth_TokenHandling_WorksCorrectly', () => {
    it('useGoogleAuth_WhenOnlyIdTokenReturned_ReturnsIdToken', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        authentication: {
          idToken: 'only-id-token',
        },
      });

      const { result } = renderHook(() => useGoogleAuth());

      let response;
      await act(async () => {
        response = await result.current.signInWithGoogle();
      });

      expect(response).toEqual({
        idToken: 'only-id-token',
        accessToken: undefined,
      });
    });

    it('useGoogleAuth_WhenOnlyAccessTokenReturned_ReturnsAccessToken', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        authentication: {
          accessToken: 'only-access-token',
        },
      });

      const { result } = renderHook(() => useGoogleAuth());

      let response;
      await act(async () => {
        response = await result.current.signInWithGoogle();
      });

      expect(response).toEqual({
        idToken: undefined,
        accessToken: 'only-access-token',
      });
    });

    it('useGoogleAuth_WhenAuthenticationIsUndefined_ReturnsUndefinedTokens', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        authentication: undefined,
      });

      const { result } = renderHook(() => useGoogleAuth());

      let response;
      await act(async () => {
        response = await result.current.signInWithGoogle();
      });

      expect(response).toEqual({
        idToken: undefined,
        accessToken: undefined,
      });
    });

    it('useGoogleAuth_WhenBothTokensReturned_ReturnsBothTokens', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        authentication: {
          idToken: 'id-123',
          accessToken: 'access-456',
        },
      });

      const { result } = renderHook(() => useGoogleAuth());

      let response;
      await act(async () => {
        response = await result.current.signInWithGoogle();
      });

      expect(response).toEqual({
        idToken: 'id-123',
        accessToken: 'access-456',
      });
    });
  });

  describe('useGoogleAuth_MultipleInvocations_WorkCorrectly', () => {
    it('useGoogleAuth_WhenCalledMultipleTimes_HandlesEachInvocation', async () => {
      const { result } = renderHook(() => useGoogleAuth());

      // First invocation
      mockPromptAsync.mockResolvedValueOnce({
        type: 'success',
        authentication: { idToken: 'token-1' },
      });

      let response1;
      await act(async () => {
        response1 = await result.current.signInWithGoogle();
      });

      expect(response1).toEqual({
        idToken: 'token-1',
        accessToken: undefined,
      });

      // Second invocation
      mockPromptAsync.mockResolvedValueOnce({
        type: 'success',
        authentication: { idToken: 'token-2' },
      });

      let response2;
      await act(async () => {
        response2 = await result.current.signInWithGoogle();
      });

      expect(response2).toEqual({
        idToken: 'token-2',
        accessToken: undefined,
      });

      expect(mockPromptAsync).toHaveBeenCalledTimes(2);
    });

    it('useGoogleAuth_WhenCalledWhileLoading_AllowsMultipleCalls', async () => {
      const { result } = renderHook(() => useGoogleAuth());

      mockPromptAsync.mockResolvedValue({
        type: 'success',
        authentication: { idToken: 'test' },
      });

      // Call multiple times
      const call1 = act(async () => {
        await result.current.signInWithGoogle();
      });

      const call2 = act(async () => {
        await result.current.signInWithGoogle();
      });

      await Promise.all([call1, call2]);

      expect(mockPromptAsync).toHaveBeenCalledTimes(2);
    });
  });
});
