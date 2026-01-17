import { notificationsApi } from '../notificationsApi';
import { supabase } from '@services/supabase';
import { Notification } from '@store/notificationsStore';

// Mock the supabase client
jest.mock('@services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('notificationsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should fetch notifications successfully', async () => {
      const mockNotifications: Notification[] = [
        {
          id: 'notif-1',
          user_id: 'user-123',
          type: 'friend_request',
          title: 'New Friend Request',
          message: 'John Doe sent you a friend request',
          is_read: false,
          data: { from_user_id: 'user-456' },
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'notif-2',
          user_id: 'user-123',
          type: 'goal_achieved',
          title: 'Goal Achieved!',
          message: 'You reached your daily step goal',
          is_read: true,
          created_at: '2024-01-14T18:00:00Z',
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: mockNotifications,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        limit: mockLimit,
      });

      mockSelect.mockReturnValue({
        order: mockOrder,
      });

      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      const result = await notificationsApi.getNotifications();

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(50);
      expect(result).toEqual(mockNotifications);
    });

    it('should handle empty notifications list', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        limit: mockLimit,
      });

      mockSelect.mockReturnValue({
        order: mockOrder,
      });

      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      const result = await notificationsApi.getNotifications();

      expect(result).toEqual([]);
    });

    it('should throw error when fetch fails', async () => {
      const mockError = { message: 'Fetch failed' };

      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        limit: mockLimit,
      });

      mockSelect.mockReturnValue({
        order: mockOrder,
      });

      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      await expect(notificationsApi.getNotifications()).rejects.toEqual(mockError);
    });

    it('should limit to 50 notifications', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        limit: mockLimit,
      });

      mockSelect.mockReturnValue({
        order: mockOrder,
      });

      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      await notificationsApi.getNotifications();

      expect(mockLimit).toHaveBeenCalledWith(50);
    });

    it('should order by created_at descending', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        limit: mockLimit,
      });

      mockSelect.mockReturnValue({
        order: mockOrder,
      });

      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      await notificationsApi.getNotifications();

      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('getUnreadCount', () => {
    it('should fetch unread count successfully', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        count: 5,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      const result = await notificationsApi.getUnreadCount();

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
      expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true });
      expect(mockEq).toHaveBeenCalledWith('is_read', false);
      expect(result).toBe(5);
    });

    it('should return zero when no unread notifications', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        count: 0,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      const result = await notificationsApi.getUnreadCount();

      expect(result).toBe(0);
    });

    it('should return zero when count is null', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        count: null,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      const result = await notificationsApi.getUnreadCount();

      expect(result).toBe(0);
    });

    it('should throw error when fetch fails', async () => {
      const mockError = { message: 'Count failed' };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        count: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      await expect(notificationsApi.getUnreadCount()).rejects.toEqual(mockError);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      await notificationsApi.markAsRead('notif-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
      expect(mockUpdate).toHaveBeenCalledWith({ is_read: true });
      expect(mockEq).toHaveBeenCalledWith('id', 'notif-123');
    });

    it('should throw error when update fails', async () => {
      const mockError = { message: 'Update failed' };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      await expect(notificationsApi.markAsRead('notif-123')).rejects.toEqual(mockError);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read successfully', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      await notificationsApi.markAllAsRead();

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
      expect(mockUpdate).toHaveBeenCalledWith({ is_read: true });
      expect(mockEq).toHaveBeenCalledWith('is_read', false);
    });

    it('should throw error when update fails', async () => {
      const mockError = { message: 'Bulk update failed' };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      await expect(notificationsApi.markAllAsRead()).rejects.toEqual(mockError);
    });

    it('should only update unread notifications', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      await notificationsApi.markAllAsRead();

      expect(mockEq).toHaveBeenCalledWith('is_read', false);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      });

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      await notificationsApi.deleteNotification('notif-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'notif-123');
    });

    it('should throw error when delete fails', async () => {
      const mockError = { message: 'Delete failed' };

      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      });

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      await expect(notificationsApi.deleteNotification('notif-123')).rejects.toEqual(mockError);
    });

    it('should delete only the specified notification', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      });

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      await notificationsApi.deleteNotification('specific-notif-id');

      expect(mockEq).toHaveBeenCalledWith('id', 'specific-notif-id');
    });
  });
});
