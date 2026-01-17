import { usersApi } from '../usersApi';
import { supabase } from '@services/supabase';
import { UserProfile, UserPreferences } from '@store/userStore';

// Mock the supabase client
jest.mock('@services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('usersApi', () => {
  const mockUserProfile: UserProfile = {
    id: '123',
    email: 'test@example.com',
    display_name: 'Test User',
    username: 'testuser',
    bio: 'Test bio',
    location: 'Test City',
    avatar_url: 'https://example.com/avatar.jpg',
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
  });

  describe('getCurrentUser', () => {
    it('should fetch current user successfully', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockUserProfile,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        single: mockSingle,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const result = await usersApi.getCurrentUser();

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(mockUserProfile);
    });

    it('should throw error when user fetch fails', async () => {
      const mockError = { message: 'User not found' };
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        single: mockSingle,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      await expect(usersApi.getCurrentUser()).rejects.toEqual(mockError);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      const mockSelect = jest.fn().mockImplementation(() => {
        throw networkError;
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await expect(usersApi.getCurrentUser()).rejects.toThrow('Network error');
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updates = { display_name: 'Updated Name', bio: 'Updated bio' };
      const updatedProfile = { ...mockUserProfile, ...updates };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: updatedProfile,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        select: mockSelect,
        single: mockSingle,
      });

      mockUpdate.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const result = await usersApi.updateProfile(updates);

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockUpdate).toHaveBeenCalledWith(updates);
      expect(mockSelect).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(updatedProfile);
    });

    it('should handle partial updates', async () => {
      const updates = { bio: 'New bio only' };
      const updatedProfile = { ...mockUserProfile, bio: 'New bio only' };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: updatedProfile,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        select: mockSelect,
        single: mockSingle,
      });

      mockUpdate.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const result = await usersApi.updateProfile(updates);

      expect(mockUpdate).toHaveBeenCalledWith(updates);
      expect(result.bio).toBe('New bio only');
    });

    it('should throw error when update fails', async () => {
      const mockError = { message: 'Update failed' };
      const mockUpdate = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        select: mockSelect,
        single: mockSingle,
      });

      mockUpdate.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      await expect(usersApi.updateProfile({ display_name: 'Test' })).rejects.toEqual(mockError);
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
      const prefUpdates: Partial<UserPreferences> = {
        units: 'imperial',
        daily_step_goal: 12000,
      };

      const currentPrefs = mockUserProfile.preferences;
      const mergedPrefs = { ...currentPrefs, ...prefUpdates };

      // Mock for fetching current preferences
      const mockSelectCurrent = jest.fn().mockReturnThis();
      const mockSingleCurrent = jest.fn().mockResolvedValue({
        data: { preferences: currentPrefs },
        error: null,
      });

      // Mock for updating preferences
      const mockUpdate = jest.fn().mockReturnThis();
      const mockSelectUpdate = jest.fn().mockReturnThis();
      const mockSingleUpdate = jest.fn().mockResolvedValue({
        data: { preferences: mergedPrefs },
        error: null,
      });

      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call for fetching current
          return {
            select: mockSelectCurrent,
          };
        } else {
          // Second call for updating
          return {
            update: mockUpdate,
          };
        }
      });

      mockSelectCurrent.mockReturnValue({
        single: mockSingleCurrent,
      });

      mockUpdate.mockReturnValue({
        select: mockSelectUpdate,
      });

      mockSelectUpdate.mockReturnValue({
        single: mockSingleUpdate,
      });

      const result = await usersApi.updatePreferences(prefUpdates);

      expect(result).toEqual(mergedPrefs);
      expect(result.units).toBe('imperial');
      expect(result.daily_step_goal).toBe(12000);
    });

    it('should merge with existing preferences', async () => {
      const prefUpdates: Partial<UserPreferences> = {
        theme: 'dark',
      };

      const currentPrefs = mockUserProfile.preferences;
      const mergedPrefs = { ...currentPrefs, theme: 'dark' as const };

      const mockSelectCurrent = jest.fn().mockReturnThis();
      const mockSingleCurrent = jest.fn().mockResolvedValue({
        data: { preferences: currentPrefs },
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnThis();
      const mockSelectUpdate = jest.fn().mockReturnThis();
      const mockSingleUpdate = jest.fn().mockResolvedValue({
        data: { preferences: mergedPrefs },
        error: null,
      });

      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelectCurrent };
        } else {
          return { update: mockUpdate };
        }
      });

      mockSelectCurrent.mockReturnValue({
        single: mockSingleCurrent,
      });

      mockUpdate.mockReturnValue({
        select: mockSelectUpdate,
      });

      mockSelectUpdate.mockReturnValue({
        single: mockSingleUpdate,
      });

      const result = await usersApi.updatePreferences(prefUpdates);

      expect(result.theme).toBe('dark');
      expect(result.units).toBe('metric'); // Original value preserved
    });

    it('should throw error when update fails', async () => {
      const mockError = { message: 'Preferences update failed' };

      const mockSelectCurrent = jest.fn().mockReturnThis();
      const mockSingleCurrent = jest.fn().mockResolvedValue({
        data: { preferences: mockUserProfile.preferences },
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnThis();
      const mockSelectUpdate = jest.fn().mockReturnThis();
      const mockSingleUpdate = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelectCurrent };
        } else {
          return { update: mockUpdate };
        }
      });

      mockSelectCurrent.mockReturnValue({
        single: mockSingleCurrent,
      });

      mockUpdate.mockReturnValue({
        select: mockSelectUpdate,
      });

      mockSelectUpdate.mockReturnValue({
        single: mockSingleUpdate,
      });

      await expect(usersApi.updatePreferences({ theme: 'dark' })).rejects.toEqual(mockError);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const avatarUri = 'file://path/to/avatar.jpg';
      const uploadedPath = 'avatar-123456.jpg';
      const publicUrl = 'https://storage.example.com/avatars/avatar-123456.jpg';

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob()),
      }) as any;

      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: uploadedPath },
        error: null,
      });

      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl },
      });

      const mockStorage = {
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      };

      (mockSupabase.storage.from as jest.Mock).mockReturnValue(mockStorage);

      const result = await usersApi.uploadAvatar(avatarUri);

      expect(global.fetch).toHaveBeenCalledWith(avatarUri);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('avatars');
      expect(mockUpload).toHaveBeenCalled();
      expect(mockGetPublicUrl).toHaveBeenCalledWith(uploadedPath);
      expect(result).toBe(publicUrl);
    });

    it('should throw error when upload fails', async () => {
      const mockError = { message: 'Upload failed' };

      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob()),
      }) as any;

      const mockUpload = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.storage.from as jest.Mock).mockReturnValue({
        upload: mockUpload,
      });

      await expect(usersApi.uploadAvatar('file://avatar.jpg')).rejects.toEqual(mockError);
    });

    it('should handle fetch error', async () => {
      const fetchError = new Error('Failed to fetch file');
      global.fetch = jest.fn().mockRejectedValue(fetchError) as any;

      await expect(usersApi.uploadAvatar('file://avatar.jpg')).rejects.toThrow('Failed to fetch file');
    });

    it('should generate unique filename', async () => {
      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1234567890);

      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob()),
      }) as any;

      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'avatar-1234567890.jpg' },
        error: null,
      });

      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/avatar.jpg' },
      });

      (mockSupabase.storage.from as jest.Mock).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });

      await usersApi.uploadAvatar('file://avatar.jpg');

      expect(mockUpload).toHaveBeenCalledWith(
        'avatar-1234567890.jpg',
        expect.any(Blob)
      );

      dateSpy.mockRestore();
    });
  });
});
