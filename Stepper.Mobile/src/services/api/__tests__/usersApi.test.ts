import {
  usersApi,
  UserProfileData,
  PublicUserProfile,
  UserStats,
  WeeklyActivity,
  Achievement,
  MutualGroup,
} from '../usersApi';
import { apiClient } from '../client';

// Mock the apiClient
jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
    upload: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('usersApi', () => {
  // UserProfileData no longer includes preferences - they are in a separate table
  const mockUserProfile: UserProfileData = {
    id: '123',
    display_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    onboarding_completed: true,
    created_at: '2024-01-01T00:00:00Z',
  };

  // Backend response format (camelCase)
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

  describe('getCurrentUser', () => {
    it('should fetch current user successfully via backend API', async () => {
      mockApiClient.get.mockResolvedValue(mockBackendProfile);

      const result = await usersApi.getCurrentUser();

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/me');
      expect(result).toEqual(mockUserProfile);
    });

    it('should map camelCase response to snake_case', async () => {
      mockApiClient.get.mockResolvedValue({
        id: '456',
        displayName: 'Another User',
        avatarUrl: 'https://example.com/other.jpg',
        onboardingCompleted: false,
        createdAt: '2024-02-15T10:30:00Z',
      });

      const result = await usersApi.getCurrentUser();

      expect(result).toEqual({
        id: '456',
        display_name: 'Another User',
        avatar_url: 'https://example.com/other.jpg',
        onboarding_completed: false,
        created_at: '2024-02-15T10:30:00Z',
      });
    });

    it('should throw error when API call fails', async () => {
      const apiError = new Error('Network error');
      mockApiClient.get.mockRejectedValue(apiError);

      await expect(usersApi.getCurrentUser()).rejects.toThrow('Network error');
    });

    it('should handle missing avatar_url', async () => {
      mockApiClient.get.mockResolvedValue({
        id: '123',
        displayName: 'Test User',
        avatarUrl: undefined,
        onboardingCompleted: true,
        createdAt: '2024-01-01T00:00:00Z',
      });

      const result = await usersApi.getCurrentUser();

      expect(result.avatar_url).toBeUndefined();
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully via backend API', async () => {
      const updates = { display_name: 'Updated Name' };
      const updatedBackendProfile = { ...mockBackendProfile, displayName: 'Updated Name' };

      mockApiClient.put.mockResolvedValue(updatedBackendProfile);

      const result = await usersApi.updateProfile(updates);

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/me', { displayName: 'Updated Name' });
      expect(result.display_name).toBe('Updated Name');
    });

    it('should map snake_case updates to camelCase request', async () => {
      const updates = {
        display_name: 'New Name',
        avatar_url: 'https://new-avatar.jpg',
        onboarding_completed: true,
      };

      mockApiClient.put.mockResolvedValue({
        id: '123',
        displayName: 'New Name',
        avatarUrl: 'https://new-avatar.jpg',
        onboardingCompleted: true,
        createdAt: '2024-01-01T00:00:00Z',
      });

      await usersApi.updateProfile(updates);

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/me', {
        displayName: 'New Name',
        avatarUrl: 'https://new-avatar.jpg',
        onboardingCompleted: true,
      });
    });

    it('should handle partial updates', async () => {
      const updates = { display_name: 'New Name Only' };

      mockApiClient.put.mockResolvedValue({
        ...mockBackendProfile,
        displayName: 'New Name Only',
      });

      const result = await usersApi.updateProfile(updates);

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/me', { displayName: 'New Name Only' });
      expect(result.display_name).toBe('New Name Only');
    });

    it('should throw error when update fails', async () => {
      const apiError = new Error('Update failed');
      mockApiClient.put.mockRejectedValue(apiError);

      await expect(usersApi.updateProfile({ display_name: 'Test' })).rejects.toThrow('Update failed');
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully via backend API', async () => {
      const avatarUri = 'file://path/to/avatar.jpg';
      const publicUrl = 'https://storage.example.com/avatars/123/avatar.jpg';

      mockApiClient.upload.mockResolvedValue({ avatarUrl: publicUrl });

      const result = await usersApi.uploadAvatar(avatarUri);

      expect(mockApiClient.upload).toHaveBeenCalledWith(
        '/users/me/avatar',
        expect.any(FormData)
      );
      expect(result).toBe(publicUrl);
    });

    it('should throw error when upload fails', async () => {
      const apiError = new Error('Upload failed');
      mockApiClient.upload.mockRejectedValue(apiError);

      await expect(usersApi.uploadAvatar('file://avatar.jpg')).rejects.toThrow('Upload failed');
    });

    it('should handle different file extensions', async () => {
      mockApiClient.upload.mockResolvedValue({ avatarUrl: 'https://example.com/avatar.png' });

      await usersApi.uploadAvatar('file://path/to/avatar.png');

      expect(mockApiClient.upload).toHaveBeenCalled();
      const formData = mockApiClient.upload.mock.calls[0][1];
      expect(formData).toBeInstanceOf(FormData);
    });
  });

  describe('getUserProfile', () => {
    const mockBackendPublicProfile = {
      id: '456',
      displayName: 'Sarah Johnson',
      avatarUrl: 'https://example.com/sarah.jpg',
      createdAt: '2024-12-10T08:00:00Z',
      onboardingCompleted: true,
    };

    it('should fetch user profile successfully via backend API', async () => {
      mockApiClient.get.mockResolvedValue(mockBackendPublicProfile);

      const result = await usersApi.getUserProfile('456');

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/456');
      expect(result).toEqual({
        id: '456',
        display_name: 'Sarah Johnson',
        avatar_url: 'https://example.com/sarah.jpg',
        created_at: '2024-12-10T08:00:00Z',
        is_private: false, // TODO: Backend doesn't provide this yet
      });
    });

    it('should map camelCase response to snake_case', async () => {
      mockApiClient.get.mockResolvedValue({
        id: '789',
        displayName: 'John Doe',
        avatarUrl: 'https://example.com/john.jpg',
        createdAt: '2024-06-15T10:00:00Z',
        onboardingCompleted: true,
      });

      const result = await usersApi.getUserProfile('789');

      expect(result.id).toBe('789');
      expect(result.display_name).toBe('John Doe');
      expect(result.avatar_url).toBe('https://example.com/john.jpg');
      expect(result.created_at).toBe('2024-06-15T10:00:00Z');
    });

    it('should throw error when user not found', async () => {
      const apiError = new Error('User not found');
      mockApiClient.get.mockRejectedValue(apiError);

      await expect(usersApi.getUserProfile('nonexistent')).rejects.toThrow('User not found');
    });

    it('should handle missing avatar_url', async () => {
      mockApiClient.get.mockResolvedValue({
        id: '456',
        displayName: 'No Avatar User',
        avatarUrl: undefined,
        createdAt: '2024-12-10T08:00:00Z',
        onboardingCompleted: true,
      });

      const result = await usersApi.getUserProfile('456');

      expect(result.avatar_url).toBeUndefined();
    });
  });

  describe('getUserStats', () => {
    const mockBackendStats = {
      friendsCount: 10,
      groupsCount: 5,
      badgesCount: 3,
    };

    it('should fetch user stats successfully via backend API', async () => {
      mockApiClient.get.mockResolvedValue(mockBackendStats);

      const result = await usersApi.getUserStats('123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/123/stats');
      expect(result).toEqual({
        friends_count: 10,
        groups_count: 5,
        badges_count: 3,
      });
    });

    it('should map camelCase response to snake_case', async () => {
      mockApiClient.get.mockResolvedValue({
        friendsCount: 25,
        groupsCount: 8,
        badgesCount: 12,
      });

      const result = await usersApi.getUserStats('456');

      expect(result.friends_count).toBe(25);
      expect(result.groups_count).toBe(8);
      expect(result.badges_count).toBe(12);
    });

    it('should throw error when API call fails', async () => {
      const apiError = new Error('Failed to fetch stats');
      mockApiClient.get.mockRejectedValue(apiError);

      await expect(usersApi.getUserStats('123')).rejects.toThrow('Failed to fetch stats');
    });

    it('should handle zero counts', async () => {
      mockApiClient.get.mockResolvedValue({
        friendsCount: 0,
        groupsCount: 0,
        badgesCount: 0,
      });

      const result = await usersApi.getUserStats('123');

      expect(result.friends_count).toBe(0);
      expect(result.groups_count).toBe(0);
      expect(result.badges_count).toBe(0);
    });
  });

  describe('getWeeklyActivity', () => {
    const mockBackendActivity = {
      totalSteps: 30000,
      totalDistanceMeters: 24000,
      averageStepsPerDay: 10000,
      currentStreak: 7,
    };

    it('should fetch weekly activity successfully via backend API', async () => {
      mockApiClient.get.mockResolvedValue(mockBackendActivity);

      const result = await usersApi.getWeeklyActivity('123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/123/activity');
      expect(result).toEqual({
        total_steps: 30000,
        total_distance_meters: 24000,
        average_steps_per_day: 10000,
        current_streak: 7,
      });
    });

    it('should map camelCase response to snake_case', async () => {
      mockApiClient.get.mockResolvedValue({
        totalSteps: 50000,
        totalDistanceMeters: 40000,
        averageStepsPerDay: 7143,
        currentStreak: 14,
      });

      const result = await usersApi.getWeeklyActivity('456');

      expect(result.total_steps).toBe(50000);
      expect(result.total_distance_meters).toBe(40000);
      expect(result.average_steps_per_day).toBe(7143);
      expect(result.current_streak).toBe(14);
    });

    it('should throw error when API call fails', async () => {
      const apiError = new Error('Failed to fetch activity');
      mockApiClient.get.mockRejectedValue(apiError);

      await expect(usersApi.getWeeklyActivity('123')).rejects.toThrow('Failed to fetch activity');
    });

    it('should handle zero values for inactive users', async () => {
      mockApiClient.get.mockResolvedValue({
        totalSteps: 0,
        totalDistanceMeters: 0,
        averageStepsPerDay: 0,
        currentStreak: 0,
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
    const mockMutualGroups = [
      { id: 'group-1', name: 'Morning Walkers' },
      { id: 'group-2', name: 'Weekend Hikers' },
    ];

    it('should fetch mutual groups successfully via backend API', async () => {
      mockApiClient.get.mockResolvedValue(mockMutualGroups);

      const result = await usersApi.getMutualGroups('456');

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/456/mutual-groups');
      expect(result).toEqual(mockMutualGroups);
    });

    it('should return empty array when no mutual groups', async () => {
      mockApiClient.get.mockResolvedValue([]);

      const result = await usersApi.getMutualGroups('456');

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/456/mutual-groups');
      expect(result).toEqual([]);
    });

    it('should throw error when API call fails', async () => {
      const apiError = new Error('Failed to fetch mutual groups');
      mockApiClient.get.mockRejectedValue(apiError);

      await expect(usersApi.getMutualGroups('456')).rejects.toThrow('Failed to fetch mutual groups');
    });

    it('should handle single mutual group', async () => {
      mockApiClient.get.mockResolvedValue([
        { id: 'group-1', name: 'Office Fitness Club' },
      ]);

      const result = await usersApi.getMutualGroups('789');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 'group-1', name: 'Office Fitness Club' });
    });
  });

  describe('downloadMyData', () => {
    const mockExportResponse = {
      exportMetadata: {
        exportedAt: '2026-02-01T12:00:00Z',
        userId: '123',
        dataFormat: 'stepper_export_v1',
      },
      profile: {
        id: '123',
        email: 'user@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        qrCodeId: 'abc123',
        onboardingCompleted: true,
        createdAt: '2025-01-01T00:00:00Z',
      },
      preferences: {
        dailyStepGoal: 10000,
        units: 'metric',
        notificationsEnabled: true,
        notifyDailyReminder: true,
        notifyFriendRequests: true,
        notifyGroupInvites: true,
        notifyAchievements: true,
        privacyProfileVisibility: 'public',
        privacyFindMe: 'public',
        privacyShowSteps: 'partial',
      },
      stepHistory: [
        {
          date: '2026-01-31',
          stepCount: 8500,
          distanceMeters: 6800.5,
          source: 'healthkit',
          recordedAt: '2026-01-31T23:00:00Z',
        },
      ],
      friendships: [
        {
          friendId: 'friend-1',
          friendDisplayName: 'Jane Smith',
          status: 'accepted',
          initiatedByMe: true,
          createdAt: '2025-06-01T00:00:00Z',
        },
      ],
      groupMemberships: [
        {
          groupId: 'group-1',
          groupName: 'Weekend Warriors',
          role: 'member',
          joinedAt: '2025-07-01T00:00:00Z',
        },
      ],
      activityFeed: [
        {
          id: 'activity-1',
          type: 'friend_request_accepted',
          message: 'Jane Smith accepted your friend request',
          createdAt: '2025-06-01T00:00:00Z',
        },
      ],
      notifications: [
        {
          id: 'notif-1',
          type: 'daily_reminder',
          title: 'Daily Reminder',
          body: 'Don\'t forget to log your steps!',
          createdAt: '2026-01-31T18:00:00Z',
          readAt: '2026-01-31T18:05:00Z',
        },
      ],
    };

    it('should call correct endpoint for data export', async () => {
      mockApiClient.get.mockResolvedValue(mockExportResponse);

      await usersApi.downloadMyData();

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/me/data-export');
    });

    it('should return complete export data', async () => {
      mockApiClient.get.mockResolvedValue(mockExportResponse);

      const result = await usersApi.downloadMyData();

      expect(result).toEqual(mockExportResponse);
    });

    it('should return export metadata', async () => {
      mockApiClient.get.mockResolvedValue(mockExportResponse);

      const result = await usersApi.downloadMyData();

      expect(result.exportMetadata).toBeDefined();
      expect(result.exportMetadata.dataFormat).toBe('stepper_export_v1');
      expect(result.exportMetadata.userId).toBe('123');
    });

    it('should return profile data', async () => {
      mockApiClient.get.mockResolvedValue(mockExportResponse);

      const result = await usersApi.downloadMyData();

      expect(result.profile).toBeDefined();
      expect(result.profile.displayName).toBe('Test User');
      expect(result.profile.email).toBe('user@example.com');
    });

    it('should return step history', async () => {
      mockApiClient.get.mockResolvedValue(mockExportResponse);

      const result = await usersApi.downloadMyData();

      expect(result.stepHistory).toHaveLength(1);
      expect(result.stepHistory[0].stepCount).toBe(8500);
    });

    it('should return friendships', async () => {
      mockApiClient.get.mockResolvedValue(mockExportResponse);

      const result = await usersApi.downloadMyData();

      expect(result.friendships).toHaveLength(1);
      expect(result.friendships[0].friendDisplayName).toBe('Jane Smith');
    });

    it('should return group memberships', async () => {
      mockApiClient.get.mockResolvedValue(mockExportResponse);

      const result = await usersApi.downloadMyData();

      expect(result.groupMemberships).toHaveLength(1);
      expect(result.groupMemberships[0].groupName).toBe('Weekend Warriors');
    });

    it('should throw error when API call fails', async () => {
      const apiError = new Error('Failed to export data');
      mockApiClient.get.mockRejectedValue(apiError);

      await expect(usersApi.downloadMyData()).rejects.toThrow('Failed to export data');
    });

    it('should handle empty arrays in export', async () => {
      const emptyExportResponse = {
        ...mockExportResponse,
        stepHistory: [],
        friendships: [],
        groupMemberships: [],
        activityFeed: [],
        notifications: [],
      };
      mockApiClient.get.mockResolvedValue(emptyExportResponse);

      const result = await usersApi.downloadMyData();

      expect(result.stepHistory).toEqual([]);
      expect(result.friendships).toEqual([]);
      expect(result.groupMemberships).toEqual([]);
      expect(result.activityFeed).toEqual([]);
      expect(result.notifications).toEqual([]);
    });
  });
});
