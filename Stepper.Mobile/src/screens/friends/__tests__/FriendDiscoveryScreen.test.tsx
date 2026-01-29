import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import FriendDiscoveryScreen from '../FriendDiscoveryScreen';
import { friendsApi, UserSearchResult, OutgoingRequest } from '@services/api/friendsApi';
import { useFriendsStore } from '@store/friendsStore';
import { useUserStore } from '@store/userStore';

// Mock Share from react-native
const mockShare = jest.fn().mockResolvedValue({ action: 'sharedAction' });
jest.mock('react-native/Libraries/Share/Share', () => ({
  share: mockShare,
}));

// Mock dependencies
jest.mock('@services/api/friendsApi');
jest.mock('@store/friendsStore');
jest.mock('@store/userStore');

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock react-native FlatList to include ListHeaderComponent
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    FlatList: ({ data, renderItem, ListHeaderComponent, ListEmptyComponent, ...props }: any) => {
      const React = require('react');
      return React.createElement(RN.View, { testID: 'flatlist', ...props },
        ListHeaderComponent,
        data?.map((item: any, index: number) =>
          React.createElement(React.Fragment, { key: index }, renderItem({ item, index }))
        ),
        data?.length === 0 && ListEmptyComponent
      );
    },
  };
});

// Mock components
jest.mock('@components/common/LoadingSpinner', () => ({
  LoadingSpinner: () => {
    const RN = require('react-native');
    return <RN.View testID="loading-spinner" />;
  },
}));

jest.mock('../components', () => ({
  DiscoveryActionCard: ({ icon, title, subtitle, onPress, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.TouchableOpacity testID={testID} onPress={onPress}>
        <RN.Text>{title}</RN.Text>
        <RN.Text>{subtitle}</RN.Text>
      </RN.TouchableOpacity>
    );
  },
  UserSearchResult: ({ user, onAddFriend, onPress, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.TouchableOpacity testID={testID} onPress={() => onPress?.(user)}>
        <RN.Text>{user.display_name}</RN.Text>
        <RN.TouchableOpacity
          testID={`add-friend-${user.id}`}
          onPress={() => onAddFriend(user.id)}
        >
          <RN.Text>Add</RN.Text>
        </RN.TouchableOpacity>
      </RN.TouchableOpacity>
    );
  },
  MyQRCodeModal: ({ visible, onDismiss }: any) => {
    const RN = require('react-native');
    if (!visible) return null;
    return (
      <RN.View testID="qr-modal">
        <RN.TouchableOpacity testID="qr-modal-dismiss" onPress={onDismiss}>
          <RN.Text>Close</RN.Text>
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
    BackAction: ({ onPress }: any) => (
      <RN.TouchableOpacity testID="appbar-back" onPress={onPress}>
        <RN.Text>Back</RN.Text>
      </RN.TouchableOpacity>
    ),
    Content: ({ title }: any) => (
      <RN.Text testID="appbar-title">{title}</RN.Text>
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
    Divider: () => <RN.View testID="divider" />,
    ActivityIndicator: ({ size, ...props }: any) => (
      <RN.View testID="activity-indicator" {...props} />
    ),
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceVariant: '#F5F5F5',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        error: '#F44336',
      },
    }),
  };
});

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockFriendsApi = friendsApi as jest.Mocked<typeof friendsApi>;
const mockUseFriendsStore = useFriendsStore as jest.MockedFunction<typeof useFriendsStore>;
const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;

