import { userPreferencesApi, UserPreferences, DEFAULT_PREFERENCES } from '../userPreferencesApi';
import { apiClient } from '../client';

// Mock the apiClient
jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('userPreferencesApi', () => {
  // Backend response format (camelCase, simplified)
  const mockBackendPreferences = {
    notificationsEnabled: true,
    dailyStepGoal: 10000,
    distanceUnit: 'metric',
    privateProfile: false,
  };

  // Backend profile response (for getting user ID)
  const mockBackendProfile = {
    id: '123',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    onboardingCompleted: true,
    createdAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should fetch preferences successfully via backend API', async () => {
      mockApiClient.get
        .mockResolvedValueOnce(mockBackendPreferences) // preferences call
        .mockResolvedValueOnce(mockBackendProfile); // profile call for user ID

      const result = await userPreferencesApi.getPreferences();

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/me/preferences');
      expect(mockApiClient.get).toHaveBeenCalledWith('/users/me');
      expect(result.id).toBe('123');
      expect(result.daily_step_goal).toBe(10000);
      expect(result.units).toBe('metric');
      expect(result.notifications_enabled).toBe(true);
    });

    it('should map backend camelCase to mobile snake_case format', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({
          notificationsEnabled: false,
          dailyStepGoal: 15000,
          distanceUnit: 'imperial',
          privateProfile: true,
        })
        .mockResolvedValueOnce({ id: '456' });

      const result = await userPreferencesApi.getPreferences();

      expect(result).toMatchObject({
        id: '456',
        daily_step_goal: 15000,
        units: 'imperial',
        notifications_enabled: false,
        privacy_profile_visibility: 'private',
        privacy_find_me: 'private',
        privacy_show_steps: 'private',
      });
    });

    it('should derive granular notification settings from master toggle', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ ...mockBackendPreferences, notificationsEnabled: true })
        .mockResolvedValueOnce(mockBackendProfile);

      const result = await userPreferencesApi.getPreferences();

      // When notifications are enabled, all granular settings should be true
      expect(result.notify_friend_requests).toBe(true);
      expect(result.notify_friend_accepted).toBe(true);
      expect(result.notify_friend_milestones).toBe(true);
      expect(result.notify_group_invites).toBe(true);
      expect(result.notify_leaderboard_updates).toBe(false); // Always false by default
      expect(result.notify_competition_reminders).toBe(true);
      expect(result.notify_goal_achieved).toBe(true);
      expect(result.notify_streak_reminders).toBe(true);
      expect(result.notify_weekly_summary).toBe(true);
    });

    it('should derive privacy settings from privateProfile flag', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ ...mockBackendPreferences, privateProfile: false })
        .mockResolvedValueOnce(mockBackendProfile);

      const result = await userPreferencesApi.getPreferences();

      expect(result.privacy_profile_visibility).toBe('public');
      expect(result.privacy_find_me).toBe('public');
      expect(result.privacy_show_steps).toBe('partial'); // Default for non-private
    });

    it('should throw error when API call fails', async () => {
      const apiError = new Error('Network error');
      mockApiClient.get.mockRejectedValue(apiError);

      await expect(userPreferencesApi.getPreferences()).rejects.toThrow('Network error');
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences successfully via backend API', async () => {
      const updates = { daily_step_goal: 12000, units: 'imperial' as const };

      mockApiClient.put.mockResolvedValue({
        notificationsEnabled: true,
        dailyStepGoal: 12000,
        distanceUnit: 'imperial',
        privateProfile: false,
      });
      mockApiClient.get.mockResolvedValue(mockBackendProfile);

      const result = await userPreferencesApi.updatePreferences(updates);

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/me/preferences', {
        dailyStepGoal: 12000,
        distanceUnit: 'imperial',
      });
      expect(result.daily_step_goal).toBe(12000);
      expect(result.units).toBe('imperial');
    });

    it('should map notifications_enabled to backend format', async () => {
      mockApiClient.put.mockResolvedValue({
        ...mockBackendPreferences,
        notificationsEnabled: false,
      });
      mockApiClient.get.mockResolvedValue(mockBackendProfile);

      await userPreferencesApi.updatePreferences({ notifications_enabled: false });

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/me/preferences', {
        notificationsEnabled: false,
      });
    });

    it('should map privacy settings to privateProfile flag', async () => {
      mockApiClient.put.mockResolvedValue({
        ...mockBackendPreferences,
        privateProfile: true,
      });
      mockApiClient.get.mockResolvedValue(mockBackendProfile);

      await userPreferencesApi.updatePreferences({ privacy_find_me: 'private' });

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/me/preferences', {
        privateProfile: true,
      });
    });

    it('should preserve granular notification settings in response', async () => {
      mockApiClient.put.mockResolvedValue(mockBackendPreferences);
      mockApiClient.get.mockResolvedValue(mockBackendProfile);

      const result = await userPreferencesApi.updatePreferences({
        notify_friend_requests: false,
        notify_weekly_summary: false,
      });

      // These should be overridden with the values passed in the update
      expect(result.notify_friend_requests).toBe(false);
      expect(result.notify_weekly_summary).toBe(false);
    });

    it('should preserve granular privacy settings in response', async () => {
      mockApiClient.put.mockResolvedValue({
        ...mockBackendPreferences,
        privateProfile: true,
      });
      mockApiClient.get.mockResolvedValue(mockBackendProfile);

      const result = await userPreferencesApi.updatePreferences({
        privacy_profile_visibility: 'partial',
        privacy_find_me: 'private',
        privacy_show_steps: 'partial',
      });

      // These should be overridden with the values passed in the update
      expect(result.privacy_profile_visibility).toBe('partial');
      expect(result.privacy_find_me).toBe('private');
      expect(result.privacy_show_steps).toBe('partial');
    });

    it('should throw error when update fails', async () => {
      const apiError = new Error('Update failed');
      mockApiClient.put.mockRejectedValue(apiError);

      await expect(userPreferencesApi.updatePreferences({ daily_step_goal: 15000 })).rejects.toThrow('Update failed');
    });

    it('should handle empty update object', async () => {
      mockApiClient.put.mockResolvedValue(mockBackendPreferences);
      mockApiClient.get.mockResolvedValue(mockBackendProfile);

      const result = await userPreferencesApi.updatePreferences({});

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/me/preferences', {});
      expect(result.id).toBe('123');
    });

    it('should correctly determine privateProfile from multiple privacy settings', async () => {
      mockApiClient.put.mockResolvedValue({
        ...mockBackendPreferences,
        privateProfile: false,
      });
      mockApiClient.get.mockResolvedValue(mockBackendProfile);

      // All set to public - privateProfile should be false
      await userPreferencesApi.updatePreferences({
        privacy_profile_visibility: 'public',
        privacy_find_me: 'public',
        privacy_show_steps: 'public',
      });

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/me/preferences', {
        privateProfile: false,
      });
    });

    it('should set privateProfile true if any privacy setting is private', async () => {
      mockApiClient.put.mockResolvedValue({
        ...mockBackendPreferences,
        privateProfile: true,
      });
      mockApiClient.get.mockResolvedValue(mockBackendProfile);

      // One setting is private - privateProfile should be true
      await userPreferencesApi.updatePreferences({
        privacy_profile_visibility: 'public',
        privacy_find_me: 'public',
        privacy_show_steps: 'private',
      });

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/me/preferences', {
        privateProfile: true,
      });
    });
  });

  describe('DEFAULT_PREFERENCES', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_PREFERENCES.daily_step_goal).toBe(10000);
      expect(DEFAULT_PREFERENCES.units).toBe('metric');
      expect(DEFAULT_PREFERENCES.notifications_enabled).toBe(true);
      expect(DEFAULT_PREFERENCES.privacy_profile_visibility).toBe('public');
      expect(DEFAULT_PREFERENCES.privacy_find_me).toBe('public');
      expect(DEFAULT_PREFERENCES.privacy_show_steps).toBe('partial');
    });

    it('should have all required notification settings', () => {
      expect(DEFAULT_PREFERENCES.notify_friend_requests).toBe(true);
      expect(DEFAULT_PREFERENCES.notify_friend_accepted).toBe(true);
      expect(DEFAULT_PREFERENCES.notify_friend_milestones).toBe(true);
      expect(DEFAULT_PREFERENCES.notify_group_invites).toBe(true);
      expect(DEFAULT_PREFERENCES.notify_leaderboard_updates).toBe(false);
      expect(DEFAULT_PREFERENCES.notify_competition_reminders).toBe(true);
      expect(DEFAULT_PREFERENCES.notify_goal_achieved).toBe(true);
      expect(DEFAULT_PREFERENCES.notify_streak_reminders).toBe(true);
      expect(DEFAULT_PREFERENCES.notify_weekly_summary).toBe(true);
    });
  });
});
