import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useActivityStore, ActivityItem } from '../activityStore';
import { activityApi, ActivityFeedResponse } from '@services/api/activityApi';

// Mock the activity API
jest.mock('@services/api/activityApi');

const mockActivityApi = activityApi as jest.Mocked<typeof activityApi>;

describe('activityStore', () => {
  const mockActivityItem: ActivityItem = {
    id: '1',
    type: 'friend_achievement',
    userId: 'user-123',
    userName: 'John Doe',
    avatarUrl: 'https://example.com/avatar.jpg',
    message: 'John hit 15,000 steps today!',
    timestamp: '2024-01-15T10:00:00Z',
  };

  const mockFeed: ActivityItem[] = [
    mockActivityItem,
    {
      id: '2',
      type: 'streak',
      userId: 'user-456',
      userName: 'Jane Smith',
      message: 'Jane completed a 7-day streak!',
      timestamp: '2024-01-15T09:00:00Z',
    },
    {
      id: '3',
      type: 'group_join',
      userId: 'user-789',
      userName: 'Bob Wilson',
      message: 'Bob joined "Morning Walkers"',
      timestamp: '2024-01-15T08:00:00Z',
    },
  ];

  const mockFeedResponse: ActivityFeedResponse = {
    items: mockFeed,
    totalCount: 50,
    hasMore: true,
  };

  const mockEmptyFeedResponse: ActivityFeedResponse = {
    items: [],
    totalCount: 0,
    hasMore: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    useActivityStore.setState({
      feed: [],
      totalCount: 0,
      hasMore: false,
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useActivityStore());

      expect(result.current.feed).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('fetchFeed', () => {
    it('should fetch feed successfully', async () => {
      mockActivityApi.getFeed.mockResolvedValue(mockFeedResponse);

      const { result } = renderHook(() => useActivityStore());

      await act(async () => {
        await result.current.fetchFeed();
      });

      expect(mockActivityApi.getFeed).toHaveBeenCalledWith({});
      expect(result.current.feed).toEqual(mockFeed);
      expect(result.current.totalCount).toBe(50);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should fetch feed with custom limit', async () => {
      mockActivityApi.getFeed.mockResolvedValue(mockFeedResponse);

      const { result } = renderHook(() => useActivityStore());

      await act(async () => {
        await result.current.fetchFeed({ limit: 5 });
      });

      expect(mockActivityApi.getFeed).toHaveBeenCalledWith({ limit: 5 });
    });

    it('should fetch feed with offset', async () => {
      mockActivityApi.getFeed.mockResolvedValue(mockFeedResponse);

      const { result } = renderHook(() => useActivityStore());

      await act(async () => {
        await result.current.fetchFeed({ limit: 10, offset: 20 });
      });

      expect(mockActivityApi.getFeed).toHaveBeenCalledWith({ limit: 10, offset: 20 });
    });

    it('should handle empty feed', async () => {
      mockActivityApi.getFeed.mockResolvedValue(mockEmptyFeedResponse);

      const { result } = renderHook(() => useActivityStore());

      await act(async () => {
        await result.current.fetchFeed();
      });

      expect(result.current.feed).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.hasMore).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      mockActivityApi.getFeed.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockFeedResponse), 100))
      );

      const { result } = renderHook(() => useActivityStore());

      act(() => {
        result.current.fetchFeed();
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle fetch error', async () => {
      const error = new Error('Network error');
      mockActivityApi.getFeed.mockRejectedValue(error);

      const { result } = renderHook(() => useActivityStore());

      await act(async () => {
        await result.current.fetchFeed();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should clear previous error on new fetch', async () => {
      mockActivityApi.getFeed.mockResolvedValue(mockFeedResponse);

      const { result } = renderHook(() => useActivityStore());

      useActivityStore.setState({ error: 'Previous error' });

      await act(async () => {
        await result.current.fetchFeed();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('loadMore', () => {
    it('should load more items and append to feed', async () => {
      const moreItems: ActivityItem[] = [
        {
          id: '4',
          type: 'milestone',
          userId: 'user-111',
          userName: 'Alice',
          message: 'Alice reached 50,000 steps!',
          timestamp: '2024-01-14T10:00:00Z',
        },
      ];

      mockActivityApi.getFeed.mockResolvedValue({
        items: moreItems,
        totalCount: 50,
        hasMore: false,
      });

      const { result } = renderHook(() => useActivityStore());

      // Set initial state with hasMore: true
      useActivityStore.setState({
        feed: mockFeed,
        totalCount: 50,
        hasMore: true,
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockActivityApi.getFeed).toHaveBeenCalledWith({ offset: mockFeed.length });
      expect(result.current.feed.length).toBe(mockFeed.length + moreItems.length);
      expect(result.current.hasMore).toBe(false);
    });

    it('should not load more if hasMore is false', async () => {
      const { result } = renderHook(() => useActivityStore());

      useActivityStore.setState({
        feed: mockFeed,
        hasMore: false,
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockActivityApi.getFeed).not.toHaveBeenCalled();
    });

    it('should not load more if already loading', async () => {
      const { result } = renderHook(() => useActivityStore());

      useActivityStore.setState({
        feed: mockFeed,
        hasMore: true,
        isLoading: true,
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockActivityApi.getFeed).not.toHaveBeenCalled();
    });

    it('should handle loadMore error', async () => {
      const error = new Error('Load more failed');
      mockActivityApi.getFeed.mockRejectedValue(error);

      const { result } = renderHook(() => useActivityStore());

      useActivityStore.setState({
        feed: mockFeed,
        hasMore: true,
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.error).toBe('Load more failed');
      expect(result.current.feed).toEqual(mockFeed); // Original feed preserved
    });
  });

  describe('addActivityItem', () => {
    it('should add new item to beginning of feed', () => {
      const { result } = renderHook(() => useActivityStore());

      useActivityStore.setState({ feed: mockFeed });

      const newItem: ActivityItem = {
        id: '4',
        type: 'milestone',
        userId: 'user-999',
        userName: 'New User',
        message: 'New milestone reached!',
        timestamp: '2024-01-15T11:00:00Z',
      };

      act(() => {
        result.current.addActivityItem(newItem);
      });

      expect(result.current.feed[0]).toEqual(newItem);
      expect(result.current.feed.length).toBe(mockFeed.length + 1);
    });

    it('should not add duplicate items', () => {
      const { result } = renderHook(() => useActivityStore());

      // First add the mock feed
      act(() => {
        useActivityStore.setState({ feed: mockFeed });
      });

      // Try to add a duplicate item
      act(() => {
        result.current.addActivityItem(mockActivityItem);
      });

      expect(result.current.feed.length).toBe(mockFeed.length);
    });

    it('should add item to empty feed', () => {
      const { result } = renderHook(() => useActivityStore());

      act(() => {
        result.current.addActivityItem(mockActivityItem);
      });

      expect(result.current.feed).toEqual([mockActivityItem]);
    });

    it('should preserve existing items when adding new one', () => {
      const { result } = renderHook(() => useActivityStore());

      useActivityStore.setState({ feed: mockFeed });

      const newItem: ActivityItem = {
        id: '4',
        type: 'milestone',
        userId: 'user-999',
        userName: 'New User',
        message: 'New milestone reached!',
        timestamp: '2024-01-15T11:00:00Z',
      };

      act(() => {
        result.current.addActivityItem(newItem);
      });

      // Check all original items are still there
      mockFeed.forEach((item) => {
        expect(result.current.feed).toContainEqual(item);
      });
    });
  });

  describe('clearFeed', () => {
    it('should clear the feed and reset all state', () => {
      const { result } = renderHook(() => useActivityStore());

      useActivityStore.setState({
        feed: mockFeed,
        totalCount: 50,
        hasMore: true,
        isLoading: true,
        error: 'Some error',
      });

      act(() => {
        result.current.clearFeed();
      });

      expect(result.current.feed).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should work when feed is already empty', () => {
      const { result } = renderHook(() => useActivityStore());

      act(() => {
        result.current.clearFeed();
      });

      expect(result.current.feed).toEqual([]);
    });
  });

  describe('activity item types', () => {
    it('should handle milestone type', async () => {
      const milestoneItem: ActivityItem = {
        id: '1',
        type: 'milestone',
        userId: 'user-123',
        userName: 'Test User',
        message: 'You reached 100,000 total steps!',
        timestamp: '2024-01-15T10:00:00Z',
      };

      mockActivityApi.getFeed.mockResolvedValue({
        items: [milestoneItem],
        totalCount: 1,
        hasMore: false,
      });

      const { result } = renderHook(() => useActivityStore());

      await act(async () => {
        await result.current.fetchFeed();
      });

      expect(result.current.feed[0].type).toBe('milestone');
    });

    it('should handle friend_achievement type', async () => {
      mockActivityApi.getFeed.mockResolvedValue({
        items: [mockActivityItem],
        totalCount: 1,
        hasMore: false,
      });

      const { result } = renderHook(() => useActivityStore());

      await act(async () => {
        await result.current.fetchFeed();
      });

      expect(result.current.feed[0].type).toBe('friend_achievement');
      expect(result.current.feed[0].userName).toBe('John Doe');
    });

    it('should handle group_join type', async () => {
      const groupJoinItem: ActivityItem = {
        id: '1',
        type: 'group_join',
        userId: 'user-123',
        userName: 'John',
        message: 'John joined "Morning Walkers"',
        timestamp: '2024-01-15T10:00:00Z',
      };

      mockActivityApi.getFeed.mockResolvedValue({
        items: [groupJoinItem],
        totalCount: 1,
        hasMore: false,
      });

      const { result } = renderHook(() => useActivityStore());

      await act(async () => {
        await result.current.fetchFeed();
      });

      expect(result.current.feed[0].type).toBe('group_join');
    });

    it('should handle streak type', async () => {
      const streakItem: ActivityItem = {
        id: '1',
        type: 'streak',
        userId: 'user-123',
        userName: 'John',
        message: 'John completed a 30-day streak!',
        timestamp: '2024-01-15T10:00:00Z',
      };

      mockActivityApi.getFeed.mockResolvedValue({
        items: [streakItem],
        totalCount: 1,
        hasMore: false,
      });

      const { result } = renderHook(() => useActivityStore());

      await act(async () => {
        await result.current.fetchFeed();
      });

      expect(result.current.feed[0].type).toBe('streak');
    });
  });

  describe('pagination state', () => {
    it('should track totalCount from API response', async () => {
      mockActivityApi.getFeed.mockResolvedValue({
        items: mockFeed,
        totalCount: 100,
        hasMore: true,
      });

      const { result } = renderHook(() => useActivityStore());

      await act(async () => {
        await result.current.fetchFeed();
      });

      expect(result.current.totalCount).toBe(100);
    });

    it('should track hasMore from API response', async () => {
      mockActivityApi.getFeed.mockResolvedValue({
        items: mockFeed,
        totalCount: 3,
        hasMore: false,
      });

      const { result } = renderHook(() => useActivityStore());

      await act(async () => {
        await result.current.fetchFeed();
      });

      expect(result.current.hasMore).toBe(false);
    });
  });
});
