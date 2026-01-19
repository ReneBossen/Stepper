import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import FriendRequestsScreen from '../FriendRequestsScreen';
import { useFriendsStore, Friend } from '@store/friendsStore';

// Mock dependencies
jest.mock('@store/friendsStore');

// Mock navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
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
    BackAction: ({ onPress }: any) => (
      <RN.TouchableOpacity testID="back-action" onPress={onPress}>
        <RN.Text>Back</RN.Text>
      </RN.TouchableOpacity>
    ),
  };

  const Avatar = {
    Image: ({ size, source, ...props }: any) => (
      <RN.View {...props} testID="avatar-image" style={{ width: size, height: size }} />
    ),
    Text: ({ size, label, ...props }: any) => (
      <RN.View {...props} testID="avatar-text" style={{ width: size, height: size }}>
        <RN.Text>{label}</RN.Text>
      </RN.View>
    ),
  };

  return {
    Appbar,
    Avatar,
    Text: ({ children, style, variant, ...props }: any) => (
      <RN.Text {...props} style={style}>{children}</RN.Text>
    ),
    Button: ({ children, onPress, disabled, loading, mode, compact, style, ...props }: any) => (
      <RN.TouchableOpacity
        {...props}
        onPress={onPress}
        disabled={disabled}
        testID={`button-${children?.toLowerCase?.() || children}`}
        accessibilityState={{ disabled }}
      >
        {loading && <RN.View testID="button-loading" />}
        <RN.Text>{children}</RN.Text>
      </RN.TouchableOpacity>
    ),
    Divider: () => <RN.View testID="divider" />,
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        primaryContainer: '#E8F5E9',
        onPrimaryContainer: '#1B5E20',
      },
    }),
  };
});

const mockUseFriendsStore = useFriendsStore as jest.MockedFunction<typeof useFriendsStore>;

