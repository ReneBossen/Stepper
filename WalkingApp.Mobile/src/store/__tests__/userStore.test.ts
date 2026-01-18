import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useUserStore, UserProfile, UserPreferences } from '../userStore';
import { usersApi } from '@services/api/usersApi';

// Mock the users API
jest.mock('@services/api/usersApi');

const mockUsersApi = usersApi as jest.Mocked<typeof usersApi>;

describe('userStore', () => {
  const mockUserProfile: UserProfile = {
    id: '123',
    email: 'test@example.com',
    display_name: 'Test User',
    username: 'testuser',
    bio: 'Test bio',
    location: 'Test City',
    avatar_url: 'https://example.com/avatar.jpg',
    onboarding_completed: true,
    preferences: {
      units: 'metric',
      daily_step_goal: 10000,
      theme: 'light',
      notifications: {
        push_enabled: true,
        friend_requests: true,
        friend_accepted: true,
        group_invites: true,
        goal_achieved: true,
      },
      privacy: {
        profile_visibility: 'public',
        activity_visibility: 'friends',
        find_me: 'everyone',
      },
    },
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    useUserStore.setState({
      currentUser: null,
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useUserStore());

      expect(result.current.currentUser).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('fetchCurrentUser', () => {
    it('should fetch current user successfully', async () => {
      mockUsersApi.getCurrentUser.mockResolvedValue(mockUserProfile);

      const { result } = renderHook(() => useUserStore());

      await act(async () => {
        await result.current.fetchCurrentUser();
      });

      expect(mockUsersApi.getCurrentUser).toHaveBeenCalled();
      expect(result.current.currentUser).toEqual(mockUserProfile);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during fetch', async () => {
      mockUsersApi.getCurrentUser.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockUserProfile), 100))
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
      mockUsersApi.getCurrentUser.mockResolvedValue(mockUserProfile);

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
      const updates = { display_name: 'Updated Name', bio: 'Updated bio' };
      const updatedProfile = { ...mockUserProfile, ...updates };

      mockUsersApi.updateProfile.mockResolvedValue(updatedProfile);

      const { result } = renderHook(() => useUserStore());

      await act(async () => {
        await result.current.updateProfile(updates);
      });

      expect(mockUsersApi.updateProfile).toHaveBeenCalledWith(updates);
      expect(result.current.currentUser).toEqual(updatedProfile);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle partial updates', async () => {
      const updates = { bio: 'New bio only' };
      const updatedProfile = { ...mockUserProfile, bio: 'New bio only' };

      mockUsersApi.updateProfile.mockResolvedValue(updatedProfile);

      const { result } = renderHook(() => useUserStore());

      await act(async () => {
        await result.current.updateProfile(updates);
      });

      expect(mockUsersApi.updateProfile).toHaveBeenCalledWith(updates);
      expect(result.current.currentUser?.bio).toBe('New bio only');
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
        new Promise((resolve) => setTimeout(() => resolve(mockUserProfile), 100))
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
      const prefUpdates: Partial<UserPreferences> = {
        units: 'imperial',
        daily_step_goal: 12000,
      };
      const updatedPrefs = { ...mockUserProfile.preferences, ...prefUpdates };

      mockUsersApi.updatePreferences.mockResolvedValue(updatedPrefs);

      const { result } = renderHook(() => useUserStore());

      // Set initial user
      useUserStore.setState({ currentUser: mockUserProfile });

      await act(async () => {
        await result.current.updatePreferences(prefUpdates);
      });

      expect(mockUsersApi.updatePreferences).toHaveBeenCalledWith(prefUpdates);
      expect(result.current.currentUser?.preferences).toEqual(updatedPrefs);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should merge preferences with current user', async () => {
      const prefUpdates: Partial<UserPreferences> = {
        theme: 'dark',
      };
      const updatedPrefs = { ...mockUserProfile.preferences, theme: 'dark' as const };

      mockUsersApi.updatePreferences.mockResolvedValue(updatedPrefs);

      const { result } = renderHook(() => useUserStore());

      useUserStore.setState({ currentUser: mockUserProfile });

      await act(async () => {
        await result.current.updatePreferences(prefUpdates);
      });

      expect(result.current.currentUser?.preferences.theme).toBe('dark');
      expect(result.current.currentUser?.preferences.units).toBe('metric'); // Original value preserved
    });

    it('should throw error when no user is loaded', async () => {
      const { result } = renderHook(() => useUserStore());

      try {
        await act(async () => {
          await result.current.updatePreferences({ theme: 'dark' });
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
      mockUsersApi.updatePreferences.mockRejectedValue(error);

      const { result } = renderHook(() => useUserStore());

      useUserStore.setState({ currentUser: mockUserProfile });

      try {
        await act(async () => {
          await result.current.updatePreferences({ theme: 'dark' });
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Preferences update failed');
      });
    });

    it('should update nested notification preferences', async () => {
      const prefUpdates: Partial<UserPreferences> = {
        notifications: {
          push_enabled: false,
          friend_requests: false,
          friend_accepted: true,
          group_invites: true,
          goal_achieved: false,
        },
      };
      const updatedPrefs = { ...mockUserProfile.preferences, ...prefUpdates };

      mockUsersApi.updatePreferences.mockResolvedValue(updatedPrefs);

      const { result } = renderHook(() => useUserStore());

      useUserStore.setState({ currentUser: mockUserProfile });

      await act(async () => {
        await result.current.updatePreferences(prefUpdates);
      });

      expect(result.current.currentUser?.preferences.notifications.push_enabled).toBe(false);
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
      expect(result.current.currentUser?.email).toBe('test@example.com');
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
          isLoading: true,
          error: 'Some error',
        });
      });

      act(() => {
        result.current.clearUser();
      });

      expect(result.current.currentUser).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
