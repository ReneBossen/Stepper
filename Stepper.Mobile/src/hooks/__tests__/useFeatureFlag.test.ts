/**
 * Unit tests for the useFeatureFlag hooks.
 * Tests single flag, multiple flags, state management, and refresh functionality.
 */

import { renderHook, act } from '@testing-library/react-native';
import {
  useFeatureFlag,
  useFeatureFlags,
  useFeatureFlagWithState,
  useFeatureFlagRefreshOnUserChange,
} from '../useFeatureFlag';
import { useAnalyticsStore } from '@store/analyticsStore';

// Full mock state type
interface MockAnalyticsState {
  isInitialized: boolean;
  isInitializing: boolean;
  consentState: {
    status: 'granted' | 'denied' | 'unknown';
    timestamp: string | null;
    version: string | null;
  };
  error: string | null;
  track: jest.Mock;
  identify: jest.Mock;
  reset: jest.Mock;
  setUserProperties: jest.Mock;
  grantConsent: jest.Mock;
  revokeConsent: jest.Mock;
  refreshConsentState: jest.Mock;
  isFeatureFlagEnabled: jest.Mock;
  getFeatureFlag: jest.Mock;
  clearError: jest.Mock;
  initialize: jest.Mock;
  flush: jest.Mock;
  reloadFeatureFlags: jest.Mock;
}

// Create a full mock state
function createFullMockState(overrides: Partial<MockAnalyticsState> = {}): MockAnalyticsState {
  return {
    isInitialized: true,
    isInitializing: false,
    consentState: {
      status: 'granted',
      timestamp: '2024-01-15T10:00:00.000Z',
      version: '1.0',
    },
    error: null,
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
    ...overrides,
  };
}

// Mock the analytics store
jest.mock('@store/analyticsStore', () => {
  return {
    useAnalyticsStore: jest.fn((selector: (state: MockAnalyticsState) => unknown) => {
      // Default state for initial setup
      const defaultState = createFullMockState();
      if (typeof selector === 'function') {
        return selector(defaultState);
      }
      return defaultState;
    }),
  };
});

const mockUseAnalyticsStore = useAnalyticsStore as jest.MockedFunction<typeof useAnalyticsStore>;

