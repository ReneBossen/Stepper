import { notificationsApi } from '../notificationsApi';
import { apiClient } from '../client';
import { Notification } from '@store/notificationsStore';

// Mock the apiClient
jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('notificationsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should fetch notifications successfully', async () => {
      const mockBackendResponse = {
        items: [
          {
            id: 'notif-1',
            userId: 'user-123',
            type: 'friend_request',
            title: 'New Friend Request',
            message: 'John Doe sent you a friend request',
            isRead: false,
            data: '{"from_user_id":"user-456"}',
            createdAt: '2024-01-15T10:00:00Z',
          },
          {
            id: 'notif-2',
            userId: 'user-123',
            type: 'goal_achieved',
            title: 'Goal Achieved!',
            message: 'You reached your daily step goal',
            isRead: true,
            data: null,
            createdAt: '2024-01-14T18:00:00Z',
          },
        ],
        totalCount: 2,
        unreadCount: 1,
        hasMore: false,
      };

      mockApiClient.get.mockResolvedValue(mockBackendResponse);

      const result = await notificationsApi.getNotifications();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/notifications?limit=50&offset=0');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'notif-1',
        user_id: 'user-123',
        type: 'friend_request',
        title: 'New Friend Request',
        message: 'John Doe sent you a friend request',
        is_read: false,
        data: { from_user_id: 'user-456' },
        created_at: '2024-01-15T10:00:00Z',
      });
      expect(result[1]).toEqual({
        id: 'notif-2',
        user_id: 'user-123',
        type: 'goal_achieved',
        title: 'Goal Achieved!',
        message: 'You reached your daily step goal',
        is_read: true,
        data: undefined,
        created_at: '2024-01-14T18:00:00Z',
      });
    });

    it('should handle empty notifications list', async () => {
      mockApiClient.get.mockResolvedValue({
        items: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false,
      });

      const result = await notificationsApi.getNotifications();

      expect(result).toEqual([]);
    });

    it('should throw error when fetch fails', async () => {
      const apiError = new Error('Network error');
      mockApiClient.get.mockRejectedValue(apiError);

      await expect(notificationsApi.getNotifications()).rejects.toThrow('Network error');
    });

    it('should map camelCase response to snake_case', async () => {
      mockApiClient.get.mockResolvedValue({
        items: [
          {
            id: 'notif-1',
            userId: 'user-abc',
            type: 'general',
            title: 'Test Title',
            message: 'Test Message',
            isRead: true,
            createdAt: '2024-01-20T12:00:00Z',
          },
        ],
        totalCount: 1,
        unreadCount: 0,
        hasMore: false,
      });

      const result = await notificationsApi.getNotifications();

      expect(result[0].user_id).toBe('user-abc');
      expect(result[0].is_read).toBe(true);
      expect(result[0].created_at).toBe('2024-01-20T12:00:00Z');
    });

    it('should handle invalid JSON in data field gracefully', async () => {
      mockApiClient.get.mockResolvedValue({
        items: [
          {
            id: 'notif-1',
            userId: 'user-123',
            type: 'general',
            title: 'Test',
            message: 'Test',
            isRead: false,
            data: 'invalid-json{',
            createdAt: '2024-01-20T12:00:00Z',
          },
        ],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false,
      });

      const result = await notificationsApi.getNotifications();

      expect(result[0].data).toBeUndefined();
    });

    it('should parse valid JSON in data field', async () => {
      mockApiClient.get.mockResolvedValue({
        items: [
          {
            id: 'notif-1',
            userId: 'user-123',
            type: 'friend_accepted',
            title: 'Friend Accepted',
            message: 'Your request was accepted',
            isRead: false,
            data: '{"friend_id":"friend-123","friend_name":"Jane"}',
            createdAt: '2024-01-20T12:00:00Z',
          },
        ],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false,
      });

      const result = await notificationsApi.getNotifications();

      expect(result[0].data).toEqual({ friend_id: 'friend-123', friend_name: 'Jane' });
    });
  });

  describe('getUnreadCount', () => {
    it('should fetch unread count successfully', async () => {
      mockApiClient.get.mockResolvedValue({ count: 5 });

      const result = await notificationsApi.getUnreadCount();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/notifications/unread/count');
      expect(result).toBe(5);
    });

    it('should return zero when no unread notifications', async () => {
      mockApiClient.get.mockResolvedValue({ count: 0 });

      const result = await notificationsApi.getUnreadCount();

      expect(result).toBe(0);
    });

    it('should throw error when fetch fails', async () => {
      const apiError = new Error('Count failed');
      mockApiClient.get.mockRejectedValue(apiError);

      await expect(notificationsApi.getUnreadCount()).rejects.toThrow('Count failed');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      mockApiClient.put.mockResolvedValue(undefined);

      await notificationsApi.markAsRead('notif-123');

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/notifications/notif-123/read');
    });

    it('should throw error when update fails', async () => {
      const apiError = new Error('Update failed');
      mockApiClient.put.mockRejectedValue(apiError);

      await expect(notificationsApi.markAsRead('notif-123')).rejects.toThrow('Update failed');
    });

    it('should use the correct notification ID in the URL', async () => {
      mockApiClient.put.mockResolvedValue(undefined);

      await notificationsApi.markAsRead('specific-notif-id');

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/notifications/specific-notif-id/read');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      mockApiClient.put.mockResolvedValue(undefined);

      await notificationsApi.markAllAsRead();

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/notifications/read-all');
    });

    it('should throw error when update fails', async () => {
      const apiError = new Error('Bulk update failed');
      mockApiClient.put.mockRejectedValue(apiError);

      await expect(notificationsApi.markAllAsRead()).rejects.toThrow('Bulk update failed');
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await notificationsApi.deleteNotification('notif-123');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/notifications/notif-123');
    });

    it('should throw error when delete fails', async () => {
      const apiError = new Error('Delete failed');
      mockApiClient.delete.mockRejectedValue(apiError);

      await expect(notificationsApi.deleteNotification('notif-123')).rejects.toThrow('Delete failed');
    });

    it('should use the correct notification ID in the URL', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await notificationsApi.deleteNotification('specific-notif-id');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/notifications/specific-notif-id');
    });
  });
});