describe('FriendRequestsScreen', () => {
  const mockFetchRequests = jest.fn();
  const mockAcceptRequest = jest.fn();
  const mockDeclineRequest = jest.fn();

  const createMockRequest = (overrides: Partial<Friend> = {}): Friend => ({
    id: 'request-1',
    user_id: 'user-1',
    display_name: 'John Doe',
    username: 'johndoe',
    avatar_url: 'https://example.com/avatar.jpg',
    status: 'pending',
    ...overrides,
  });

  const createMockRequests = (count: number): Friend[] => {
    return Array.from({ length: count }, (_, index) => ({
      id: `request-${index}`,
      user_id: `user-${index}`,
      display_name: `User ${index}`,
      username: `user${index}`,
      avatar_url: index % 2 === 0 ? `https://example.com/avatar${index}.jpg` : undefined,
      status: 'pending' as const,
    }));
  };

  const defaultFriendsState = {
    friends: [],
    requests: createMockRequests(3),
    isLoading: false,
    error: null,
    fetchRequests: mockFetchRequests,
    acceptRequest: mockAcceptRequest,
    declineRequest: mockDeclineRequest,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseFriendsStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultFriendsState);
      }
      return defaultFriendsState;
    });
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<FriendRequestsScreen />);
      expect(getByTestId('appbar-header')).toBeTruthy();
    });

    it('should display the title', () => {
      const { getByTestId } = render(<FriendRequestsScreen />);
      expect(getByTestId('appbar-title')).toHaveTextContent('Friend Requests');
    });

    it('should render back action button', () => {
      const { getByTestId } = render(<FriendRequestsScreen />);
      expect(getByTestId('back-action')).toBeTruthy();
    });

    it('should render request items', () => {
      const { getAllByText } = render(<FriendRequestsScreen />);
      expect(getAllByText(/User \d/)).toHaveLength(3);
    });

    it('should display usernames with @ prefix', () => {
      const { getByText } = render(<FriendRequestsScreen />);
      expect(getByText('@user0')).toBeTruthy();
      expect(getByText('@user1')).toBeTruthy();
      expect(getByText('@user2')).toBeTruthy();
    });

    it('should render Accept button for each request', () => {
      const { getAllByTestId } = render(<FriendRequestsScreen />);
      const acceptButtons = getAllByTestId('button-accept');
      expect(acceptButtons).toHaveLength(3);
    });

    it('should render Decline button for each request', () => {
      const { getAllByTestId } = render(<FriendRequestsScreen />);
      const declineButtons = getAllByTestId('button-decline');
      expect(declineButtons).toHaveLength(3);
    });
  });

  describe('avatar rendering', () => {
    it('should render Avatar.Image when avatar_url is provided', () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          requests: [createMockRequest({ avatar_url: 'https://example.com/avatar.jpg' })],
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId, queryByTestId } = render(<FriendRequestsScreen />);
      expect(getByTestId('avatar-image')).toBeTruthy();
      expect(queryByTestId('avatar-text')).toBeNull();
    });

    it('should render Avatar.Text when avatar_url is not provided', () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          requests: [createMockRequest({ avatar_url: undefined })],
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId, queryByTestId } = render(<FriendRequestsScreen />);
      expect(getByTestId('avatar-text')).toBeTruthy();
      expect(queryByTestId('avatar-image')).toBeNull();
    });

    it('should show correct initials for name', () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          requests: [createMockRequest({ display_name: 'Jane Smith', avatar_url: undefined })],
        };
        return selector ? selector(state) : state;
      });

      const { getByText } = render(<FriendRequestsScreen />);
      expect(getByText('JS')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when loading with no data', () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          requests: [],
          isLoading: true,
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<FriendRequestsScreen />);
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

      const { queryByTestId } = render(<FriendRequestsScreen />);
      expect(queryByTestId('loading-spinner')).toBeNull();
    });
  });

  describe('error state', () => {
    it('should show error message when there is an error and no data', () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          requests: [],
          error: 'Failed to load requests',
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<FriendRequestsScreen />);
      expect(getByTestId('error-message')).toBeTruthy();
    });

    it('should display error text', () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          requests: [],
          error: 'Network error',
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<FriendRequestsScreen />);
      expect(getByTestId('error-text')).toHaveTextContent('Network error');
    });

    it('should call fetchRequests when retry is pressed', async () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          requests: [],
          error: 'Failed to load',
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<FriendRequestsScreen />);

      fireEvent.press(getByTestId('retry-button'));

      await waitFor(() => {
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

      const { queryByTestId } = render(<FriendRequestsScreen />);
      expect(queryByTestId('error-message')).toBeNull();
    });
  });

  describe('empty state', () => {
    it('should not render request items when requests list is empty', () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          requests: [],
        };
        return selector ? selector(state) : state;
      });

      const { queryAllByTestId } = render(<FriendRequestsScreen />);
      // No accept/decline buttons should be rendered
      expect(queryAllByTestId('button-accept')).toHaveLength(0);
      expect(queryAllByTestId('button-decline')).toHaveLength(0);
    });

    it('should still render app bar when empty', () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          requests: [],
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<FriendRequestsScreen />);
      expect(getByTestId('appbar-header')).toBeTruthy();
      expect(getByTestId('back-action')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate back when back action is pressed', () => {
      const { getByTestId } = render(<FriendRequestsScreen />);

      fireEvent.press(getByTestId('back-action'));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('accept request', () => {
    it('should call acceptRequest when Accept button is pressed', async () => {
      const { getAllByTestId } = render(<FriendRequestsScreen />);

      const acceptButtons = getAllByTestId('button-accept');
      fireEvent.press(acceptButtons[0]);

      await waitFor(() => {
        expect(mockAcceptRequest).toHaveBeenCalledWith('user-0');
      });
    });

    it('should call acceptRequest with correct userId', async () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          requests: [createMockRequest({ user_id: 'specific-user-id' })],
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<FriendRequestsScreen />);

      fireEvent.press(getByTestId('button-accept'));

      await waitFor(() => {
        expect(mockAcceptRequest).toHaveBeenCalledWith('specific-user-id');
      });
    });
  });

  describe('decline request', () => {
    it('should call declineRequest when Decline button is pressed', async () => {
      const { getAllByTestId } = render(<FriendRequestsScreen />);

      const declineButtons = getAllByTestId('button-decline');
      fireEvent.press(declineButtons[0]);

      await waitFor(() => {
        expect(mockDeclineRequest).toHaveBeenCalledWith('user-0');
      });
    });

    it('should call declineRequest with correct userId', async () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          requests: [createMockRequest({ user_id: 'decline-user-id' })],
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<FriendRequestsScreen />);

      fireEvent.press(getByTestId('button-decline'));

      await waitFor(() => {
        expect(mockDeclineRequest).toHaveBeenCalledWith('decline-user-id');
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch requests on mount', () => {
      render(<FriendRequestsScreen />);

      expect(mockFetchRequests).toHaveBeenCalled();
    });
  });

  describe('multiple requests', () => {
    it('should render all request items', () => {
      mockUseFriendsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultFriendsState,
          requests: createMockRequests(5),
        };
        return selector ? selector(state) : state;
      });

      const { getAllByText } = render(<FriendRequestsScreen />);
      expect(getAllByText(/User \d/)).toHaveLength(5);
    });

    it('should handle accepting different requests', async () => {
      const { getAllByTestId } = render(<FriendRequestsScreen />);

      const acceptButtons = getAllByTestId('button-accept');

      // Accept second request
      fireEvent.press(acceptButtons[1]);

      await waitFor(() => {
        expect(mockAcceptRequest).toHaveBeenCalledWith('user-1');
      });
    });

    it('should handle declining different requests', async () => {
      const { getAllByTestId } = render(<FriendRequestsScreen />);

      const declineButtons = getAllByTestId('button-decline');

      // Decline third request
      fireEvent.press(declineButtons[2]);

      await waitFor(() => {
        expect(mockDeclineRequest).toHaveBeenCalledWith('user-2');
      });
    });
  });
});
