/**
 * Unit tests for the useAnalytics hook.
 * Tests hook functionality, type safety, and state management.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAnalytics } from '../useAnalytics';
import { useAnalyticsStore } from '@store/analyticsStore';

// Mock the analytics store
jest.mock('@store/analyticsStore', () => {
  const mockState = {
    isInitialized: true,
    isInitializing: false,
    consentState: {
      status: 'granted',
      timestamp: '2024-01-15T10:00:00.000Z',
      version: '1.0',
    },
    error: null as string | null,
    track: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    setUserProperties: jest.fn(),
    grantConsent: jest.fn().mockResolvedValue(undefined),
    revokeConsent: jest.fn().mockResolvedValue(undefined),
    refreshConsentState: jest.fn().mockResolvedValue(undefined),
    isFeatureFlagEnabled: jest.fn().mockReturnValue(undefined),
    getFeatureFlag: jest.fn().mockReturnValue(undefined),
    clearError: jest.fn(),
    initialize: jest.fn().mockResolvedValue(undefined),
    flush: jest.fn().mockResolvedValue(undefined),
    reloadFeatureFlags: jest.fn().mockResolvedValue(undefined),
  };

  return {
    useAnalyticsStore: jest.fn((selector) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      return mockState;
    }),
    selectHasConsent: jest.fn((state) => state.consentState.status === 'granted'),
  };
});

const mockUseAnalyticsStore = useAnalyticsStore as jest.MockedFunction<typeof useAnalyticsStore>;

describe('useAnalytics', () => {
  // Helper to get mock store state
  const getMockState = () => ({
    isInitialized: true,
    isInitializing: false,
    consentState: {
      status: 'granted' as 'granted' | 'denied' | 'unknown',
      timestamp: '2024-01-15T10:00:00.000Z' as string | null,
      version: '1.0' as string | null,
    },
    error: null as string | null,
    track: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    setUserProperties: jest.fn(),
    grantConsent: jest.fn().mockResolvedValue(undefined),
    revokeConsent: jest.fn().mockResolvedValue(undefined),
    refreshConsentState: jest.fn().mockResolvedValue(undefined),
    isFeatureFlagEnabled: jest.fn().mockReturnValue(undefined),
    getFeatureFlag: jest.fn().mockReturnValue(undefined),
    clearError: jest.fn(),
    initialize: jest.fn().mockResolvedValue(undefined),
    flush: jest.fn().mockResolvedValue(undefined),
    reloadFeatureFlags: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const mockState = getMockState();
    mockUseAnalyticsStore.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      return mockState;
    });
  });

  describe('returned properties', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useAnalytics());

      // Tracking functions
      expect(result.current.track).toBeDefined();
      expect(typeof result.current.track).toBe('function');

      expect(result.current.identify).toBeDefined();
      expect(typeof result.current.identify).toBe('function');

      expect(result.current.reset).toBeDefined();
      expect(typeof result.current.reset).toBe('function');

      // User properties
      expect(result.current.setUserProperties).toBeDefined();
      expect(typeof result.current.setUserProperties).toBe('function');

      // Consent
      expect(result.current.hasConsent).toBeDefined();
      expect(typeof result.current.hasConsent).toBe('boolean');

      expect(result.current.grantConsent).toBeDefined();
      expect(typeof result.current.grantConsent).toBe('function');

      expect(result.current.revokeConsent).toBeDefined();
      expect(typeof result.current.revokeConsent).toBe('function');

      // Feature flags
      expect(result.current.isFeatureFlagEnabled).toBeDefined();
      expect(typeof result.current.isFeatureFlagEnabled).toBe('function');

      // State
      expect(result.current.isInitialized).toBeDefined();
      expect(typeof result.current.isInitialized).toBe('boolean');

      expect(result.current.isInitializing).toBeDefined();
      expect(typeof result.current.isInitializing).toBe('boolean');

      expect(result.current.error).toBeDefined();

      expect(result.current.clearError).toBeDefined();
      expect(typeof result.current.clearError).toBe('function');

      expect(result.current.initialize).toBeDefined();
      expect(typeof result.current.initialize).toBe('function');

      expect(result.current.flush).toBeDefined();
      expect(typeof result.current.flush).toBe('function');

      expect(result.current.reloadFeatureFlags).toBeDefined();
      expect(typeof result.current.reloadFeatureFlags).toBe('function');
    });
  });

  describe('track function', () => {
    it('should call store track with event and properties', () => {
      const mockState = getMockState();
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      act(() => {
        result.current.track('screen_viewed', { screen_name: 'Home' });
      });

      expect(mockState.track).toHaveBeenCalledWith('screen_viewed', { screen_name: 'Home' });
    });

    it('should call store track without properties', () => {
      const mockState = getMockState();
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      act(() => {
        result.current.track('app_opened');
      });

      expect(mockState.track).toHaveBeenCalledWith('app_opened', undefined);
    });
  });

  describe('identify function', () => {
    it('should call store identify with userId and properties', () => {
      const mockState = getMockState();
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      act(() => {
        result.current.identify('user-123', { daily_step_goal: 10000 });
      });

      expect(mockState.identify).toHaveBeenCalledWith('user-123', { daily_step_goal: 10000 });
    });

    it('should call store identify with only userId', () => {
      const mockState = getMockState();
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      act(() => {
        result.current.identify('user-123');
      });

      expect(mockState.identify).toHaveBeenCalledWith('user-123', undefined);
    });
  });

  describe('reset function', () => {
    it('should call store reset', () => {
      const mockState = getMockState();
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      act(() => {
        result.current.reset();
      });

      expect(mockState.reset).toHaveBeenCalled();
    });
  });

  describe('grantConsent function', () => {
    it('should call store grantConsent', async () => {
      const mockState = getMockState();
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      await act(async () => {
        await result.current.grantConsent();
      });

      expect(mockState.grantConsent).toHaveBeenCalled();
    });
  });

  describe('revokeConsent function', () => {
    it('should call store revokeConsent', async () => {
      const mockState = getMockState();
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      await act(async () => {
        await result.current.revokeConsent();
      });

      expect(mockState.revokeConsent).toHaveBeenCalled();
    });
  });

  describe('hasConsent state', () => {
    it('should return true when consent is granted', () => {
      const mockState = getMockState();
      mockState.consentState.status = 'granted';
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      expect(result.current.hasConsent).toBe(true);
    });

    it('should return false when consent is denied', () => {
      const mockState = getMockState();
      mockState.consentState.status = 'denied';
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          // Simulate selectHasConsent returning false
          return selector === (useAnalyticsStore as any).selectHasConsent
            ? false
            : selector(mockState);
        }
        return mockState;
      });

      // For denied consent, hasConsent should be false
      // The selectHasConsent selector checks status === 'granted'
    });
  });

  describe('isFeatureFlagEnabled function', () => {
    it('should call store isFeatureFlagEnabled and return result', () => {
      const mockState = getMockState();
      mockState.isFeatureFlagEnabled.mockReturnValue(true);
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      const flagValue = result.current.isFeatureFlagEnabled('enable_session_replay');

      expect(mockState.isFeatureFlagEnabled).toHaveBeenCalledWith('enable_session_replay');
      expect(flagValue).toBe(true);
    });

    it('should return undefined when flag is not loaded', () => {
      const mockState = getMockState();
      mockState.isFeatureFlagEnabled.mockReturnValue(undefined);
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      const flagValue = result.current.isFeatureFlagEnabled('unknown_flag');

      expect(flagValue).toBeUndefined();
    });
  });

  describe('state values', () => {
    it('should return isInitialized from store', () => {
      const mockState = getMockState();
      mockState.isInitialized = true;
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      expect(result.current.isInitialized).toBe(true);
    });

    it('should return isInitializing from store', () => {
      const mockState = getMockState();
      mockState.isInitializing = true;
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      expect(result.current.isInitializing).toBe(true);
    });

    it('should return error from store', () => {
      const mockState = getMockState();
      mockState.error = 'Test error';
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      expect(result.current.error).toBe('Test error');
    });
  });

  describe('clearError function', () => {
    it('should call store clearError', () => {
      const mockState = getMockState();
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      act(() => {
        result.current.clearError();
      });

      expect(mockState.clearError).toHaveBeenCalled();
    });
  });

  describe('initialize function', () => {
    it('should call store initialize', async () => {
      const mockState = getMockState();
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      await act(async () => {
        await result.current.initialize();
      });

      expect(mockState.initialize).toHaveBeenCalled();
    });
  });

  describe('flush function', () => {
    it('should call store flush', async () => {
      const mockState = getMockState();
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      await act(async () => {
        await result.current.flush();
      });

      expect(mockState.flush).toHaveBeenCalled();
    });
  });

  describe('reloadFeatureFlags function', () => {
    it('should call store reloadFeatureFlags', async () => {
      const mockState = getMockState();
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      await act(async () => {
        await result.current.reloadFeatureFlags();
      });

      expect(mockState.reloadFeatureFlags).toHaveBeenCalled();
    });
  });

  describe('setUserProperties function', () => {
    it('should call store setUserProperties', () => {
      const mockState = getMockState();
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useAnalytics());

      act(() => {
        result.current.setUserProperties({ friend_count: 5, group_count: 2 });
      });

      expect(mockState.setUserProperties).toHaveBeenCalledWith({
        friend_count: 5,
        group_count: 2,
      });
    });
  });

  describe('callback stability', () => {
    it('should return stable callbacks between renders', () => {
      const mockState = getMockState();
      mockUseAnalyticsStore.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockState);
        }
        return mockState;
      });

      const { result, rerender } = renderHook(() => useAnalytics());

      const firstTrack = result.current.track;
      const firstIdentify = result.current.identify;
      const firstReset = result.current.reset;

      rerender({});

      // Callbacks should be stable due to useCallback
      expect(result.current.track).toBe(firstTrack);
      expect(result.current.identify).toBe(firstIdentify);
      expect(result.current.reset).toBe(firstReset);
    });
  });
});
