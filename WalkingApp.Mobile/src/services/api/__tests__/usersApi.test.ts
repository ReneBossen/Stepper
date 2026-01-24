import { usersApi, UserProfileData } from '../usersApi';
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
    email: 'test@example.com',
    display_name: 'Test User',
    username: 'testuser',
    bio: 'Test bio',
    location: 'Test City',
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
      expect(mockSelect).toHaveBeenCalledWith('id, email, display_name, username, bio, location, avatar_url, created_at, onboarding_completed');
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
      const updates = { bio: 'New bio only' };
      const updatedProfile = { ...mockUserProfile, bio: 'New bio only' };

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
      expect(result.bio).toBe('New bio only');
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
});
