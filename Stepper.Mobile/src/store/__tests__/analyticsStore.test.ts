import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAnalyticsStore, selectConsentStatus, selectHasConsent, selectNeedsConsentPrompt } from '../analyticsStore';
import type { ConsentState } from '@services/analytics/consentManager';

// Mock the analytics service
jest.mock('@services/analytics/analyticsService', () => ({
  initialize: jest.fn(),
  track: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
  setUserProperties: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
  getAnalyticsConsentState: jest.fn(),
  isFeatureFlagEnabled: jest.fn(),
  getFeatureFlag: jest.fn(),
  reloadFeatureFlags: jest.fn(),
  flush: jest.fn(),
  isReady: jest.fn(),
}));

import {
  initialize as initializeAnalytics,
  track as trackEvent,
  identify as identifyUser,
  reset as resetAnalytics,
  setUserProperties as setAnalyticsUserProperties,
  grantConsent as grantAnalyticsConsent,
  revokeConsent as revokeAnalyticsConsent,
  getAnalyticsConsentState,
  isFeatureFlagEnabled,
  getFeatureFlag,
  reloadFeatureFlags,
  flush as flushAnalytics,
  isReady,
} from '@services/analytics/analyticsService';

const mockInitializeAnalytics = initializeAnalytics as jest.MockedFunction<typeof initializeAnalytics>;
const mockTrackEvent = trackEvent as jest.MockedFunction<typeof trackEvent>;
const mockIdentifyUser = identifyUser as jest.MockedFunction<typeof identifyUser>;
const mockResetAnalytics = resetAnalytics as jest.MockedFunction<typeof resetAnalytics>;
const mockSetAnalyticsUserProperties = setAnalyticsUserProperties as jest.MockedFunction<typeof setAnalyticsUserProperties>;
const mockGrantAnalyticsConsent = grantAnalyticsConsent as jest.MockedFunction<typeof grantAnalyticsConsent>;
const mockRevokeAnalyticsConsent = revokeAnalyticsConsent as jest.MockedFunction<typeof revokeAnalyticsConsent>;
const mockGetAnalyticsConsentState = getAnalyticsConsentState as jest.MockedFunction<typeof getAnalyticsConsentState>;
const mockIsFeatureFlagEnabled = isFeatureFlagEnabled as jest.MockedFunction<typeof isFeatureFlagEnabled>;
const mockGetFeatureFlag = getFeatureFlag as jest.MockedFunction<typeof getFeatureFlag>;
const mockReloadFeatureFlags = reloadFeatureFlags as jest.MockedFunction<typeof reloadFeatureFlags>;
const mockFlushAnalytics = flushAnalytics as jest.MockedFunction<typeof flushAnalytics>;
const mockIsReady = isReady as jest.MockedFunction<typeof isReady>;

// Test fixtures
const mockConsentState: ConsentState = {
  status: 'granted',
  timestamp: new Date().toISOString(),
  version: '1.0',
};

const mockUnknownConsentState: ConsentState = {
  status: 'unknown',
  timestamp: null,
  version: null,
};

