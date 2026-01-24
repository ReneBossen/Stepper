import {
  usersApi,
  UserProfileData,
  PublicUserProfile,
  UserStats,
  WeeklyActivity,
  Achievement,
  MutualGroup,
} from '../usersApi';
import { supabase } from '@services/supabase';

// Mock the supabase client
const mockGetUser = jest.fn();

jest.mock('@services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
    auth: {
      getUser: () => mockGetUser(),
    },
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('usersApi', () => {
  // UserProfileData no longer includes preferences - they are in a separate table
  const mockUserProfile: UserProfileData = {
    id: '123',
    display_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    onboarding_completed: true,
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: '123' } },
      error: null,
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user successfully', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockUserProfile,
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

      const result = await usersApi.getCurrentUser();

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith('id, display_name, avatar_url, created_at, onboarding_completed');
      expect(mockEq).toHaveBeenCalledWith('id', '123');
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(mockUserProfile);
    });

    it('should throw error when user fetch fails', async () => {
      const mockError = { message: 'User not found' };
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
      const updates = { display_name: 'Updated Name' };
      const updatedProfile = { ...mockUserProfile, ...updates };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: updatedProfile,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const result = await usersApi.updateProfile(updates);

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockUpdate).toHaveBeenCalledWith(updates);
      expect(mockEq).toHaveBeenCalledWith('id', '123');
      expect(mockSelect).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(updatedProfile);
    });

    it('should handle partial updates', async () => {
      const updates = { display_name: 'New Name Only' };
      const updatedProfile = { ...mockUserProfile, display_name: 'New Name Only' };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: updatedProfile,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const result = await usersApi.updateProfile(updates);

      expect(mockUpdate).toHaveBeenCalledWith(updates);
      expect(result.display_name).toBe('New Name Only');
    });

    it('should throw error when update fails', async () => {
      const mockError = { message: 'Update failed' };
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      await expect(usersApi.updateProfile({ display_name: 'Test' })).rejects.toEqual(mockError);
    });
  });

  // Note: updatePreferences tests have been moved to userPreferencesApi.test.ts
  // since preferences are now stored in the user_preferences table

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const avatarUri = 'file://path/to/avatar.jpg';
      const uploadedPath = '123/avatar-123456.jpg';
      const publicUrl = 'https://storage.example.com/avatars/123/avatar-123456.jpg';

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

    it('should generate unique filename with user folder', async () => {
      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1234567890);

      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob()),
      }) as any;

      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: '123/avatar-1234567890.jpg' },
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
        '123/avatar-1234567890.jpg',
        expect.any(Blob),
        { upsert: true, contentType: 'image/jpeg' }
      );

      dateSpy.mockRestore();
    });
  });

  describe('getUserProfile', () => {
    const mockPublicProfile = {
      id: '456',
      display_name: 'Sarah Johnson',
      avatar_url: 'https://example.com/sarah.jpg',
      created_at: '2024-12-10T08:00:00Z',
    };

    it('should fetch user profile successfully', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockPublicProfile,
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

      // Mock preferences query for privacy check
      const mockPrefsSelect = jest.fn().mockReturnThis();
      const mockPrefsEq = jest.fn().mockReturnThis();
      const mockPrefsSingle = jest.fn().mockResolvedValue({
        data: { privacy_find_me: 'public' },
        error: null,
      });

      // Second call to from() for user_preferences
      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: mockSelect,
        })
        .mockReturnValueOnce({
          select: mockPrefsSelect,
        });

      mockPrefsSelect.mockReturnValue({
        eq: mockPrefsEq,
      });

      mockPrefsEq.mockReturnValue({
        single: mockPrefsSingle,
      });

      const result = await usersApi.getUserProfile('456');

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(result.id).toBe('456');
      expect(result.display_name).toBe('Sarah Johnson');
      expect(result.is_private).toBe(false);
    });

    it('should mark profile as private when privacy_find_me is private', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockPublicProfile,
        error: null,
      });

      const mockPrefsSelect = jest.fn().mockReturnThis();
      const mockPrefsEq = jest.fn().mockReturnThis();
      const mockPrefsSingle = jest.fn().mockResolvedValue({
        data: { privacy_find_me: 'private' },
        error: null,
      });

      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: mockSelect,
        })
        .mockReturnValueOnce({
          select: mockPrefsSelect,
        });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });

      mockPrefsSelect.mockReturnValue({ eq: mockPrefsEq });
      mockPrefsEq.mockReturnValue({ single: mockPrefsSingle });

      const result = await usersApi.getUserProfile('456');

      expect(result.is_private).toBe(true);
    });

    it('should throw error when user not found', async () => {
      const mockError = { message: 'User not found' };
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });

      await expect(usersApi.getUserProfile('456')).rejects.toEqual(mockError);
    });
  });

  describe('getUserStats', () => {
    it('should fetch user stats successfully', async () => {
      // Mock friendships count
      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              or: jest.fn().mockResolvedValue({ count: 10, error: null }),
            }),
          }),
        })
        // Mock group_memberships count
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
          }),
        });

      const result = await usersApi.getUserStats('123');

      expect(result.friends_count).toBe(10);
      expect(result.groups_count).toBe(5);
      expect(result.badges_count).toBe(0); // Currently hardcoded as badges are not implemented
    });

    it('should return zero counts when no data', async () => {
      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              or: jest.fn().mockResolvedValue({ count: null, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: null, error: null }),
          }),
        });

      const result = await usersApi.getUserStats('123');

      expect(result.friends_count).toBe(0);
      expect(result.groups_count).toBe(0);
    });
  });

  describe('getWeeklyActivity', () => {
    it('should calculate weekly activity correctly', async () => {
      const mockEntries = [
        { date: '2025-01-24', step_count: 10000, distance_meters: 8000 },
        { date: '2025-01-23', step_count: 8000, distance_meters: 6400 },
        { date: '2025-01-22', step_count: 12000, distance_meters: 9600 },
      ];

      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: mockEntries, error: null }),
                }),
              }),
            }),
          }),
        })
        // For streak calculation
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockEntries, error: null }),
            }),
          }),
        });

      const result = await usersApi.getWeeklyActivity('123');

      expect(result.total_steps).toBe(30000);
      expect(result.total_distance_meters).toBe(24000);
      expect(result.average_steps_per_day).toBe(10000);
    });

    it('should return zero values when no entries', async () => {
      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

      const result = await usersApi.getWeeklyActivity('123');

      expect(result.total_steps).toBe(0);
      expect(result.total_distance_meters).toBe(0);
      expect(result.average_steps_per_day).toBe(0);
      expect(result.current_streak).toBe(0);
    });
  });

  describe('getAchievements', () => {
    it('should return empty array (achievements not implemented)', async () => {
      const result = await usersApi.getAchievements('123');

      expect(result).toEqual([]);
    });
  });

  describe('getMutualGroups', () => {
    it('should fetch mutual groups successfully', async () => {
      // Mock authenticated user
      mockGetUser.mockResolvedValue({
        data: { user: { id: '123' } },
        error: null,
      });

      // Mock current user's groups
      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ group_id: 'group-1' }, { group_id: 'group-2' }],
              error: null,
            }),
          }),
        })
        // Mock other user's groups with join
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  { group_id: 'group-1', groups: { id: 'group-1', name: 'Morning Walkers' } },
                ],
                error: null,
              }),
            }),
          }),
        });

      const result = await usersApi.getMutualGroups('456');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 'group-1', name: 'Morning Walkers' });
    });

    it('should return empty array when no mutual groups', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: '123' } },
        error: null,
      });

      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ group_id: 'group-1' }],
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        });

      const result = await usersApi.getMutualGroups('456');

      expect(result).toEqual([]);
    });

    it('should return empty array when user has no groups', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: '123' } },
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await usersApi.getMutualGroups('456');

      expect(result).toEqual([]);
    });
  });

});
