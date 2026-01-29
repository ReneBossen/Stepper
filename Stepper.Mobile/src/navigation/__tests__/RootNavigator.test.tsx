import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { View } from 'react-native';

// Create mocks before imports
const mockFetchCurrentUser = jest.fn();

// Mock stores
let mockIsAuthenticated = false;
let mockCurrentUser: any = null;

jest.mock('@store/authStore', () => ({
  useAuthStore: (selector: any) => {
    const state = { isAuthenticated: mockIsAuthenticated };
    return selector(state);
  },
}));

jest.mock('@store/userStore', () => ({
  useUserStore: (selector: any) => {
    const state = {
      currentUser: mockCurrentUser,
      fetchCurrentUser: mockFetchCurrentUser,
    };
    return selector(state);
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

// Mock OnboardingNavigator
jest.mock('../OnboardingNavigator', () => ({
  __esModule: true,
  default: () => <View testID="onboarding-navigator" />,
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
    mockFetchCurrentUser.mockReset();
    mockIsAuthenticated = false;
    mockCurrentUser = null;

    // Default setup - fetchCurrentUser resolves immediately
    mockFetchCurrentUser.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Flow', () => {
    it('RootNavigator_WhenNotAuthenticated_ShowsAuthNavigator', () => {
      mockIsAuthenticated = false;

      const { getByTestId } = render(<RootNavigator />);

      expect(getByTestId('auth-navigator')).toBeTruthy();
    });

    it('RootNavigator_WhenAuthenticated_ShowsMainNavigator', async () => {
      mockIsAuthenticated = true;
      mockCurrentUser = {
        id: '123',
        email: 'test@example.com',
        onboarding_completed: true,
      };

      const { getByTestId } = render(<RootNavigator />);

      await waitFor(() => {
        expect(getByTestId('main-navigator')).toBeTruthy();
      });
    });

    it('RootNavigator_WhenUserNeedsOnboarding_ShowsOnboardingNavigator', async () => {
      mockIsAuthenticated = true;
      mockCurrentUser = {
        id: '123',
        email: 'test@example.com',
        onboarding_completed: false,
      };

      const { getByTestId } = render(<RootNavigator />);

      await waitFor(() => {
        expect(getByTestId('onboarding-navigator')).toBeTruthy();
      });
    });

    it('RootNavigator_WhenAuthenticatedAndLoadingUser_ReturnsNull', async () => {
      mockIsAuthenticated = true;
      mockCurrentUser = null;
      // Make fetchCurrentUser hang to simulate loading
      mockFetchCurrentUser.mockReturnValue(new Promise(() => {}));

      const { toJSON } = render(<RootNavigator />);

      // Component returns null while loading
      expect(toJSON()).toBeNull();
    });
  });

  describe('User Fetching', () => {
    it('RootNavigator_WhenAuthenticatedWithoutUser_FetchesCurrentUser', async () => {
      mockIsAuthenticated = true;
      mockCurrentUser = null;
      mockFetchCurrentUser.mockResolvedValue(undefined);

      render(<RootNavigator />);

      await waitFor(() => {
        expect(mockFetchCurrentUser).toHaveBeenCalled();
      });
    });

    it('RootNavigator_WhenAuthenticatedWithUser_DoesNotFetchUser', async () => {
      mockIsAuthenticated = true;
      mockCurrentUser = {
        id: '123',
        email: 'test@example.com',
        onboarding_completed: true,
      };

      render(<RootNavigator />);

      // Wait a tick to ensure any effects have run
      await waitFor(() => {
        expect(mockFetchCurrentUser).not.toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('RootNavigator_WhenNotAuthenticated_DoesNotFetchUser', async () => {
      mockIsAuthenticated = false;

      render(<RootNavigator />);

      await waitFor(() => {
        expect(mockFetchCurrentUser).not.toHaveBeenCalled();
      });
    });

    it('RootNavigator_WhenUserHasNullOnboardingCompleted_ShowsOnboardingNavigator', async () => {
      mockIsAuthenticated = true;
      mockCurrentUser = {
        id: '123',
        email: 'test@example.com',
        onboarding_completed: null,
      };

      const { getByTestId } = render(<RootNavigator />);

      await waitFor(() => {
        // null is falsy, so !null is true -> needsOnboarding
        expect(getByTestId('onboarding-navigator')).toBeTruthy();
      });
    });
  });
});
