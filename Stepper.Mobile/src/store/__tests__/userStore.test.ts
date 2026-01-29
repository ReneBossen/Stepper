import { renderHook, act, waitFor } from '@testing-library/react-native';
import {
  useUserStore,
  UserProfile,
  UserPreferences,
  ViewedUserState,
  PublicUserProfile,
  UserStats,
  WeeklyActivity,
  Achievement,
  MutualGroup,
} from '../userStore';
import { usersApi, UserProfileData } from '@services/api/usersApi';
import { userPreferencesApi } from '@services/api/userPreferencesApi';

// Mock the APIs
jest.mock('@services/api/usersApi');
jest.mock('@services/api/userPreferencesApi');

const mockUsersApi = usersApi as jest.Mocked<typeof usersApi>;
const mockUserPreferencesApi = userPreferencesApi as jest.Mocked<typeof userPreferencesApi>;

describe('userStore', () => {
  // Profile data (from users table)
  const mockProfileData: UserProfileData = {
    id: '123',
    display_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    onboarding_completed: true,
    created_at: '2024-01-01T00:00:00Z',
  };

  // Preferences data (from user_preferences table)
  const mockPreferences: UserPreferences = {
    id: '123',
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
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  // Combined profile (what the store exposes)
  const mockUserProfile: UserProfile = {
    ...mockProfileData,
    preferences: mockPreferences,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    useUserStore.setState({
      currentUser: null,
      viewedUser: null,
      themePreference: 'system',
      isLoading: false,
      isLoadingViewedUser: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useUserStore());

      expect(result.current.currentUser).toBeNull();
      expect(result.current.themePreference).toBe('system');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('fetchCurrentUser', () => {
    it('should fetch current user and preferences successfully', async () => {
      mockUsersApi.getCurrentUser.mockResolvedValue(mockProfileData);
      mockUserPreferencesApi.getPreferences.mockResolvedValue(mockPreferences);

      const { result } = renderHook(() => useUserStore());

      await act(async () => {
        await result.current.fetchCurrentUser();
      });

      expect(mockUsersApi.getCurrentUser).toHaveBeenCalled();
      expect(mockUserPreferencesApi.getPreferences).toHaveBeenCalled();
      expect(result.current.currentUser).toEqual(mockUserProfile);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during fetch', async () => {
      mockUsersApi.getCurrentUser.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockProfileData), 100))
      );
      mockUserPreferencesApi.getPreferences.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockPreferences), 100))
      );

      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.fetchCurrentUser();
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle fetch error', async () => {
      const error = new Error('User not found');
      mockUsersApi.getCurrentUser.mockRejectedValue(error);
      mockUserPreferencesApi.getPreferences.mockResolvedValue(mockPreferences);

      const { result } = renderHook(() => useUserStore());

      await act(async () => {
        await result.current.fetchCurrentUser();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('User not found');
      });
      expect(result.current.currentUser).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should clear previous errors on new fetch', async () => {
      mockUsersApi.getCurrentUser.mockResolvedValue(mockProfileData);
      mockUserPreferencesApi.getPreferences.mockResolvedValue(mockPreferences);

      const { result } = renderHook(() => useUserStore());

      // Set initial error
      useUserStore.setState({ error: 'Previous error' });

      await act(async () => {
        await result.current.fetchCurrentUser();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updates = { display_name: 'Updated Name' };
      const updatedProfileData = { ...mockProfileData, ...updates };

      mockUsersApi.updateProfile.mockResolvedValue(updatedProfileData);

      const { result } = renderHook(() => useUserStore());
      // Set initial user with preferences
      useUserStore.setState({ currentUser: mockUserProfile });

      await act(async () => {
        await result.current.updateProfile(updates);
      });

      expect(mockUsersApi.updateProfile).toHaveBeenCalledWith(updates);
      expect(result.current.currentUser?.display_name).toBe('Updated Name');
      // Preferences should be preserved
      expect(result.current.currentUser?.preferences).toEqual(mockPreferences);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle partial updates', async () => {
      const updates = { display_name: 'New Name Only' };
      const updatedProfileData = { ...mockProfileData, display_name: 'New Name Only' };

      mockUsersApi.updateProfile.mockResolvedValue(updatedProfileData);

      const { result } = renderHook(() => useUserStore());
      useUserStore.setState({ currentUser: mockUserProfile });

      await act(async () => {
        await result.current.updateProfile(updates);
      });

      expect(mockUsersApi.updateProfile).toHaveBeenCalledWith(updates);
      expect(result.current.currentUser?.display_name).toBe('New Name Only');
    });

    it('should handle update error', async () => {
      const error = new Error('Update failed');
      mockUsersApi.updateProfile.mockRejectedValue(error);

      const { result } = renderHook(() => useUserStore());

      try {
        await act(async () => {
          await result.current.updateProfile({ display_name: 'Test' });
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Update failed');
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during update', async () => {
      mockUsersApi.updateProfile.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockProfileData), 100))
      );

      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.updateProfile({ display_name: 'Test' });
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
      const prefUpdates = {
        units: 'imperial' as const,
        daily_step_goal: 12000,
      };
      const updatedPrefs: UserPreferences = { ...mockPreferences, ...prefUpdates };

      mockUserPreferencesApi.updatePreferences.mockResolvedValue(updatedPrefs);

      const { result } = renderHook(() => useUserStore());

      // Set initial user
      useUserStore.setState({ currentUser: mockUserProfile });

      await act(async () => {
        await result.current.updatePreferences(prefUpdates);
      });

      expect(mockUserPreferencesApi.updatePreferences).toHaveBeenCalledWith(prefUpdates);
      expect(result.current.currentUser?.preferences).toEqual(updatedPrefs);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should update privacy settings', async () => {
      const prefUpdates = {
        privacy_find_me: 'private' as const,
        privacy_show_steps: 'private' as const,
      };
      const updatedPrefs: UserPreferences = { ...mockPreferences, ...prefUpdates };

      mockUserPreferencesApi.updatePreferences.mockResolvedValue(updatedPrefs);

      const { result } = renderHook(() => useUserStore());

      useUserStore.setState({ currentUser: mockUserProfile });

      await act(async () => {
        await result.current.updatePreferences(prefUpdates);
      });

      expect(result.current.currentUser?.preferences.privacy_find_me).toBe('private');
      expect(result.current.currentUser?.preferences.privacy_show_steps).toBe('private');
      expect(result.current.currentUser?.preferences.units).toBe('metric'); // Original value preserved
    });

    it('should throw error when no user is loaded', async () => {
      const { result } = renderHook(() => useUserStore());

      try {
        await act(async () => {
          await result.current.updatePreferences({ daily_step_goal: 15000 });
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('No user loaded');
      });
    });

    it('should handle update error', async () => {
      const error = new Error('Preferences update failed');
      mockUserPreferencesApi.updatePreferences.mockRejectedValue(error);

      const { result } = renderHook(() => useUserStore());

      useUserStore.setState({ currentUser: mockUserProfile });

      try {
        await act(async () => {
          await result.current.updatePreferences({ daily_step_goal: 15000 });
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Preferences update failed');
      });
    });

    it('should update notifications_enabled preference', async () => {
      const prefUpdates = {
        notifications_enabled: false,
      };
      const updatedPrefs: UserPreferences = { ...mockPreferences, notifications_enabled: false };

      mockUserPreferencesApi.updatePreferences.mockResolvedValue(updatedPrefs);

      const { result } = renderHook(() => useUserStore());

      useUserStore.setState({ currentUser: mockUserProfile });

      await act(async () => {
        await result.current.updatePreferences(prefUpdates);
      });

      expect(result.current.currentUser?.preferences.notifications_enabled).toBe(false);
    });
  });

  describe('setThemePreference', () => {
    it('should update theme preference', () => {
      const { result } = renderHook(() => useUserStore());

      expect(result.current.themePreference).toBe('system');

      act(() => {
        result.current.setThemePreference('dark');
      });

      expect(result.current.themePreference).toBe('dark');
    });

    it('should persist theme preference across renders', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setThemePreference('light');
      });

      // The state persists because Zustand stores state outside React
      expect(result.current.themePreference).toBe('light');

      // Clear and verify it was reset
      act(() => {
        result.current.clearUser();
      });

      expect(result.current.themePreference).toBe('system');
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const avatarUri = 'file://path/to/avatar.jpg';
      const avatarUrl = 'https://storage.example.com/avatar.jpg';

      mockUsersApi.uploadAvatar.mockResolvedValue(avatarUrl);

      const { result } = renderHook(() => useUserStore());

      useUserStore.setState({ currentUser: mockUserProfile });

      await act(async () => {
        await result.current.uploadAvatar(avatarUri);
      });

      expect(mockUsersApi.uploadAvatar).toHaveBeenCalledWith(avatarUri);
      expect(result.current.currentUser?.avatar_url).toBe(avatarUrl);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle upload when no current user', async () => {
      const avatarUri = 'file://path/to/avatar.jpg';
      const avatarUrl = 'https://storage.example.com/avatar.jpg';

      mockUsersApi.uploadAvatar.mockResolvedValue(avatarUrl);

      const { result } = renderHook(() => useUserStore());

      await act(async () => {
        await result.current.uploadAvatar(avatarUri);
      });

      expect(result.current.currentUser).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle upload error', async () => {
      const error = new Error('Upload failed');
      mockUsersApi.uploadAvatar.mockRejectedValue(error);

      const { result } = renderHook(() => useUserStore());

      useUserStore.setState({ currentUser: mockUserProfile });

      try {
        await act(async () => {
          await result.current.uploadAvatar('file://avatar.jpg');
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Upload failed');
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during upload', async () => {
      mockUsersApi.uploadAvatar.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve('url'), 100))
      );

      const { result } = renderHook(() => useUserStore());

      useUserStore.setState({ currentUser: mockUserProfile });

      act(() => {
        result.current.uploadAvatar('file://avatar.jpg');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should preserve other user data during avatar upload', async () => {
      const avatarUrl = 'https://storage.example.com/new-avatar.jpg';

      mockUsersApi.uploadAvatar.mockResolvedValue(avatarUrl);

      const { result } = renderHook(() => useUserStore());

      useUserStore.setState({ currentUser: mockUserProfile });

      await act(async () => {
        await result.current.uploadAvatar('file://avatar.jpg');
      });

      expect(result.current.currentUser?.display_name).toBe('Test User');
      expect(result.current.currentUser?.avatar_url).toBe(avatarUrl);
    });
  });

  describe('clearUser', () => {
    it('should reset currentUser to null', () => {
      const { result } = renderHook(() => useUserStore());

      // Set initial user
      act(() => {
        useUserStore.setState({ currentUser: mockUserProfile });
      });
      expect(result.current.currentUser).toEqual(mockUserProfile);

      act(() => {
        result.current.clearUser();
      });

      expect(result.current.currentUser).toBeNull();
    });

    it('should reset isLoading to false', () => {
      const { result } = renderHook(() => useUserStore());

      // Set isLoading to true
      act(() => {
        useUserStore.setState({ isLoading: true });
      });
      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.clearUser();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should reset error to null', () => {
      const { result } = renderHook(() => useUserStore());

      // Set an error
      act(() => {
        useUserStore.setState({ error: 'Some error message' });
      });
      expect(result.current.error).toBe('Some error message');

      act(() => {
        result.current.clearUser();
      });

      expect(result.current.error).toBeNull();
    });

    it('should reset all state properties simultaneously', () => {
      const { result } = renderHook(() => useUserStore());

      // Set all state properties
      act(() => {
        useUserStore.setState({
          currentUser: mockUserProfile,
          themePreference: 'dark',
          isLoading: true,
          error: 'Some error',
        });
      });

      act(() => {
        result.current.clearUser();
      });

      expect(result.current.currentUser).toBeNull();
      expect(result.current.themePreference).toBe('system');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should also clear viewedUser state', () => {
      const { result } = renderHook(() => useUserStore());

      const mockViewedUser: ViewedUserState = {
        profile: {
          id: '456',
          display_name: 'Other User',
          created_at: '2024-01-01T00:00:00Z',
          is_private: false,
        },
        stats: { friends_count: 10, groups_count: 5, badges_count: 3 },
        weeklyActivity: null,
        achievements: [],
        mutualGroups: [],
      };

      act(() => {
        useUserStore.setState({
          currentUser: mockUserProfile,
          viewedUser: mockViewedUser,
          isLoadingViewedUser: true,
        });
      });

      expect(result.current.viewedUser).not.toBeNull();

      act(() => {
        result.current.clearUser();
      });

      expect(result.current.viewedUser).toBeNull();
      expect(result.current.isLoadingViewedUser).toBe(false);
    });
  });

  describe('fetchUserProfile', () => {
    const mockPublicProfile: PublicUserProfile = {
      id: '456',
      display_name: 'Sarah Johnson',
      avatar_url: 'https://example.com/sarah.jpg',
      created_at: '2024-12-10T08:00:00Z',
      is_private: false,
    };

    const mockUserStats: UserStats = {
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
        description: 'Walk 500,000 steps',
        icon: 'trophy',
        earned_at: '2025-01-05T12:00:00Z',
      },
    ];

    const mockMutualGroups: MutualGroup[] = [
      { id: 'group-1', name: 'Morning Walkers' },
      { id: 'group-2', name: 'Weekend Warriors' },
    ];

    it('should fetch user profile successfully', async () => {
      mockUsersApi.getUserProfile.mockResolvedValue(mockPublicProfile);
      mockUsersApi.getUserStats.mockResolvedValue(mockUserStats);
      mockUsersApi.getWeeklyActivity.mockResolvedValue(mockWeeklyActivity);
      mockUsersApi.getAchievements.mockResolvedValue(mockAchievements);
      mockUsersApi.getMutualGroups.mockResolvedValue(mockMutualGroups);

      const { result } = renderHook(() => useUserStore());

      await act(async () => {
        await result.current.fetchUserProfile('456');
      });

      expect(mockUsersApi.getUserProfile).toHaveBeenCalledWith('456');
      expect(mockUsersApi.getUserStats).toHaveBeenCalledWith('456');
      expect(mockUsersApi.getWeeklyActivity).toHaveBeenCalledWith('456');
      expect(mockUsersApi.getAchievements).toHaveBeenCalledWith('456');
      expect(mockUsersApi.getMutualGroups).toHaveBeenCalledWith('456');

      expect(result.current.viewedUser).toEqual({
        profile: mockPublicProfile,
        stats: mockUserStats,
        weeklyActivity: mockWeeklyActivity,
        achievements: mockAchievements,
        mutualGroups: mockMutualGroups,
      });
      expect(result.current.isLoadingViewedUser).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      mockUsersApi.getUserProfile.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockPublicProfile), 100))
      );
      mockUsersApi.getUserStats.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockUserStats), 100))
      );
      mockUsersApi.getWeeklyActivity.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockWeeklyActivity), 100))
      );
      mockUsersApi.getAchievements.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockAchievements), 100))
      );
      mockUsersApi.getMutualGroups.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockMutualGroups), 100))
      );

      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.fetchUserProfile('456');
      });

      expect(result.current.isLoadingViewedUser).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoadingViewedUser).toBe(false);
      });
    });

    it('should handle fetch error', async () => {
      const error = new Error('User not found');
      mockUsersApi.getUserProfile.mockRejectedValue(error);

      const { result } = renderHook(() => useUserStore());

      await act(async () => {
        await result.current.fetchUserProfile('456');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('User not found');
      });
      expect(result.current.isLoadingViewedUser).toBe(false);
    });
  });

  describe('fetchCurrentUserStats', () => {
    const mockUserStats: UserStats = {
      friends_count: 124,
      groups_count: 45,
      badges_count: 12,
    };

    it('should fetch current user stats successfully', async () => {
      mockUsersApi.getUserStats.mockResolvedValue(mockUserStats);

      const { result } = renderHook(() => useUserStore());
      useUserStore.setState({ currentUser: mockUserProfile });

      let stats: UserStats | null = null;
      await act(async () => {
        stats = await result.current.fetchCurrentUserStats();
      });

      expect(mockUsersApi.getUserStats).toHaveBeenCalledWith('123');
      expect(stats).toEqual(mockUserStats);
    });

    it('should throw error when no user is loaded', async () => {
      const { result } = renderHook(() => useUserStore());

      await expect(
        act(async () => {
          await result.current.fetchCurrentUserStats();
        })
      ).rejects.toThrow('No user loaded');
    });
  });

  describe('fetchCurrentUserWeeklyActivity', () => {
    const mockWeeklyActivity: WeeklyActivity = {
      total_steps: 64638,
      total_distance_meters: 51710,
      average_steps_per_day: 9234,
      current_streak: 12,
    };

    it('should fetch current user weekly activity successfully', async () => {
      mockUsersApi.getWeeklyActivity.mockResolvedValue(mockWeeklyActivity);

      const { result } = renderHook(() => useUserStore());
      useUserStore.setState({ currentUser: mockUserProfile });

      let activity: WeeklyActivity | null = null;
      await act(async () => {
        activity = await result.current.fetchCurrentUserWeeklyActivity();
      });

      expect(mockUsersApi.getWeeklyActivity).toHaveBeenCalledWith('123');
      expect(activity).toEqual(mockWeeklyActivity);
    });

    it('should throw error when no user is loaded', async () => {
      const { result } = renderHook(() => useUserStore());

      await expect(
        act(async () => {
          await result.current.fetchCurrentUserWeeklyActivity();
        })
      ).rejects.toThrow('No user loaded');
    });
  });

  describe('fetchCurrentUserAchievements', () => {
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

    it('should fetch current user achievements successfully', async () => {
      mockUsersApi.getAchievements.mockResolvedValue(mockAchievements);

      const { result } = renderHook(() => useUserStore());
      useUserStore.setState({ currentUser: mockUserProfile });

      let achievements: Achievement[] = [];
      await act(async () => {
        achievements = await result.current.fetchCurrentUserAchievements();
      });

      expect(mockUsersApi.getAchievements).toHaveBeenCalledWith('123');
      expect(achievements).toEqual(mockAchievements);
    });

    it('should throw error when no user is loaded', async () => {
      const { result } = renderHook(() => useUserStore());

      await expect(
        act(async () => {
          await result.current.fetchCurrentUserAchievements();
        })
      ).rejects.toThrow('No user loaded');
    });
  });

  describe('clearViewedUser', () => {
    it('should clear viewed user state', () => {
      const { result } = renderHook(() => useUserStore());

      const mockViewedUser: ViewedUserState = {
        profile: {
          id: '456',
          display_name: 'Other User',
          created_at: '2024-01-01T00:00:00Z',
          is_private: false,
        },
        stats: { friends_count: 10, groups_count: 5, badges_count: 3 },
        weeklyActivity: null,
        achievements: [],
        mutualGroups: [],
      };

      act(() => {
        useUserStore.setState({
          viewedUser: mockViewedUser,
          isLoadingViewedUser: true,
        });
      });

      expect(result.current.viewedUser).not.toBeNull();
      expect(result.current.isLoadingViewedUser).toBe(true);

      act(() => {
        result.current.clearViewedUser();
      });

      expect(result.current.viewedUser).toBeNull();
      expect(result.current.isLoadingViewedUser).toBe(false);
    });

    it('should not affect current user state', () => {
      const { result } = renderHook(() => useUserStore());

      const mockViewedUser: ViewedUserState = {
        profile: {
          id: '456',
          display_name: 'Other User',
          created_at: '2024-01-01T00:00:00Z',
          is_private: false,
        },
        stats: null,
        weeklyActivity: null,
        achievements: [],
        mutualGroups: [],
      };

      act(() => {
        useUserStore.setState({
          currentUser: mockUserProfile,
          viewedUser: mockViewedUser,
        });
      });

      act(() => {
        result.current.clearViewedUser();
      });

      expect(result.current.viewedUser).toBeNull();
      expect(result.current.currentUser).toEqual(mockUserProfile);
    });
  });
});