describe('analyticsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    useAnalyticsStore.setState({
      isInitialized: false,
      isInitializing: false,
      consentState: {
        status: 'unknown',
        timestamp: null,
        version: null,
      },
      error: null,
    });

    // Default mock implementations
    mockGetAnalyticsConsentState.mockResolvedValue(mockUnknownConsentState);
    mockIsReady.mockReturnValue(false);
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAnalyticsStore());

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isInitializing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.consentState.status).toBe('unknown');
    });
  });

  describe('initialize', () => {
    it('should initialize analytics service and update state', async () => {
      const { result } = renderHook(() => useAnalyticsStore());
      mockInitializeAnalytics.mockResolvedValue(undefined);
      mockGetAnalyticsConsentState.mockResolvedValue(mockConsentState);
      mockIsReady.mockReturnValue(true);

      await act(async () => {
        await result.current.initialize();
      });

      expect(mockInitializeAnalytics).toHaveBeenCalled();
      expect(mockGetAnalyticsConsentState).toHaveBeenCalled();
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isInitializing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.consentState).toEqual(mockConsentState);
    });

    it('should skip initialization if already initialized', async () => {
      // Pre-set initialized state
      useAnalyticsStore.setState({ isInitialized: true });

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(mockInitializeAnalytics).not.toHaveBeenCalled();
    });

    it('should skip initialization if already initializing', async () => {
      // Pre-set initializing state
      useAnalyticsStore.setState({ isInitializing: true });

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(mockInitializeAnalytics).not.toHaveBeenCalled();
    });

    it('should handle initialization error and set error state', async () => {
      const error = new Error('Initialization failed');
      mockInitializeAnalytics.mockRejectedValue(error);

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitializing).toBe(false);
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.error).toBe('Initialization failed');
    });

    it('should set loading state during initialization', async () => {
      mockInitializeAnalytics.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );
      mockGetAnalyticsConsentState.mockResolvedValue(mockConsentState);
      mockIsReady.mockReturnValue(true);

      const { result } = renderHook(() => useAnalyticsStore());

      act(() => {
        result.current.initialize();
      });

      expect(result.current.isInitializing).toBe(true);

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
    });
  });

  describe('track', () => {
    it('should delegate to analyticsService.trackEvent', () => {
      const { result } = renderHook(() => useAnalyticsStore());

      act(() => {
        result.current.track('app_opened' as any);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('app_opened', undefined);
    });

    it('should pass event properties', () => {
      const { result } = renderHook(() => useAnalyticsStore());
      const properties = { duration: 100 };

      act(() => {
        result.current.track('app_opened' as any, properties as any);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('app_opened', properties);
    });
  });

  describe('identify', () => {
    it('should delegate to analyticsService.identifyUser', () => {
      const { result } = renderHook(() => useAnalyticsStore());
      const userId = 'user123';

      act(() => {
        result.current.identify(userId);
      });

      expect(mockIdentifyUser).toHaveBeenCalledWith(userId, undefined);
    });

    it('should pass user properties', () => {
      const { result } = renderHook(() => useAnalyticsStore());
      const userId = 'user123';
      const properties = { daily_step_goal: 12000 };

      act(() => {
        result.current.identify(userId, properties);
      });

      expect(mockIdentifyUser).toHaveBeenCalledWith(userId, properties);
    });
  });

  describe('reset', () => {
    it('should delegate to analyticsService.resetAnalytics', () => {
      const { result } = renderHook(() => useAnalyticsStore());

      act(() => {
        result.current.reset();
      });

      expect(mockResetAnalytics).toHaveBeenCalled();
    });
  });

  describe('setUserProperties', () => {
    it('should delegate to analyticsService.setUserProperties', () => {
      const { result } = renderHook(() => useAnalyticsStore());
      const properties = { daily_step_goal: 12000 };

      act(() => {
        result.current.setUserProperties(properties);
      });

      expect(mockSetAnalyticsUserProperties).toHaveBeenCalledWith(properties);
    });
  });

  describe('grantConsent', () => {
    it('should grant consent and update state', async () => {
      mockGrantAnalyticsConsent.mockResolvedValue(undefined);
      mockGetAnalyticsConsentState.mockResolvedValue(mockConsentState);

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.grantConsent();
      });

      expect(mockGrantAnalyticsConsent).toHaveBeenCalled();
      expect(mockGetAnalyticsConsentState).toHaveBeenCalled();
      expect(result.current.consentState).toEqual(mockConsentState);
    });

    it('should handle grant consent error', async () => {
      const error = new Error('Grant failed');
      mockGrantAnalyticsConsent.mockRejectedValue(error);

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.grantConsent();
      });

      expect(result.current.error).toBe('Grant failed');
    });
  });

  describe('revokeConsent', () => {
    it('should revoke consent and update state', async () => {
      mockRevokeAnalyticsConsent.mockResolvedValue(undefined);
      const revokedState: ConsentState = {
        status: 'denied',
        timestamp: new Date().toISOString(),
        version: '1.0',
      };
      mockGetAnalyticsConsentState.mockResolvedValue(revokedState);

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.revokeConsent();
      });

      expect(mockRevokeAnalyticsConsent).toHaveBeenCalled();
      expect(mockGetAnalyticsConsentState).toHaveBeenCalled();
      expect(result.current.consentState).toEqual(revokedState);
    });

    it('should handle revoke consent error', async () => {
      const error = new Error('Revoke failed');
      mockRevokeAnalyticsConsent.mockRejectedValue(error);

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.revokeConsent();
      });

      expect(result.current.error).toBe('Revoke failed');
    });
  });

  describe('refreshConsentState', () => {
    it('should refresh consent state from storage', async () => {
      mockGetAnalyticsConsentState.mockResolvedValue(mockConsentState);

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.refreshConsentState();
      });

      expect(mockGetAnalyticsConsentState).toHaveBeenCalled();
      expect(result.current.consentState).toEqual(mockConsentState);
    });

    it('should handle refresh consent state error', async () => {
      const error = new Error('Refresh failed');
      mockGetAnalyticsConsentState.mockRejectedValue(error);

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.refreshConsentState();
      });

      expect(result.current.error).toBe('Refresh failed');
    });
  });

  describe('isFeatureFlagEnabled', () => {
    it('should delegate to analyticsService.isFeatureFlagEnabled', () => {
      mockIsFeatureFlagEnabled.mockReturnValue(true);
      const { result } = renderHook(() => useAnalyticsStore());

      const flag = 'new_feature' as any;
      const enabled = result.current.isFeatureFlagEnabled(flag);

      expect(mockIsFeatureFlagEnabled).toHaveBeenCalledWith(flag);
      expect(enabled).toBe(true);
    });

    it('should return undefined if flag is not set', () => {
      mockIsFeatureFlagEnabled.mockReturnValue(undefined);
      const { result } = renderHook(() => useAnalyticsStore());

      const flag = 'new_feature' as any;
      const enabled = result.current.isFeatureFlagEnabled(flag);

      expect(enabled).toBeUndefined();
    });
  });

  describe('getFeatureFlag', () => {
    it('should delegate to analyticsService.getFeatureFlag', () => {
      mockGetFeatureFlag.mockReturnValue('variant_a');
      const { result } = renderHook(() => useAnalyticsStore());

      const flag = 'feature_variant' as any;
      const value = result.current.getFeatureFlag(flag);

      expect(mockGetFeatureFlag).toHaveBeenCalledWith(flag);
      expect(value).toBe('variant_a');
    });
  });

  describe('reloadFeatureFlags', () => {
    it('should reload feature flags from server', async () => {
      mockReloadFeatureFlags.mockResolvedValue(undefined);
      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.reloadFeatureFlags();
      });

      expect(mockReloadFeatureFlags).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });

    it('should handle reload feature flags error', async () => {
      const error = new Error('Reload failed');
      mockReloadFeatureFlags.mockRejectedValue(error);

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.reloadFeatureFlags();
      });

      expect(result.current.error).toBe('Reload failed');
    });
  });

  describe('flush', () => {
    it('should flush queued events', async () => {
      mockFlushAnalytics.mockResolvedValue(undefined);
      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.flush();
      });

      expect(mockFlushAnalytics).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });

    it('should handle flush error', async () => {
      const error = new Error('Flush failed');
      mockFlushAnalytics.mockRejectedValue(error);

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.flush();
      });

      expect(result.current.error).toBe('Flush failed');
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useAnalyticsStore());

      // Set error
      useAnalyticsStore.setState({ error: 'Some error' });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should not affect other state', () => {
      const { result } = renderHook(() => useAnalyticsStore());

      useAnalyticsStore.setState({
        error: 'Some error',
        isInitialized: true,
        consentState: mockConsentState,
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.consentState).toEqual(mockConsentState);
    });
  });

  describe('selectors', () => {
    describe('selectConsentStatus', () => {
      it('should return consent status', () => {
        const state = {
          consentState: mockConsentState,
          isInitialized: true,
          isInitializing: false,
          error: null,
        } as any;

        const status = selectConsentStatus(state);
        expect(status).toBe('granted');
      });

      it('should return unknown status', () => {
        const state = {
          consentState: mockUnknownConsentState,
          isInitialized: false,
          isInitializing: false,
          error: null,
        } as any;

        const status = selectConsentStatus(state);
        expect(status).toBe('unknown');
      });
    });

    describe('selectHasConsent', () => {
      it('should return true when consent is granted', () => {
        const state = {
          consentState: mockConsentState,
          isInitialized: true,
          isInitializing: false,
          error: null,
        } as any;

        const hasConsent = selectHasConsent(state);
        expect(hasConsent).toBe(true);
      });

      it('should return false when consent is not granted', () => {
        const state = {
          consentState: mockUnknownConsentState,
          isInitialized: false,
          isInitializing: false,
          error: null,
        } as any;

        const hasConsent = selectHasConsent(state);
        expect(hasConsent).toBe(false);
      });

      it('should return false when consent is denied', () => {
        const revokedState: ConsentState = {
          status: 'denied',
          timestamp: new Date().toISOString(),
          version: '1.0',
        };
        const state = {
          consentState: revokedState,
          isInitialized: true,
          isInitializing: false,
          error: null,
        } as any;

        const hasConsent = selectHasConsent(state);
        expect(hasConsent).toBe(false);
      });
    });

    describe('selectNeedsConsentPrompt', () => {
      it('should return true when consent status is unknown', () => {
        const state = {
          consentState: mockUnknownConsentState,
          isInitialized: false,
          isInitializing: false,
          error: null,
        } as any;

        const needsPrompt = selectNeedsConsentPrompt(state);
        expect(needsPrompt).toBe(true);
      });

      it('should return false when consent is already granted', () => {
        const state = {
          consentState: mockConsentState,
          isInitialized: true,
          isInitializing: false,
          error: null,
        } as any;

        const needsPrompt = selectNeedsConsentPrompt(state);
        expect(needsPrompt).toBe(false);
      });

      it('should return false when consent is denied', () => {
        const revokedState: ConsentState = {
          status: 'denied',
          timestamp: new Date().toISOString(),
          version: '1.0',
        };
        const state = {
          consentState: revokedState,
          isInitialized: true,
          isInitializing: false,
          error: null,
        } as any;

        const needsPrompt = selectNeedsConsentPrompt(state);
        expect(needsPrompt).toBe(false);
      });
    });
  });
});
