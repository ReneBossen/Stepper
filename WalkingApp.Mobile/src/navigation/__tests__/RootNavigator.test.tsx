import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { View } from 'react-native';

// Create mocks before imports
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockUnsubscribe = jest.fn();

// Mock Supabase
jest.mock('@services/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}));

// Mock navigation components
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Screen: ({ name, component: Component }: any) => {
      if (!Component) return null;
      return <Component testID={`screen-${name}`} />;
    },
  }),
}));

// Mock navigators
jest.mock('../AuthNavigator', () => ({
  __esModule: true,
  default: () => <View testID="auth-navigator" />,
}));

jest.mock('../MainNavigator', () => ({
  __esModule: true,
  default: () => <View testID="main-navigator" />,
}));

// Mock screens
jest.mock('@screens/onboarding/OnboardingScreen', () => ({
  __esModule: true,
  default: () => <View testID="onboarding-screen" />,
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  createURL: jest.fn(),
  parse: jest.fn(),
  parseInitialURL: jest.fn(),
}));

import RootNavigator from '../RootNavigator';

describe('RootNavigator', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockOnAuthStateChange.mockReset();
    mockUnsubscribe.mockReset();

    // Default setup
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Flow', () => {
    it('RootNavigator_WhileCheckingAuthState_ShowsNothing', () => {
      mockGetSession.mockReturnValue(new Promise(() => {})); // Never resolves

      const { queryByTestId } = render(<RootNavigator />);

      expect(queryByTestId('auth-navigator')).toBeNull();
      expect(queryByTestId('main-navigator')).toBeNull();
      expect(queryByTestId('onboarding-screen')).toBeNull();
    });

    it('RootNavigator_WhenNotAuthenticated_ShowsAuthNavigator', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      const { getByTestId } = render(<RootNavigator />);

      await waitFor(() => {
        expect(getByTestId('auth-navigator')).toBeTruthy();
      });
    });

    it('RootNavigator_WhenAuthenticated_ShowsMainNavigator', async () => {
      const mockSession = {
        access_token: 'mock-token',
        user: {
          id: '123',
          email: 'test@example.com',
          user_metadata: { onboarding_completed: true },
        },
      };

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
      });

      const { getByTestId } = render(<RootNavigator />);

      await waitFor(() => {
        expect(getByTestId('main-navigator')).toBeTruthy();
      });
    });

    it('RootNavigator_WhenUserNeedsOnboarding_ShowsOnboardingScreen', async () => {
      const mockSession = {
        access_token: 'mock-token',
        user: {
          id: '123',
          email: 'test@example.com',
          user_metadata: { onboarding_completed: false },
        },
      };

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
      });

      const { getByTestId } = render(<RootNavigator />);

      await waitFor(() => {
        expect(getByTestId('onboarding-screen')).toBeTruthy();
      });
    });
  });

  describe('Auth State Changes', () => {
    it('RootNavigator_OnMount_SetsUpAuthStateChangeListener', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      render(<RootNavigator />);

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });
    });

    it('RootNavigator_OnUnmount_UnsubscribesFromAuthChanges', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      const { unmount } = render(<RootNavigator />);

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('RootNavigator_OnMount_ChecksAuthSessionOnce', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      render(<RootNavigator />);

      await waitFor(() => {
        expect(mockGetSession).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge Cases', () => {
    it('RootNavigator_WithSessionFetchError_ShowsAuthNavigator', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' },
      });

      const { getByTestId } = render(<RootNavigator />);

      await waitFor(() => {
        expect(getByTestId('auth-navigator')).toBeTruthy();
      });
    });

    it('RootNavigator_WithSessionWithoutUserMetadata_ShowsMainNavigator', async () => {
      const mockSession = {
        access_token: 'mock-token',
        user: {
          id: '123',
          email: 'test@example.com',
          user_metadata: {},
        },
      };

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
      });

      const { getByTestId } = render(<RootNavigator />);

      await waitFor(() => {
        expect(getByTestId('main-navigator')).toBeTruthy();
      });
    });
  });
});
