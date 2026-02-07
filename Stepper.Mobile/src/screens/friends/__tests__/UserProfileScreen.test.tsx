import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import UserProfileScreen from '../UserProfileScreen';
import type { FriendsStackScreenProps } from '@navigation/types';
import {
  useUserStore,
  ViewedUserState,
  PublicUserProfile,
  UserStats,
  WeeklyActivity,
  Achievement,
  MutualGroup,
} from '@store/userStore';
import { useFriendsStore } from '@store/friendsStore';
import { friendsApi } from '@services/api/friendsApi';

// Helper to create test component with proper props
const renderUserProfileScreen = (userId: string = 'user-456') => {
  const route = { params: { userId }, key: 'test', name: 'UserProfile' as const };
  const mockNavigation = {
    navigate: mockNavigate,
    goBack: mockGoBack,
    dispatch: jest.fn(),
    reset: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => true),
    getId: jest.fn(),
    getState: jest.fn(),
    getParent: jest.fn(),
    setParams: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => () => {}),
    removeListener: jest.fn(),
  };
  // Cast to any to avoid navigation typing issues in tests
  return render(
    <UserProfileScreen
      route={route as any}
      navigation={mockNavigation as any}
    />
  );
};

// Mock dependencies
jest.mock('@store/userStore');
jest.mock('@store/friendsStore');
jest.mock('@services/api/friendsApi');

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useFocusEffect: (callback: any) => {
    const React = require('react');
    React.useEffect(() => {
      return callback();
    }, []);
  },
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
        {onRetry && (
          <RN.TouchableOpacity testID="retry-button" onPress={onRetry}>
            <RN.Text>Retry</RN.Text>
          </RN.TouchableOpacity>
        )}
      </RN.View>
    );
  },
}));

jest.mock('@screens/profile/components/StatCard', () => ({
  StatCard: ({ value, title, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID={testID}>
        <RN.Text testID={`${testID}-value`}>{value}</RN.Text>
        <RN.Text testID={`${testID}-label`}>{title}</RN.Text>
      </RN.View>
    );
  },
}));

jest.mock('@screens/profile/components/WeeklyActivityCard', () => ({
  WeeklyActivityCard: ({ activity, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID={testID}>
        <RN.Text testID={`${testID}-steps`}>{activity.total_steps}</RN.Text>
      </RN.View>
    );
  },
}));

jest.mock('@screens/profile/components/AchievementChip', () => ({
  AchievementChip: ({ achievement, onPress, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.TouchableOpacity testID={testID} onPress={() => onPress?.(achievement)}>
        <RN.Text testID={`${testID}-name`}>{achievement.name}</RN.Text>
      </RN.TouchableOpacity>
    );
  },
}));

jest.mock('@screens/profile/components/MutualGroupItem', () => ({
  MutualGroupItem: ({ group, onPress, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.TouchableOpacity testID={testID} onPress={() => onPress?.(group)}>
        <RN.Text testID={`${testID}-name`}>{group.name}</RN.Text>
      </RN.TouchableOpacity>
    );
  },
}));

jest.mock('@screens/profile/components/FriendActionButton', () => ({
  FriendActionButton: ({
    status,
    friendsSince,
    isLoading,
    onAddFriend,
    onAcceptRequest,
    onDeclineRequest,
    onRemoveFriend,
    testID,
  }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID={testID}>
        <RN.Text testID={`${testID}-status`}>{status}</RN.Text>
        {status === 'none' && (
          <RN.TouchableOpacity
            testID={`${testID}-add`}
            onPress={onAddFriend}
            disabled={isLoading}
          >
            <RN.Text>Add Friend</RN.Text>
          </RN.TouchableOpacity>
        )}
        {status === 'pending_received' && (
          <>
            <RN.TouchableOpacity
              testID={`${testID}-accept`}
              onPress={onAcceptRequest}
              disabled={isLoading}
            >
              <RN.Text>Accept</RN.Text>
            </RN.TouchableOpacity>
            <RN.TouchableOpacity
              testID={`${testID}-decline`}
              onPress={onDeclineRequest}
              disabled={isLoading}
            >
              <RN.Text>Decline</RN.Text>
            </RN.TouchableOpacity>
          </>
        )}
        {status === 'accepted' && (
          <RN.TouchableOpacity
            testID={`${testID}-remove`}
            onPress={onRemoveFriend}
            disabled={isLoading}
          >
            <RN.Text>Remove Friend</RN.Text>
          </RN.TouchableOpacity>
        )}
      </RN.View>
    );
  },
}));

