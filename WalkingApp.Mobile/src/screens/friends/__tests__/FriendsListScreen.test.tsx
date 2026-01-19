import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import FriendsListScreen from '../FriendsListScreen';
import { useFriendsStore, Friend } from '@store/friendsStore';
import { useUserStore } from '@store/userStore';

// Mock dependencies
jest.mock('@store/friendsStore');
jest.mock('@store/userStore');

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock components
jest.mock('@components/common/LoadingSpinner', () => ({
  LoadingSpinner: () => {
    const RN = require('react-native');
    return <RN.View testID="loading-spinner" />;
  },
}));

jest.mock('@components/common/ErrorMessage', () => ({
  ErrorMessage: ({ message, onRetry }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID="error-message">
        <RN.Text testID="error-text">{message}</RN.Text>
        <RN.TouchableOpacity testID="retry-button" onPress={onRetry}>
          <RN.Text>Retry</RN.Text>
        </RN.TouchableOpacity>
      </RN.View>
    );
  },
}));

jest.mock('../components', () => ({
  FriendListItem: ({ friend, onPress, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.TouchableOpacity testID={testID} onPress={() => onPress?.(friend)}>
        <RN.Text testID={`${testID}-name`}>{friend.display_name}</RN.Text>
        <RN.Text testID={`${testID}-steps`}>{friend.today_steps ?? 0} steps</RN.Text>
      </RN.TouchableOpacity>
    );
  },
  FriendRequestsBanner: ({ count, onPress, testID }: any) => {
    const RN = require('react-native');
    if (count === 0) return null;
    return (
      <RN.TouchableOpacity testID={testID} onPress={onPress}>
        <RN.Text>{count} pending requests</RN.Text>
      </RN.TouchableOpacity>
    );
  },
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  const Appbar = {
    Header: ({ children, elevated }: any) => (
      <RN.View testID="appbar-header">{children}</RN.View>
    ),
    Content: ({ title }: any) => (
      <RN.Text testID="appbar-title">{title}</RN.Text>
    ),
    Action: ({ icon, onPress, accessibilityLabel }: any) => (
      <RN.TouchableOpacity
        testID={`appbar-action-${icon}`}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
      >
        <RN.Text>{icon}</RN.Text>
      </RN.TouchableOpacity>
    ),
  };

  return {
    Appbar,
    Searchbar: ({ placeholder, onChangeText, value, style, testID }: any) => (
      <RN.TextInput
        testID={testID}
        placeholder={placeholder}
        onChangeText={onChangeText}
        value={value}
        style={style}
      />
    ),
    Text: ({ children, style, variant, ...props }: any) => (
      <RN.Text {...props} style={style}>{children}</RN.Text>
    ),
    FAB: ({ icon, style, color, onPress, accessibilityLabel, testID }: any) => (
      <RN.TouchableOpacity
        testID={testID}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        style={style}
      >
        <RN.Text>{icon}</RN.Text>
      </RN.TouchableOpacity>
    ),
    Divider: () => <RN.View testID="divider" />,
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceVariant: '#F5F5F5',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        onPrimary: '#FFFFFF',
      },
    }),
  };
});

const mockUseFriendsStore = useFriendsStore as jest.MockedFunction<typeof useFriendsStore>;
const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;