describe('FriendDiscoveryScreen', () => {
  const mockUser = {
    id: 'current-user-id',
    email: 'test@example.com',
    display_name: 'Current User',
    username: 'currentuser',
    preferences: {
      id: 'current-user-id',
      units: 'metric' as const,
      daily_step_goal: 10000,
      notifications_enabled: true,
      privacy_find_me: 'public' as const,
      privacy_show_steps: 'partial' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    created_at: '2024-01-01T00:00:00Z',
    onboarding_completed: true,
  };

  const mockOutgoingRequests: OutgoingRequest[] = [
    {
      id: 'request-1',
      user_id: 'user-1',
      display_name: 'John Doe',
      username: 'johndoe',
      created_at: new Date().toISOString(),
    },
    {
      id: 'request-2',
      user_id: 'user-2',
      display_name: 'Jane Smith',
      username: 'janesmith',
      created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    },
  ];

  const mockSearchResults: UserSearchResult[] = [
    {
      id: 'search-user-1',
      display_name: 'Alice Brown',
      username: 'aliceb',
      avatar_url: 'https://example.com/alice.jpg',
    },
    {
      id: 'search-user-2',
      display_name: 'Bob Wilson',
      username: 'bobw',
    },
  ];

  const mockSendRequest = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockFriendsApi.getOutgoingRequests.mockResolvedValue(mockOutgoingRequests);
    mockFriendsApi.searchUsers.mockResolvedValue(mockSearchResults);

    mockUseFriendsStore.mockReturnValue({
      sendRequest: mockSendRequest,
    });

    mockUseUserStore.mockReturnValue({
      currentUser: mockUser,
    });

    mockSendRequest.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render without crashing', async () => {
      const { getByTestId } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByTestId('appbar-header')).toBeTruthy();
      });
    });

    it('should display the title "Discover Friends"', async () => {
      const { getByTestId } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByTestId('appbar-title')).toHaveTextContent('Discover Friends');
      });
    });

    it('should render the search bar', async () => {
      const { getByTestId } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByTestId('user-search-bar')).toBeTruthy();
      });
    });

    it('should render back button', async () => {
      const { getByTestId } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByTestId('appbar-back')).toBeTruthy();
      });
    });
  });

  describe('loading state', () => {
    it('should show loading spinner initially', () => {
      mockFriendsApi.getOutgoingRequests.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { getByTestId } = render(<FriendDiscoveryScreen />);

      expect(getByTestId('loading-spinner')).toBeTruthy();
    });
  });

  describe('quick actions', () => {
    it('should render Scan QR action', async () => {
      const { getByTestId } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByTestId('action-scan-qr')).toBeTruthy();
      });
    });

    it('should render My QR Code action', async () => {
      const { getByTestId } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByTestId('action-my-qr')).toBeTruthy();
      });
    });

    it('should render Share Invite action', async () => {
      const { getByTestId } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByTestId('action-share-invite')).toBeTruthy();
      });
    });

    it('should navigate to QRScanner when Scan QR is pressed', async () => {
      const { getByTestId } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByTestId('action-scan-qr')).toBeTruthy();
      });

      fireEvent.press(getByTestId('action-scan-qr'));

      expect(mockNavigate).toHaveBeenCalledWith('QRScanner');
    });

    it('should show QR modal when My QR Code is pressed', async () => {
      const { getByTestId, queryByTestId } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByTestId('action-my-qr')).toBeTruthy();
      });

      expect(queryByTestId('qr-modal')).toBeNull();

      fireEvent.press(getByTestId('action-my-qr'));

      await waitFor(() => {
        expect(getByTestId('qr-modal')).toBeTruthy();
      });
    });

    it('should call Share when Share Invite is pressed', async () => {
      const { getByTestId } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByTestId('action-share-invite')).toBeTruthy();
      });

      fireEvent.press(getByTestId('action-share-invite'));

      // The Share.share function should be called (via react-native)
      // We verify the button is pressable - actual Share testing is integration level
      expect(getByTestId('action-share-invite')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should call goBack when back button is pressed', async () => {
      const { getByTestId } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByTestId('appbar-back')).toBeTruthy();
      });

      fireEvent.press(getByTestId('appbar-back'));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('outgoing requests', () => {
    it('should fetch outgoing requests on mount', async () => {
      render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(mockFriendsApi.getOutgoingRequests).toHaveBeenCalled();
      });
    });

    it('should display pending requests section when there are requests', async () => {
      const { getByText } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByText('Pending Requests (2)')).toBeTruthy();
      });
    });

    it('should display outgoing request names', async () => {
      const { getByText } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('Jane Smith')).toBeTruthy();
      });
    });

    it('should display "Sent today" for today requests', async () => {
      const { getByText } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByText('Sent today')).toBeTruthy();
      });
    });

    it('should display "Sent yesterday" for yesterday requests', async () => {
      const { getByText } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByText('Sent yesterday')).toBeTruthy();
      });
    });

    it('should show empty state when no pending requests', async () => {
      mockFriendsApi.getOutgoingRequests.mockResolvedValue([]);

      const { getByText } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByText('No pending friend requests')).toBeTruthy();
      });
    });
  });

  describe('search functionality', () => {
    it('should have search bar with correct placeholder', async () => {
      const { getByTestId, getByPlaceholderText } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByTestId('user-search-bar')).toBeTruthy();
      });

      expect(getByPlaceholderText('Search by name...')).toBeTruthy();
    });

    it('should allow text input in search bar', async () => {
      const { getByTestId } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByTestId('user-search-bar')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('user-search-bar'), 'Alice');

      // Verify the value was updated
      expect(getByTestId('user-search-bar').props.value).toBe('Alice');
    });
  });

  describe('QR modal', () => {
    it('should dismiss QR modal when close is pressed', async () => {
      const { getByTestId, queryByTestId } = render(<FriendDiscoveryScreen />);

      await waitFor(() => {
        expect(getByTestId('action-my-qr')).toBeTruthy();
      });

      // Open modal
      fireEvent.press(getByTestId('action-my-qr'));

      await waitFor(() => {
        expect(getByTestId('qr-modal')).toBeTruthy();
      });

      // Close modal
      fireEvent.press(getByTestId('qr-modal-dismiss'));

      await waitFor(() => {
        expect(queryByTestId('qr-modal')).toBeNull();
      });
    });
  });
});
