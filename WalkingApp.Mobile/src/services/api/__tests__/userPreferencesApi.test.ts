import { userPreferencesApi, UserPreferences, DEFAULT_PREFERENCES } from '../userPreferencesApi';
import { supabase } from '@services/supabase';

// Mock the supabase client
const mockGetUser = jest.fn();

jest.mock('@services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: () => mockGetUser(),
    },
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('userPreferencesApi', () => {
  const mockPreferences: UserPreferences = {
    id: '123',
    daily_step_goal: 10000,
    units: 'metric',
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

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: '123' } },
      error: null,
    });
  });

  describe('getPreferences', () => {
    it('should fetch preferences successfully', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockPreferences,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await userPreferencesApi.getPreferences();

      expect(mockSupabase.from).toHaveBeenCalledWith('user_preferences');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', '123');
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(mockPreferences);
    });

    it('should return default preferences when no record exists', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await userPreferencesApi.getPreferences();

      expect(result.id).toBe('123');
      expect(result.daily_step_goal).toBe(DEFAULT_PREFERENCES.daily_step_goal);
      expect(result.units).toBe(DEFAULT_PREFERENCES.units);
      expect(result.notifications_enabled).toBe(DEFAULT_PREFERENCES.notifications_enabled);
      expect(result.privacy_find_me).toBe(DEFAULT_PREFERENCES.privacy_find_me);
      expect(result.privacy_show_steps).toBe(DEFAULT_PREFERENCES.privacy_show_steps);
    });

    it('should throw error for non-404 errors', async () => {
      const mockError = { code: 'UNEXPECTED', message: 'Database error' };
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      await expect(userPreferencesApi.getPreferences()).rejects.toEqual(mockError);
    });

    it('should throw error when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(userPreferencesApi.getPreferences()).rejects.toThrow('User not authenticated');
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
      const updates = { daily_step_goal: 12000, units: 'imperial' as const };
      const updatedPrefs = { ...mockPreferences, ...updates };

      const mockUpsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: updatedPrefs,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: mockUpsert,
      });

      mockUpsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const result = await userPreferencesApi.updatePreferences(updates);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_preferences');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '123',
          daily_step_goal: 12000,
          units: 'imperial',
        }),
        { onConflict: 'id' }
      );
      expect(result).toEqual(updatedPrefs);
    });

    it('should update privacy settings', async () => {
      const updates = { privacy_find_me: 'private' as const, privacy_show_steps: 'private' as const };
      const updatedPrefs = { ...mockPreferences, ...updates };

      const mockUpsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: updatedPrefs,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: mockUpsert,
      });

      mockUpsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const result = await userPreferencesApi.updatePreferences(updates);

      expect(result.privacy_find_me).toBe('private');
      expect(result.privacy_show_steps).toBe('private');
    });

    it('should throw error when update fails', async () => {
      const mockError = { message: 'Update failed' };

      const mockUpsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: mockUpsert,
      });

      mockUpsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      await expect(userPreferencesApi.updatePreferences({ daily_step_goal: 15000 })).rejects.toEqual(mockError);
    });

    it('should throw error when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(userPreferencesApi.updatePreferences({ daily_step_goal: 15000 })).rejects.toThrow('User not authenticated');
    });
  });
});
