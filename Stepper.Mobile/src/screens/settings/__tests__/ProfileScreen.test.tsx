import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileScreen from '../ProfileScreen';
import { useUserStore, UserProfile, UserStats, WeeklyActivity, Achievement } from '@store/userStore';

// Mock dependencies
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
  StatCard: ({ value, label, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID={testID}>
        <RN.Text testID={`${testID}-value`}>{value}</RN.Text>
        <RN.Text testID={`${testID}-label`}>{label}</RN.Text>
      </RN.View>
    );
  },
}));

jest.mock('@screens/profile/components/WeeklyActivityCard', () => ({
  WeeklyActivityCard: ({ activity, units, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID={testID}>
        <RN.Text testID={`${testID}-steps`}>{activity.total_steps}</RN.Text>
        <RN.Text testID={`${testID}-units`}>{units}</RN.Text>
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

  return {
    Appbar,
    Avatar,
    Text: ({ children, variant, style }: any) => (
      <RN.Text style={style} testID={`text-${variant}`}>
        {children}
      </RN.Text>
    ),
    Button: ({ children, mode, onPress, accessibilityLabel }: any) => (
      <RN.TouchableOpacity
        testID="view-all-badges-button"
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
      >
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

const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;

describe('ProfileScreen', () => {
  const mockFetchCurrentUser = jest.fn();
  const mockFetchCurrentUserStats = jest.fn();
  const mockFetchCurrentUserWeeklyActivity = jest.fn();
  const mockFetchCurrentUserAchievements = jest.fn();

  const mockUser: UserProfile = {
    id: 'user-123',
    display_name: 'John Doe',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: '2025-01-15T10:00:00Z',
    onboarding_completed: true,
    preferences: {
      id: 'user-123',
      units: 'metric',
      daily_step_goal: 10000,
      notifications_enabled: true,
      notify_friend_requests: true,
      notify_friend_accepted: true,
      notify_friend_milestones: true,
      notify_group_invites: true,
      notify_leaderboard_updates: false,
      notify_competition_reminders: true,
      notify_goal_achieved: true,
      notify_streak_reminders: true,
      notify_weekly_summary: true,
      privacy_profile_visibility: 'public',
      privacy_find_me: 'public',
      privacy_show_steps: 'partial',
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-15T10:00:00Z',
    },
  };

  const mockStats: UserStats = {
    friends_count: 124,
    groups_count: 45,
    badges_count: 12,
  };

  const mockWeeklyActivity: WeeklyActivity = {
    total_steps: 64638,
    total_distance_meters: 51710,
    average_steps_per_day: 9234,
    current_streak: 12,
  };

  const mockAchievements: Achievement[] = [
    {
      id: 'ach-1',
      name: '100K Club',
      description: 'Walk 100,000 steps in a week',
      icon: 'trophy',
      earned_at: '2025-01-10T08:00:00Z',
    },
    {
      id: 'ach-2',
      name: '7-Day Warrior',
      description: 'Complete 7 consecutive days',
      icon: 'fire',
      earned_at: '2025-01-05T12:00:00Z',
    },
  ];

  const defaultUserState = {
    currentUser: mockUser,
    isLoading: false,
    error: null,
    fetchCurrentUser: mockFetchCurrentUser,
    fetchCurrentUserStats: mockFetchCurrentUserStats,
    fetchCurrentUserWeeklyActivity: mockFetchCurrentUserWeeklyActivity,
    fetchCurrentUserAchievements: mockFetchCurrentUserAchievements,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockFetchCurrentUserStats.mockResolvedValue(mockStats);
    mockFetchCurrentUserWeeklyActivity.mockResolvedValue(mockWeeklyActivity);
    mockFetchCurrentUserAchievements.mockResolvedValue(mockAchievements);

    mockUseUserStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultUserState);
      }
      return defaultUserState;
    });
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<ProfileScreen />);
      expect(getByTestId('appbar-header')).toBeTruthy();
    });

    it('should display the title', () => {
      const { getByTestId } = render(<ProfileScreen />);
      expect(getByTestId('appbar-title')).toHaveTextContent('Profile');
    });

    it('should render settings action button', () => {
      const { getByTestId } = render(<ProfileScreen />);
      expect(getByTestId('appbar-action-cog')).toBeTruthy();
    });

    it('should render edit profile action button', () => {
      const { getByTestId } = render(<ProfileScreen />);
      expect(getByTestId('appbar-action-pencil')).toBeTruthy();
    });
  });

  describe('profile header', () => {
    it('should display avatar image when avatar_url exists', () => {
      const { getByTestId } = render(<ProfileScreen />);
      expect(getByTestId('avatar-image')).toBeTruthy();
    });

    it('should display avatar text when avatar_url does not exist', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          currentUser: { ...mockUser, avatar_url: undefined },
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<ProfileScreen />);
      expect(getByTestId('avatar-text')).toBeTruthy();
    });

    it('should display display name', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should display join date', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Joined Jan 2025')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when loading with no user', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          currentUser: null,
          isLoading: true,
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<ProfileScreen />);
      expect(getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should not show loading spinner when loading with existing user', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          isLoading: true,
        };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = render(<ProfileScreen />);
      expect(queryByTestId('loading-spinner')).toBeNull();
    });
  });

  describe('error state', () => {
    it('should show loading spinner when no user is loaded and not loading (user fetch will be triggered)', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          currentUser: null,
          error: null,
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<ProfileScreen />);
      // When there's no user and no error, we show loading spinner while fetchCurrentUser is called
      expect(getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should call fetchCurrentUser when no user is loaded on mount', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          currentUser: null,
          isLoading: false,
          error: null,
        };
        return selector ? selector(state) : state;
      });

      render(<ProfileScreen />);
      // fetchCurrentUser should be called when no user is loaded
      expect(mockFetchCurrentUser).toHaveBeenCalled();
    });
  });

  describe('stats cards', () => {
    it('should display friends stat', async () => {
      const { getByTestId } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByTestId('stat-friends')).toBeTruthy();
        expect(getByTestId('stat-friends-value')).toHaveTextContent('124');
        expect(getByTestId('stat-friends-label')).toHaveTextContent('Friends');
      });
    });

    it('should display groups stat', async () => {
      const { getByTestId } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByTestId('stat-groups')).toBeTruthy();
        expect(getByTestId('stat-groups-value')).toHaveTextContent('45');
        expect(getByTestId('stat-groups-label')).toHaveTextContent('Groups');
      });
    });

    it('should display badges stat', async () => {
      const { getByTestId } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByTestId('stat-badges')).toBeTruthy();
        expect(getByTestId('stat-badges-value')).toHaveTextContent('12');
        expect(getByTestId('stat-badges-label')).toHaveTextContent('Badges');
      });
    });
  });

  describe('weekly activity', () => {
    it('should display weekly activity card', async () => {
      const { getByTestId } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByTestId('weekly-activity')).toBeTruthy();
      });
    });

    it('should pass correct units to weekly activity card', async () => {
      const { getByTestId } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByTestId('weekly-activity-units')).toHaveTextContent('metric');
      });
    });
  });

  describe('achievements', () => {
    it('should display achievements section', async () => {
      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText('Achievements')).toBeTruthy();
      });
    });

    it('should display achievement chips', async () => {
      const { getByTestId } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByTestId('achievement-ach-1')).toBeTruthy();
        expect(getByTestId('achievement-ach-2')).toBeTruthy();
      });
    });

    it('should display empty achievements message when no achievements', async () => {
      mockFetchCurrentUserAchievements.mockResolvedValue([]);

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText('Keep walking to earn badges!')).toBeTruthy();
      });
    });
  });

  describe('navigation', () => {
    it('should navigate to Settings when settings action is pressed', () => {
      const { getByTestId } = render(<ProfileScreen />);

      fireEvent.press(getByTestId('appbar-action-cog'));

      expect(mockNavigate).toHaveBeenCalledWith('Settings');
    });

    it('should navigate to EditProfile when edit action is pressed', () => {
      const { getByTestId } = render(<ProfileScreen />);

      fireEvent.press(getByTestId('appbar-action-pencil'));

      expect(mockNavigate).toHaveBeenCalledWith('EditProfile');
    });
  });

  describe('data fetching', () => {
    it('should fetch stats, activity, and achievements on mount', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(mockFetchCurrentUserStats).toHaveBeenCalled();
        expect(mockFetchCurrentUserWeeklyActivity).toHaveBeenCalled();
        expect(mockFetchCurrentUserAchievements).toHaveBeenCalled();
      });
    });
  });
});
