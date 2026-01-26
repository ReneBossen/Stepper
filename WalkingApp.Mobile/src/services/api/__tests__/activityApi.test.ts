import { activityApi, ActivityItem } from '../activityApi';
import { apiClient } from '../client';
import { supabase } from '../../supabase';

// Mock the apiClient module
jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

// Mock Supabase client for real-time subscriptions only
jest.mock('../../supabase', () => ({
  supabase: {
    channel: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('activityApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFeed', () => {
    const mockBackendResponse = {
      items: [
        {
          id: 'activity-1',
          userId: 'user-123',
          userName: 'John Doe',
          userAvatarUrl: 'https://example.com/avatar1.jpg',
          type: 'friend_achievement',
          message: 'John hit 15,000 steps!',
          metadata: { steps: 15000 },
          createdAt: '2024-01-15T10:00:00Z',
          relatedUserId: null,
          relatedGroupId: null,
        },
        {
          id: 'activity-2',
          userId: 'user-456',
          userName: 'Jane Smith',
          userAvatarUrl: null,
          type: 'streak',
          message: 'Jane completed a 7-day streak!',
          metadata: { streakDays: 7 },
          createdAt: '2024-01-15T09:00:00Z',
          relatedUserId: null,
          relatedGroupId: null,
        },
      ],
      totalCount: 50,
      hasMore: true,
    };

    it('should fetch activity feed successfully', async () => {
      mockApiClient.get.mockResolvedValue(mockBackendResponse);

      const result = await activityApi.getFeed();

      expect(mockApiClient.get).toHaveBeenCalledWith('/activity/feed');
      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(50);
      expect(result.hasMore).toBe(true);
    });

    it('should map backend response to mobile format', async () => {
      mockApiClient.get.mockResolvedValue(mockBackendResponse);

      const result = await activityApi.getFeed();

      expect(result.items[0]).toEqual({
        id: 'activity-1',
        type: 'friend_achievement',
        userId: 'user-123',
        userName: 'John Doe',
        avatarUrl: 'https://example.com/avatar1.jpg',
        message: 'John hit 15,000 steps!',
        timestamp: '2024-01-15T10:00:00Z',
        metadata: { steps: 15000 },
        relatedUserId: null,
        relatedGroupId: null,
      });
    });

    it('should handle null avatar URL', async () => {
      mockApiClient.get.mockResolvedValue(mockBackendResponse);

      const result = await activityApi.getFeed();

      expect(result.items[1].avatarUrl).toBeNull();
      expect(result.items[1].userName).toBe('Jane Smith');
    });

    it('should pass limit parameter to endpoint', async () => {
      mockApiClient.get.mockResolvedValue({ items: [], totalCount: 0, hasMore: false });

      await activityApi.getFeed({ limit: 5 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/activity/feed?limit=5');
    });

    it('should pass offset parameter to endpoint', async () => {
      mockApiClient.get.mockResolvedValue({ items: [], totalCount: 0, hasMore: false });

      await activityApi.getFeed({ offset: 10 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/activity/feed?offset=10');
    });

    it('should pass both limit and offset parameters', async () => {
      mockApiClient.get.mockResolvedValue({ items: [], totalCount: 0, hasMore: false });

      await activityApi.getFeed({ limit: 20, offset: 40 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/activity/feed?limit=20&offset=40');
    });

    it('should return empty array when no items', async () => {
      mockApiClient.get.mockResolvedValue({ items: [], totalCount: 0, hasMore: false });

      const result = await activityApi.getFeed();

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should propagate API errors', async () => {
      const error = new Error('Network error');
      mockApiClient.get.mockRejectedValue(error);

      await expect(activityApi.getFeed()).rejects.toThrow('Network error');
    });

    it('should include metadata and related IDs when present', async () => {
      const responseWithRelations = {
        items: [
          {
            id: 'activity-3',
            userId: 'user-789',
            userName: 'Bob Wilson',
            userAvatarUrl: 'https://example.com/bob.jpg',
            type: 'group_join',
            message: 'Bob joined the Running Club!',
            metadata: { groupName: 'Running Club' },
            createdAt: '2024-01-15T08:00:00Z',
            relatedUserId: 'user-111',
            relatedGroupId: 'group-222',
          },
        ],
        totalCount: 1,
        hasMore: false,
      };
      mockApiClient.get.mockResolvedValue(responseWithRelations);

      const result = await activityApi.getFeed();

      expect(result.items[0].metadata).toEqual({ groupName: 'Running Club' });
      expect(result.items[0].relatedUserId).toBe('user-111');
      expect(result.items[0].relatedGroupId).toBe('group-222');
    });
  });

  describe('subscribeToFeed', () => {
    it('should create a subscription channel', () => {
      const mockSubscribe = jest.fn().mockReturnValue({
        unsubscribe: jest.fn(),
      });
      const mockOn = jest.fn().mockReturnValue({
        subscribe: mockSubscribe,
      });
      const mockChannel = jest.fn().mockReturnValue({
        on: mockOn,
      });

      mockSupabase.channel = mockChannel;

      const callback = jest.fn();
      activityApi.subscribeToFeed(callback);

      expect(mockChannel).toHaveBeenCalledWith('activity_feed_changes');
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
        }),
        expect.any(Function)
      );
      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const mockUnsubscribe = jest.fn();
      const mockSubscribe = jest.fn().mockReturnValue({
        unsubscribe: mockUnsubscribe,
      });

      mockSupabase.channel = jest.fn().mockReturnValue({
        on: jest.fn().mockReturnValue({
          subscribe: mockSubscribe,
        }),
      });

      const callback = jest.fn();
      const unsubscribe = activityApi.subscribeToFeed(callback);

      unsubscribe();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should call callback with mapped activity item when receiving new data', async () => {
      let capturedHandler: ((payload: { new: { id: string } }) => Promise<void>) | null = null;

      const mockSubscribe = jest.fn().mockReturnValue({
        unsubscribe: jest.fn(),
      });
      const mockOn = jest.fn().mockImplementation((_event, _options, handler) => {
        capturedHandler = handler;
        return { subscribe: mockSubscribe };
      });
      const mockChannel = jest.fn().mockReturnValue({
        on: mockOn,
      });

      mockSupabase.channel = mockChannel;

      // Mock the backend API response for getActivityItem
      mockApiClient.get.mockResolvedValue({
        id: 'activity-new',
        type: 'milestone',
        userId: 'user-123',
        userName: 'Test User',
        userAvatarUrl: 'https://example.com/test.jpg',
        message: 'Reached 10,000 steps!',
        metadata: { milestone: 10000 },
        createdAt: '2024-01-15T12:00:00Z',
        relatedUserId: null,
        relatedGroupId: null,
      });

      const callback = jest.fn();
      activityApi.subscribeToFeed(callback);

      // Simulate receiving a new activity
      expect(capturedHandler).not.toBeNull();
      await capturedHandler!({ new: { id: 'activity-new' } });

      expect(mockApiClient.get).toHaveBeenCalledWith('/activity/activity-new');
      expect(callback).toHaveBeenCalledWith({
        id: 'activity-new',
        type: 'milestone',
        userId: 'user-123',
        userName: 'Test User',
        avatarUrl: 'https://example.com/test.jpg',
        message: 'Reached 10,000 steps!',
        timestamp: '2024-01-15T12:00:00Z',
        metadata: { milestone: 10000 },
        relatedUserId: null,
        relatedGroupId: null,
      });
    });

    it('should call onError callback when fetch fails', async () => {
      let capturedHandler: ((payload: { new: { id: string } }) => Promise<void>) | null = null;

      const mockSubscribe = jest.fn().mockReturnValue({
        unsubscribe: jest.fn(),
      });
      const mockOn = jest.fn().mockImplementation((_event, _options, handler) => {
        capturedHandler = handler;
        return { subscribe: mockSubscribe };
      });
      const mockChannel = jest.fn().mockReturnValue({
        on: mockOn,
      });

      mockSupabase.channel = mockChannel;

      // Mock the backend API to fail
      mockApiClient.get.mockRejectedValue(new Error('Failed to fetch activity item'));

      const callback = jest.fn();
      const onError = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      activityApi.subscribeToFeed(callback, onError);

      await capturedHandler!({ new: { id: 'activity-fail' } });

      expect(callback).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to fetch activity item',
        })
      );
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