jest.mock('@screens/profile/components/PrivacyRestrictedView', () => ({
  PrivacyRestrictedView: ({ onAddFriend, isLoading, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID={testID}>
        <RN.Text>This profile is private</RN.Text>
        {onAddFriend && (
          <RN.TouchableOpacity
            testID={`${testID}-add-friend`}
            onPress={onAddFriend}
            disabled={isLoading}
          >
            <RN.Text>Add Friend</RN.Text>
          </RN.TouchableOpacity>
        )}
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
      <RN.TouchableOpacity testID="appbar-back" onPress={onPress}>
        <RN.Text>Back</RN.Text>
      </RN.TouchableOpacity>
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

  const Avatar = {
    Image: ({ size, source, style }: any) => (
      <RN.View testID="avatar-image" style={style}>
        <RN.Text>{source?.uri}</RN.Text>
      </RN.View>
    ),
    Text: ({ size, label, style, labelStyle }: any) => (
      <RN.View testID="avatar-text" style={style}>
        <RN.Text style={labelStyle}>{label}</RN.Text>
      </RN.View>
    ),
  };

  const Menu = ({ visible, onDismiss, anchor, children }: any) => (
    <RN.View testID="menu">
      {anchor}
      {visible && <RN.View testID="menu-content">{children}</RN.View>}
    </RN.View>
  );
  Menu.Item = ({ onPress, title, leadingIcon }: any) => (
    <RN.TouchableOpacity
      testID={`menu-item-${title.toLowerCase().replace(/\s/g, '-')}`}
      onPress={onPress}
    >
      <RN.Text>{title}</RN.Text>
    </RN.TouchableOpacity>
  );

  return {
    Appbar,
    Avatar,
    Menu,
    Text: ({ children, variant, style }: any) => (
      <RN.Text style={style} testID={`text-${variant}`}>
        {children}
      </RN.Text>
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

const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;
const mockUseFriendsStore = useFriendsStore as jest.MockedFunction<typeof useFriendsStore>;
const mockFriendsApi = friendsApi as jest.Mocked<typeof friendsApi>;

describe('UserProfileScreen', () => {
  const mockFetchUserProfile = jest.fn();
  const mockClearViewedUser = jest.fn();
  const mockSendRequest = jest.fn();
  const mockAcceptRequest = jest.fn();
  const mockDeclineRequest = jest.fn();
  const mockRemoveFriend = jest.fn();

  const mockProfile: PublicUserProfile = {
    id: 'user-456',
    display_name: 'Sarah Johnson',
    avatar_url: 'https://example.com/sarah-avatar.jpg',
    created_at: '2024-12-10T08:00:00Z',
    is_private: false,
  };

  const mockStats: UserStats = {
    friends_count: 237,
    groups_count: 12,
    badges_count: 18,
  };

  const mockWeeklyActivity: WeeklyActivity = {
    total_steps: 78432,
    total_distance_meters: 62740,
    average_steps_per_day: 11204,
    current_streak: 24,
  };

  const mockAchievements: Achievement[] = [
    {
      id: 'ach-1',
      name: '500K Club',
      description: 'Walk 500,000 steps in a month',
      icon: 'trophy-award',
      earned_at: '2025-01-05T12:00:00Z',
    },
  ];

  const mockMutualGroups: MutualGroup[] = [
    { id: 'group-1', name: 'Morning Walkers' },
    { id: 'group-2', name: 'Weekend Warriors' },
  ];

  const mockViewedUser: ViewedUserState = {
    profile: mockProfile,
    stats: mockStats,
    weeklyActivity: mockWeeklyActivity,
    achievements: mockAchievements,
    mutualGroups: mockMutualGroups,
  };

  const defaultUserState = {
    viewedUser: mockViewedUser,
    isLoadingViewedUser: false,
    error: null,
    fetchUserProfile: mockFetchUserProfile,
    clearViewedUser: mockClearViewedUser,
  };

  const defaultFriendsState = {
    sendRequest: mockSendRequest,
    acceptRequest: mockAcceptRequest,
    declineRequest: mockDeclineRequest,
    removeFriend: mockRemoveFriend,
  };


  beforeEach(() => {
    jest.clearAllMocks();

    mockFriendsApi.checkFriendshipStatus.mockResolvedValue('none');

    mockUseUserStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultUserState);
      }
      return defaultUserState;
    });

    mockUseFriendsStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultFriendsState);
      }
      return defaultFriendsState;
    });
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = renderUserProfileScreen();
      expect(getByTestId('appbar-header')).toBeTruthy();
    });

    it('should display the user name in title', () => {
      const { getByTestId } = renderUserProfileScreen();
      expect(getByTestId('appbar-title')).toHaveTextContent('Sarah Johnson');
    });

    it('should render back action', () => {
      const { getByTestId } = renderUserProfileScreen();
      expect(getByTestId('appbar-back')).toBeTruthy();
    });

    it('should render more options menu', () => {
      const { getByTestId } = renderUserProfileScreen();
      expect(getByTestId('appbar-action-dots-vertical')).toBeTruthy();
    });
  });

  describe('profile display', () => {
    it('should display avatar image', () => {
      const { getByTestId } = renderUserProfileScreen();
      expect(getByTestId('avatar-image')).toBeTruthy();
    });

    it('should display display name', () => {
      const { getAllByText } = renderUserProfileScreen();
      // Name appears in both title and profile header
      expect(getAllByText('Sarah Johnson').length).toBeGreaterThanOrEqual(1);
    });

    it('should display join date', () => {
      const { getByText } = renderUserProfileScreen();
      expect(getByText('Joined Dec 2024')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when loading with no data', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          viewedUser: null,
          isLoadingViewedUser: true,
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = renderUserProfileScreen();
      expect(getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should display generic title during loading', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          viewedUser: null,
          isLoadingViewedUser: true,
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = renderUserProfileScreen();
      expect(getByTestId('appbar-title')).toHaveTextContent('Profile');
    });
  });

  describe('error state', () => {
    it('should show error message when there is an error and no data', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          viewedUser: null,
          error: 'Failed to load profile',
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = renderUserProfileScreen();
      expect(getByTestId('error-message')).toBeTruthy();
      expect(getByTestId('error-text')).toHaveTextContent('Failed to load profile');
    });

    it('should show error when user not found', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          viewedUser: { ...mockViewedUser, profile: null },
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = renderUserProfileScreen();
      expect(getByTestId('error-text')).toHaveTextContent('User not found');
    });
  });

  describe('privacy restricted view', () => {
    it('should show privacy restricted view when profile is private and not friends', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          viewedUser: {
            ...mockViewedUser,
            profile: { ...mockProfile, is_private: true },
          },
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = renderUserProfileScreen();
      expect(getByTestId('privacy-restricted')).toBeTruthy();
    });

    it('should not show privacy restricted view when friends', async () => {
      mockFriendsApi.checkFriendshipStatus.mockResolvedValue('accepted');

      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          viewedUser: {
            ...mockViewedUser,
            profile: { ...mockProfile, is_private: true },
          },
        };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = renderUserProfileScreen();

      await waitFor(() => {
        expect(queryByTestId('privacy-restricted')).toBeNull();
      });
    });
  });

  describe('friend status: none', () => {
    it('should display Add Friend button', () => {
      const { getByTestId } = renderUserProfileScreen();
      expect(getByTestId('friend-action-status')).toHaveTextContent('none');
    });

    it('should call sendRequest when Add Friend is pressed', async () => {
      mockSendRequest.mockResolvedValue(undefined);

      const { getByTestId } = renderUserProfileScreen();

      fireEvent.press(getByTestId('friend-action-add'));

      await waitFor(() => {
        expect(mockSendRequest).toHaveBeenCalledWith('user-456');
      });
    });
  });

  describe('friend status: pending_sent', () => {
    beforeEach(() => {
      mockFriendsApi.checkFriendshipStatus.mockResolvedValue('pending_sent');
    });

    it('should display pending sent status', async () => {
      const { getByTestId } = renderUserProfileScreen();

      await waitFor(() => {
        expect(getByTestId('friend-action-status')).toHaveTextContent('pending_sent');
      });
    });
  });

  describe('friend status: pending_received', () => {
    beforeEach(() => {
      mockFriendsApi.checkFriendshipStatus.mockResolvedValue('pending_received');
    });

    it('should display Accept and Decline buttons', async () => {
      const { getByTestId } = renderUserProfileScreen();

      await waitFor(() => {
        expect(getByTestId('friend-action-accept')).toBeTruthy();
        expect(getByTestId('friend-action-decline')).toBeTruthy();
      });
    });

    it('should call acceptRequest when Accept is pressed', async () => {
      mockAcceptRequest.mockResolvedValue(undefined);

      const { getByTestId } = renderUserProfileScreen();

      await waitFor(() => {
        fireEvent.press(getByTestId('friend-action-accept'));
      });

      await waitFor(() => {
        expect(mockAcceptRequest).toHaveBeenCalledWith('user-456');
      });
    });

    it('should call declineRequest when Decline is pressed', async () => {
      mockDeclineRequest.mockResolvedValue(undefined);

      const { getByTestId } = renderUserProfileScreen();

      await waitFor(() => {
        fireEvent.press(getByTestId('friend-action-decline'));
      });

      await waitFor(() => {
        expect(mockDeclineRequest).toHaveBeenCalledWith('user-456');
      });
    });
  });

  describe('friend status: accepted', () => {
    beforeEach(() => {
      mockFriendsApi.checkFriendshipStatus.mockResolvedValue('accepted');
    });

    it('should display Remove Friend button', async () => {
      const { getByTestId } = renderUserProfileScreen();

      await waitFor(() => {
        expect(getByTestId('friend-action-remove')).toBeTruthy();
      });
    });

    it('should show confirmation when Remove Friend is pressed', async () => {
      const { getByTestId } = renderUserProfileScreen();

      await waitFor(() => {
        fireEvent.press(getByTestId('friend-action-remove'));
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Remove Friend',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Remove' }),
        ])
      );
    });

    it('should display mutual groups', async () => {
      const { getByTestId } = renderUserProfileScreen();

      await waitFor(() => {
        expect(getByTestId('mutual-group-group-1')).toBeTruthy();
        expect(getByTestId('mutual-group-group-2')).toBeTruthy();
      });
    });
  });

  describe('stats cards', () => {
    it('should display friends stat', () => {
      const { getByTestId } = renderUserProfileScreen();
      expect(getByTestId('stat-friends-value')).toHaveTextContent('237');
    });

    it('should display groups stat', () => {
      const { getByTestId } = renderUserProfileScreen();
      expect(getByTestId('stat-groups-value')).toHaveTextContent('12');
    });

    it('should display badges stat', () => {
      const { getByTestId } = renderUserProfileScreen();
      expect(getByTestId('stat-badges-value')).toHaveTextContent('18');
    });
  });

  describe('weekly activity', () => {
    it('should display weekly activity card', () => {
      const { getByTestId } = renderUserProfileScreen();
      expect(getByTestId('weekly-activity')).toBeTruthy();
    });
  });

  describe('achievements', () => {
    it('should display achievement chips', () => {
      const { getByTestId } = renderUserProfileScreen();
      expect(getByTestId('achievement-ach-1')).toBeTruthy();
    });
  });

  describe('menu options', () => {
    it('should open menu when dots-vertical is pressed', () => {
      const { getByTestId, queryByTestId } = renderUserProfileScreen();

      expect(queryByTestId('menu-content')).toBeNull();

      fireEvent.press(getByTestId('appbar-action-dots-vertical'));

      expect(getByTestId('menu-content')).toBeTruthy();
    });

    it('should have Report User option', () => {
      const { getByTestId } = renderUserProfileScreen();

      fireEvent.press(getByTestId('appbar-action-dots-vertical'));

      expect(getByTestId('menu-item-report-user')).toBeTruthy();
    });

    it('should have Block User option', () => {
      const { getByTestId } = renderUserProfileScreen();

      fireEvent.press(getByTestId('appbar-action-dots-vertical'));

      expect(getByTestId('menu-item-block-user')).toBeTruthy();
    });

    it('should show confirmation when Report User is pressed', () => {
      const { getByTestId } = renderUserProfileScreen();

      fireEvent.press(getByTestId('appbar-action-dots-vertical'));
      fireEvent.press(getByTestId('menu-item-report-user'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Report User',
        expect.any(String),
        expect.any(Array)
      );
    });

    it('should show confirmation when Block User is pressed', () => {
      const { getByTestId } = renderUserProfileScreen();

      fireEvent.press(getByTestId('appbar-action-dots-vertical'));
      fireEvent.press(getByTestId('menu-item-block-user'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Block User',
        expect.any(String),
        expect.any(Array)
      );
    });
  });

  describe('navigation', () => {
    it('should navigate back when back action is pressed', () => {
      const { getByTestId } = renderUserProfileScreen();

      fireEvent.press(getByTestId('appbar-back'));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('data fetching', () => {
    it('should fetch user profile on mount', () => {
      renderUserProfileScreen();

      expect(mockFetchUserProfile).toHaveBeenCalledWith('user-456');
    });

    it('should check friendship status on mount', () => {
      renderUserProfileScreen();

      expect(mockFriendsApi.checkFriendshipStatus).toHaveBeenCalledWith('user-456');
    });
  });
});