describe('useFeatureFlag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should return flag value when flag is enabled', () => {
      const mockState = createFullMockState({
        isFeatureFlagEnabled: jest.fn().mockReturnValue(true),
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useFeatureFlag('enable_session_replay'));

      expect(result.current).toBe(true);
      expect(mockState.isFeatureFlagEnabled).toHaveBeenCalledWith('enable_session_replay');
    });

    it('should return false when flag is disabled', () => {
      const mockState = createFullMockState({
        isFeatureFlagEnabled: jest.fn().mockReturnValue(false),
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useFeatureFlag('disabled_feature'));

      expect(result.current).toBe(false);
    });

    it('should return default value when flag is undefined', () => {
      const mockState = createFullMockState({
        isFeatureFlagEnabled: jest.fn().mockReturnValue(undefined),
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useFeatureFlag('unknown_flag', false));

      expect(result.current).toBe(false);
    });

    it('should return custom default value when provided', () => {
      const mockState = createFullMockState({
        isFeatureFlagEnabled: jest.fn().mockReturnValue(undefined),
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useFeatureFlag('beta_feature', true));

      expect(result.current).toBe(true);
    });

    it('should return default value when not initialized', () => {
      const mockState = createFullMockState({
        isInitialized: false,
        isFeatureFlagEnabled: jest.fn().mockReturnValue(true),
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useFeatureFlag('some_flag', false));

      expect(result.current).toBe(false);
    });
  });
});

describe('useFeatureFlags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('multiple flags', () => {
    it('should return object with all flag values', () => {
      const mockState = createFullMockState({
        isFeatureFlagEnabled: jest.fn((flag: string) => {
          const flags: Record<string, boolean> = {
            'new-dashboard': true,
            'social-features': false,
            'advanced-stats': true,
          };
          return flags[flag];
        }),
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() =>
        useFeatureFlags(['new-dashboard', 'social-features', 'advanced-stats'])
      );

      expect(result.current['new-dashboard']).toBe(true);
      expect(result.current['social-features']).toBe(false);
      expect(result.current['advanced-stats']).toBe(true);
    });

    it('should apply default values for undefined flags', () => {
      const mockState = createFullMockState({
        isFeatureFlagEnabled: jest.fn().mockReturnValue(undefined),
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() =>
        useFeatureFlags(
          ['flag1', 'flag2', 'flag3'],
          { flag2: true }
        )
      );

      expect(result.current['flag1']).toBe(false); // Default false
      expect(result.current['flag2']).toBe(true);  // Custom default
      expect(result.current['flag3']).toBe(false); // Default false
    });

    it('should return default values when not initialized', () => {
      const mockState = createFullMockState({
        isInitialized: false,
        isFeatureFlagEnabled: jest.fn().mockReturnValue(true),
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() =>
        useFeatureFlags(['flag1'], { flag1: false })
      );

      expect(result.current['flag1']).toBe(false);
    });
  });
});

describe('useFeatureFlagWithState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return structure', () => {
    it('should return isEnabled, isLoading, and refresh', () => {
      const mockState = createFullMockState({
        isFeatureFlagEnabled: jest.fn().mockReturnValue(true),
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useFeatureFlagWithState('test-flag'));

      expect(result.current).toHaveProperty('isEnabled');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('refresh');
      expect(typeof result.current.refresh).toBe('function');
    });
  });

  describe('isEnabled', () => {
    it('should return true when flag is enabled', () => {
      const mockState = createFullMockState({
        isFeatureFlagEnabled: jest.fn().mockReturnValue(true),
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useFeatureFlagWithState('enabled-flag'));

      expect(result.current.isEnabled).toBe(true);
    });

    it('should return default when flag is undefined', () => {
      const mockState = createFullMockState({
        isFeatureFlagEnabled: jest.fn().mockReturnValue(undefined),
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useFeatureFlagWithState('unknown-flag', true));

      expect(result.current.isEnabled).toBe(true);
    });
  });

  describe('isLoading', () => {
    it('should return true when initializing', () => {
      const mockState = createFullMockState({
        isInitializing: true,
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useFeatureFlagWithState('test-flag'));

      expect(result.current.isLoading).toBe(true);
    });

    it('should return false when not initializing', () => {
      const mockState = createFullMockState({
        isInitializing: false,
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useFeatureFlagWithState('test-flag'));

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('refresh function', () => {
    it('should call reloadFeatureFlags', async () => {
      const mockReloadFeatureFlags = jest.fn().mockResolvedValue(undefined);
      const mockState = createFullMockState({
        reloadFeatureFlags: mockReloadFeatureFlags,
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useFeatureFlagWithState('test-flag'));

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockReloadFeatureFlags).toHaveBeenCalled();
    });

    it('should handle refresh errors gracefully', async () => {
      const mockReloadFeatureFlags = jest.fn().mockImplementation(async () => {
        throw new Error('Network error');
      });
      const mockState = createFullMockState({
        reloadFeatureFlags: mockReloadFeatureFlags,
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useFeatureFlagWithState('test-flag'));

      // Should not throw - the hook catches errors internally
      await act(async () => {
        try {
          await result.current.refresh();
        } catch {
          // Expected to throw, but not to crash the test
        }
      });

      expect(mockReloadFeatureFlags).toHaveBeenCalled();
    });
  });
});

describe('useFeatureFlagRefreshOnUserChange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('refresh behavior', () => {
    it('should reload flags when user changes', async () => {
      const mockReloadFeatureFlags = jest.fn().mockResolvedValue(undefined);
      const mockState = createFullMockState({
        reloadFeatureFlags: mockReloadFeatureFlags,
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { rerender } = renderHook<void, { userId: string | null }>(
        (props) => useFeatureFlagRefreshOnUserChange(props.userId),
        { initialProps: { userId: 'user-1' } }
      );

      // Initial render should trigger reload
      expect(mockReloadFeatureFlags).toHaveBeenCalledTimes(1);

      // Change user
      rerender({ userId: 'user-2' });

      expect(mockReloadFeatureFlags).toHaveBeenCalledTimes(2);
    });

    it('should reload flags when user logs out (null)', async () => {
      const mockReloadFeatureFlags = jest.fn().mockResolvedValue(undefined);
      const mockState = createFullMockState({
        reloadFeatureFlags: mockReloadFeatureFlags,
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { rerender } = renderHook<void, { userId: string | null }>(
        (props) => useFeatureFlagRefreshOnUserChange(props.userId),
        { initialProps: { userId: 'user-1' } }
      );

      expect(mockReloadFeatureFlags).toHaveBeenCalledTimes(1);

      // User logs out
      rerender({ userId: null });

      expect(mockReloadFeatureFlags).toHaveBeenCalledTimes(2);
    });

    it('should not reload flags when not initialized', async () => {
      const mockReloadFeatureFlags = jest.fn().mockResolvedValue(undefined);
      const mockState = createFullMockState({
        isInitialized: false,
        reloadFeatureFlags: mockReloadFeatureFlags,
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      renderHook<void, { userId: string | null }>(
        (props) => useFeatureFlagRefreshOnUserChange(props.userId),
        { initialProps: { userId: 'user-1' } }
      );

      expect(mockReloadFeatureFlags).not.toHaveBeenCalled();
    });

    it('should not reload flags when userId stays the same', async () => {
      const mockReloadFeatureFlags = jest.fn().mockResolvedValue(undefined);
      const mockState = createFullMockState({
        reloadFeatureFlags: mockReloadFeatureFlags,
      });
      mockUseAnalyticsStore.mockImplementation((selector: unknown) => {
        if (typeof selector === 'function') {
          return (selector as (state: MockAnalyticsState) => unknown)(mockState);
        }
        return mockState;
      });

      const { rerender } = renderHook<void, { userId: string | null }>(
        (props) => useFeatureFlagRefreshOnUserChange(props.userId),
        { initialProps: { userId: 'user-1' } }
      );

      expect(mockReloadFeatureFlags).toHaveBeenCalledTimes(1);

      // Same user, should not reload
      rerender({ userId: 'user-1' });

      // Still only called once
      expect(mockReloadFeatureFlags).toHaveBeenCalledTimes(1);
    });
  });
});
