import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useUserStore, UserProfile, UserPreferences } from '../userStore';
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
    email: 'test@example.com',
    display_name: 'Test User',
    username: 'testuser',
    bio: 'Test bio',
    location: 'Test City',
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
      themePreference: 'system',
      isLoading: false,
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
      const updates = { display_name: 'Updated Name', bio: 'Updated bio' };
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
      expect(result.current.currentUser?.bio).toBe('Updated bio');
      // Preferences should be preserved
      expect(result.current.currentUser?.preferences).toEqual(mockPreferences);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle partial updates', async () => {
      const updates = { bio: 'New bio only' };
      const updatedProfileData = { ...mockProfileData, bio: 'New bio only' };

      mockUsersApi.updateProfile.mockResolvedValue(updatedProfileData);

      const { result } = renderHook(() => useUserStore());
      useUserStore.setState({ currentUser: mockUserProfile });

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
  });
});
