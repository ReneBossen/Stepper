import { activityApi, ActivityItem } from '../activityApi';
import { supabase } from '../../supabase';

// Mock Supabase client
jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('activityApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFeed', () => {
    // Note: activity_feed.user_id references auth.users(id), not public.users
    // so we cannot join to get user details - userName and avatarUrl will be undefined
    const mockDbResponse = [
      {
        id: '1',
        type: 'friend_achievement',
        user_id: 'user-123',
        message: 'John hit 15,000 steps!',
        created_at: '2024-01-15T10:00:00Z',
      },
      {
        id: '2',
        type: 'streak',
        user_id: 'user-456',
        message: 'Jane completed a 7-day streak!',
        created_at: '2024-01-15T09:00:00Z',
      },
    ];

    it('should fetch activity feed successfully', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: mockDbResponse,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const result = await activityApi.getFeed(10);

      expect(mockFrom).toHaveBeenCalledWith('activity_feed');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '1',
        type: 'friend_achievement',
        userId: 'user-123',
        userName: undefined,
        avatarUrl: undefined,
        message: 'John hit 15,000 steps!',
        timestamp: '2024-01-15T10:00:00Z',
      });
    });

    it('should use default limit of 10', async () => {
      const mockLimit = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: mockLimit,
          }),
        }),
      });

      await activityApi.getFeed();

      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should use custom limit when provided', async () => {
      const mockLimit = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: mockLimit,
          }),
        }),
      });

      await activityApi.getFeed(5);

      expect(mockLimit).toHaveBeenCalledWith(5);
    });

    it('should return empty array when no data', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const result = await activityApi.getFeed();

      expect(result).toEqual([]);
    });

    it('should handle PGRST116 error (no rows)', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows found' },
            }),
          }),
        }),
      });

      const result = await activityApi.getFeed();

      expect(result).toEqual([]);
    });

    it('should throw error for other errors', async () => {
      const error = { code: 'OTHER_ERROR', message: 'Something went wrong' };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error,
            }),
          }),
        }),
      });

      await expect(activityApi.getFeed()).rejects.toEqual(error);
    });

    it('should return undefined for userName and avatarUrl since join is not possible', async () => {
      // Since activity_feed.user_id references auth.users (not public.users),
      // we cannot join to get user details - they will always be undefined
      const responseData = [
        {
          id: '1',
          type: 'milestone',
          user_id: 'user-123',
          message: 'Milestone reached!',
          created_at: '2024-01-15T10:00:00Z',
        },
      ];

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: responseData,
              error: null,
            }),
          }),
        }),
      });

      const result = await activityApi.getFeed();

      expect(result[0].userName).toBeUndefined();
      expect(result[0].avatarUrl).toBeUndefined();
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
  });
});