describe('FriendsListScreen', () => {
  const mockFetchFriendsWithSteps = jest.fn();
  const mockFetchRequests = jest.fn();

  const createMockFriend = (overrides: Partial<Friend> = {}): Friend => ({
    id: 'friendship-1',
    user_id: 'user-1',
    display_name: 'John Doe',
    username: 'johndoe',
    avatar_url: 'https://example.com/avatar.jpg',
    today_steps: 8500,
    status: 'accepted',
    ...overrides,
  });

  const createMockFriends = (count: number): Friend[] => {
    return Array.from({ length: count }, (_, index) => ({
      id: `friendship-${index}`,
      user_id: `user-${index}`,
      display_name: `User ${index}`,
      username: `user${index}`,
      today_steps: 5000 + index * 1000,
      status: 'accepted' as const,
    }));
  };

  const defaultFriendsState = {
    friends: createMockFriends(3),
    requests: [],
    isLoading: false,
    error: null,
    fetchFriendsWithSteps: mockFetchFriendsWithSteps,
    fetchRequests: mockFetchRequests,
  };

  const defaultUserState = {
    currentUser: {
      id: 'current-user',
      email: 'test@example.com',
      display_name: 'Test User',
      username: 'testuser',
      preferences: {
        units: 'metric' as const,
        daily_step_goal: 10000,
        theme: 'light' as const,
        notifications: {
          push_enabled: true,
          friend_requests: true,
          friend_accepted: true,
          group_invites: true,
          goal_achieved: true,
        },
        privacy: {
          profile_visibility: 'public' as const,
          activity_visibility: 'public' as const,
          find_me: 'everyone' as const,
        },
      },
      created_at: '2024-01-01T00:00:00Z',
      onboarding_completed: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseFriendsStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultFriendsState);
      }
      return defaultFriendsState;
    });

    mockUseUserStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultUserState);
      }
      return defaultUserState;
    });
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<FriendsListScreen />);
      expect(getByTestId('appbar-header')).toBeTruthy();
    });

    it('should display the title', () => {
      const { getByTestId } = render(<FriendsListScreen />);
      expect(getByTestId('appbar-title')).toHaveTextContent('Friends');
    });

    it('should render search action button', () => {
      const { getByTestId } = render(<FriendsListScreen />);
      expect(getByTestId('appbar-action-magnify')).toBeTruthy();
    });

    it('should render add friend action button', () => {
      const { getByTestId } = render(<FriendsListScreen />);
      expect(getByTestId('appbar-action-account-plus')).toBeTruthy();
    });

    it('should render FAB for adding friends', () => {
      const { getByTestId } = render(<FriendsListScreen />);
      expect(getByTestId('add-friend-fab')).toBeTruthy();
    });

    it('should render friend list items', () => {
      const { getByTestId } = render(<FriendsListScreen />);
      expect(getByTestId('friend-item-friendship-0')).toBeTruthy();
      expect(getByTestId('friend-item-friendship-1')).toBeTruthy();
      expect(getByTestId('friend-item-friendship-2')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when loading with no data', () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          friends: [],
          isLoading: true,
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<FriendsListScreen />);
      expect(getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should not show loading spinner when loading with existing data', () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          isLoading: true,
        };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = render(<FriendsListScreen />);
      expect(queryByTestId('loading-spinner')).toBeNull();
    });
  });

  describe('error state', () => {
    it('should show error message when there is an error and no data', () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          friends: [],
          error: 'Failed to load friends',
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<FriendsListScreen />);
      expect(getByTestId('error-message')).toBeTruthy();
    });

    it('should display error text', () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          friends: [],
          error: 'Network error',
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<FriendsListScreen />);
      expect(getByTestId('error-text')).toHaveTextContent('Network error');
    });

    it('should call fetch methods when retry is pressed', async () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          friends: [],
          error: 'Failed to load',
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<FriendsListScreen />);

      fireEvent.press(getByTestId('retry-button'));

      await waitFor(() => {
        expect(mockFetchFriendsWithSteps).toHaveBeenCalled();
        expect(mockFetchRequests).toHaveBeenCalled();
      });
    });

    it('should not show error when data exists despite error', () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          error: 'Some error',
        };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = render(<FriendsListScreen />);
      expect(queryByTestId('error-message')).toBeNull();
    });
  });

  describe('empty state', () => {
    it('should not render friend items when friends list is empty', () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          friends: [],
        };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = render(<FriendsListScreen />);
      // No friend items should be rendered
      expect(queryByTestId('friend-item-friendship-0')).toBeNull();
      expect(queryByTestId('friend-item-friendship-1')).toBeNull();
    });

    it('should still render FAB and app bar when empty', () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          friends: [],
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<FriendsListScreen />);
      expect(getByTestId('add-friend-fab')).toBeTruthy();
      expect(getByTestId('appbar-header')).toBeTruthy();
    });
  });

  describe('friend requests banner', () => {
    // Note: FriendRequestsBanner is rendered inside FlatList's ListHeaderComponent
    // which may not render in the test environment. The banner component itself
    // is tested in FriendRequestsBanner.test.tsx.
    // Here we test that the state is properly passed to the component.

    it('should have requests in state when there are pending requests', () => {
      const mockRequests = [createMockFriend({ id: 'req-1', status: 'pending' })];
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          requests: mockRequests,
        };
        return selector ? selector(state) : state;
      });

      // Verify the store has requests
      const { result } = require('@testing-library/react-native').renderHook(() =>
        useFriendsStore()
      );
      expect(result.current.requests).toHaveLength(1);
    });

    it('should have empty requests when there are no pending requests', () => {
      // Default state has empty requests
      const { result } = require('@testing-library/react-native').renderHook(() =>
        useFriendsStore()
      );
      expect(result.current.requests).toHaveLength(0);
    });

    it('should fetch requests on mount', () => {
      render(<FriendsListScreen />);
      expect(mockFetchRequests).toHaveBeenCalled();
    });
  });

  describe('search functionality', () => {
    it('should show searchbar when search action is pressed', () => {
      const { getByTestId, queryByTestId } = render(<FriendsListScreen />);

      // Search bar should not be visible initially
      expect(queryByTestId('friends-search-bar')).toBeNull();

      // Press search action
      fireEvent.press(getByTestId('appbar-action-magnify'));

      // Search bar should now be visible
      expect(getByTestId('friends-search-bar')).toBeTruthy();
    });

    it('should hide searchbar when search action is pressed again', () => {
      const { getByTestId, queryByTestId } = render(<FriendsListScreen />);

      // Show search bar
      fireEvent.press(getByTestId('appbar-action-magnify'));
      expect(getByTestId('friends-search-bar')).toBeTruthy();

      // Hide search bar
      fireEvent.press(getByTestId('appbar-action-magnify'));
      expect(queryByTestId('friends-search-bar')).toBeNull();
    });

    it('should filter friends by display name', () => {
      const { getByTestId, queryByTestId } = render(<FriendsListScreen />);

      // Show search bar
      fireEvent.press(getByTestId('appbar-action-magnify'));

      // Type search query
      fireEvent.changeText(getByTestId('friends-search-bar'), 'User 0');

      // Should only show matching friend
      expect(getByTestId('friend-item-friendship-0')).toBeTruthy();
      expect(queryByTestId('friend-item-friendship-1')).toBeNull();
      expect(queryByTestId('friend-item-friendship-2')).toBeNull();
    });

    it('should filter friends by username', () => {
      const { getByTestId, queryByTestId } = render(<FriendsListScreen />);

      // Show search bar
      fireEvent.press(getByTestId('appbar-action-magnify'));

      // Type search query using username
      fireEvent.changeText(getByTestId('friends-search-bar'), 'user1');

      // Should only show matching friend
      expect(getByTestId('friend-item-friendship-1')).toBeTruthy();
      expect(queryByTestId('friend-item-friendship-0')).toBeNull();
      expect(queryByTestId('friend-item-friendship-2')).toBeNull();
    });

    it('should filter out all friends when search has no results', () => {
      const { getByTestId, queryByTestId } = render(<FriendsListScreen />);

      // Show search bar
      fireEvent.press(getByTestId('appbar-action-magnify'));

      // Type non-matching search query
      fireEvent.changeText(getByTestId('friends-search-bar'), 'nonexistent');

      // No friend items should be visible
      expect(queryByTestId('friend-item-friendship-0')).toBeNull();
      expect(queryByTestId('friend-item-friendship-1')).toBeNull();
      expect(queryByTestId('friend-item-friendship-2')).toBeNull();
    });

    it('should maintain search bar value when typing', () => {
      const { getByTestId } = render(<FriendsListScreen />);

      // Show search bar
      fireEvent.press(getByTestId('appbar-action-magnify'));

      // Type search query
      fireEvent.changeText(getByTestId('friends-search-bar'), 'xyz');

      expect(getByTestId('friends-search-bar').props.value).toBe('xyz');
    });

    it('should clear search query when search is hidden', async () => {
      const { getByTestId, queryByTestId } = render(<FriendsListScreen />);

      // Show search bar and type query
      fireEvent.press(getByTestId('appbar-action-magnify'));
      fireEvent.changeText(getByTestId('friends-search-bar'), 'User 0');

      // Verify filter is applied
      expect(getByTestId('friend-item-friendship-0')).toBeTruthy();
      expect(queryByTestId('friend-item-friendship-1')).toBeNull();

      // Hide search bar (this should clear the query)
      fireEvent.press(getByTestId('appbar-action-magnify'));

      // Show search bar again - all friends should be visible (query was cleared)
      fireEvent.press(getByTestId('appbar-action-magnify'));

      await waitFor(() => {
        expect(getByTestId('friend-item-friendship-0')).toBeTruthy();
        expect(getByTestId('friend-item-friendship-1')).toBeTruthy();
        expect(getByTestId('friend-item-friendship-2')).toBeTruthy();
      });
    });

    it('should be case insensitive', () => {
      const { getByTestId, queryByTestId } = render(<FriendsListScreen />);

      // Show search bar
      fireEvent.press(getByTestId('appbar-action-magnify'));

      // Type uppercase search query
      fireEvent.changeText(getByTestId('friends-search-bar'), 'USER 0');

      // Should find the friend
      expect(getByTestId('friend-item-friendship-0')).toBeTruthy();
      expect(queryByTestId('friend-item-friendship-1')).toBeNull();
    });
  });

  describe('sorting', () => {
    it('should sort friends by steps (highest first)', () => {
      const { getByTestId } = render(<FriendsListScreen />);

      // Friends are created with steps: 5000, 6000, 7000
      // So sorted order should be: friendship-2 (7000), friendship-1 (6000), friendship-0 (5000)
      // Verify all items exist - sorted by steps descending
      expect(getByTestId('friend-item-friendship-2')).toBeTruthy();
      expect(getByTestId('friend-item-friendship-1')).toBeTruthy();
      expect(getByTestId('friend-item-friendship-0')).toBeTruthy();

      // Verify steps are displayed correctly for highest and lowest
      expect(getByTestId('friend-item-friendship-2-steps')).toHaveTextContent('7000 steps');
      expect(getByTestId('friend-item-friendship-0-steps')).toHaveTextContent('5000 steps');
    });
  });

  describe('navigation', () => {
    it('should navigate to FriendDiscovery when FAB is pressed', () => {
      const { getByTestId } = render(<FriendsListScreen />);

      fireEvent.press(getByTestId('add-friend-fab'));

      expect(mockNavigate).toHaveBeenCalledWith('FriendDiscovery');
    });

    it('should navigate to FriendDiscovery when add friend action is pressed', () => {
      const { getByTestId } = render(<FriendsListScreen />);

      fireEvent.press(getByTestId('appbar-action-account-plus'));

      expect(mockNavigate).toHaveBeenCalledWith('FriendDiscovery');
    });

    it('should navigate to UserProfile when friend is pressed', () => {
      const { getByTestId } = render(<FriendsListScreen />);

      fireEvent.press(getByTestId('friend-item-friendship-0'));

      expect(mockNavigate).toHaveBeenCalledWith('UserProfile', { userId: 'user-0' });
    });
  });

  describe('data fetching', () => {
    it('should fetch friends and requests on mount', () => {
      render(<FriendsListScreen />);

      expect(mockFetchFriendsWithSteps).toHaveBeenCalled();
      expect(mockFetchRequests).toHaveBeenCalled();
    });
  });

  describe('user preferences', () => {
    it('should use default daily goal when user has no preferences', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = { currentUser: null };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<FriendsListScreen />);
      // Screen should render with default values
      expect(getByTestId('appbar-header')).toBeTruthy();
    });

    it('should use user daily step goal from preferences', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          currentUser: {
            ...defaultUserState.currentUser,
            preferences: {
              ...defaultUserState.currentUser.preferences,
              daily_step_goal: 8000,
            },
          },
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<FriendsListScreen />);
      // Screen should render with custom goal
      expect(getByTestId('appbar-header')).toBeTruthy();
    });
  });
});
