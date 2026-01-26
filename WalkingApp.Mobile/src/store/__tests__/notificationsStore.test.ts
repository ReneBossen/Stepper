import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useNotificationsStore, Notification } from '../notificationsStore';
import { notificationsApi } from '@services/api/notificationsApi';
import { supabase } from '@services/supabase';

// Mock the notifications API
jest.mock('@services/api/notificationsApi');

// Mock Supabase client
jest.mock('@services/supabase', () => {
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
  };

  return {
    supabase: {
      channel: jest.fn().mockReturnValue(mockChannel),
      removeChannel: jest.fn(),
    },
  };
});

const mockNotificationsApi = notificationsApi as jest.Mocked<typeof notificationsApi>;

describe('notificationsStore', () => {
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
    {
      id: 'notif-3',
      user_id: 'user-123',
      type: 'group_invite',
      title: 'Group Invitation',
      message: 'You were invited to Morning Walkers',
      is_read: false,
      data: { group_id: 'group-123' },
      created_at: '2024-01-13T12:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    useNotificationsStore.setState({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      _channel: null,
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useNotificationsStore());

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('fetchNotifications', () => {
    it('should fetch notifications successfully', async () => {
      mockNotificationsApi.getNotifications.mockResolvedValue(mockNotifications);

      const { result } = renderHook(() => useNotificationsStore());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      expect(mockNotificationsApi.getNotifications).toHaveBeenCalled();
      expect(result.current.notifications).toEqual(mockNotifications);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty notifications list', async () => {
      mockNotificationsApi.getNotifications.mockResolvedValue([]);

      const { result } = renderHook(() => useNotificationsStore());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      expect(result.current.notifications).toEqual([]);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch notifications');
      mockNotificationsApi.getNotifications.mockRejectedValue(error);

      const { result } = renderHook(() => useNotificationsStore());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      expect(result.current.error).toBe('Failed to fetch notifications');
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      mockNotificationsApi.getNotifications.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockNotifications), 100))
      );

      const { result } = renderHook(() => useNotificationsStore());

      act(() => {
        result.current.fetchNotifications();
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should clear previous errors on fetch', async () => {
      mockNotificationsApi.getNotifications.mockResolvedValue(mockNotifications);

      const { result } = renderHook(() => useNotificationsStore());

      useNotificationsStore.setState({ error: 'Previous error' });

      await act(async () => {
        await result.current.fetchNotifications();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('fetchUnreadCount', () => {
    it('should fetch unread count successfully', async () => {
      mockNotificationsApi.getUnreadCount.mockResolvedValue(5);

      const { result } = renderHook(() => useNotificationsStore());

      await act(async () => {
        await result.current.fetchUnreadCount();
      });

      expect(mockNotificationsApi.getUnreadCount).toHaveBeenCalled();
      expect(result.current.unreadCount).toBe(5);
    });

    it('should handle zero unread count', async () => {
      mockNotificationsApi.getUnreadCount.mockResolvedValue(0);

      const { result } = renderHook(() => useNotificationsStore());

      await act(async () => {
        await result.current.fetchUnreadCount();
      });

      expect(result.current.unreadCount).toBe(0);
    });

    it('should handle fetch unread count error', async () => {
      const error = new Error('Count unavailable');
      mockNotificationsApi.getUnreadCount.mockRejectedValue(error);

      const { result } = renderHook(() => useNotificationsStore());

      await act(async () => {
        await result.current.fetchUnreadCount();
      });

      expect(result.current.error).toBe('Count unavailable');
    });

    it('should not set loading state during unread count fetch', async () => {
      mockNotificationsApi.getUnreadCount.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(3), 100))
      );

      const { result } = renderHook(() => useNotificationsStore());

      act(() => {
        result.current.fetchUnreadCount();
      });

      // fetchUnreadCount doesn't set isLoading
      expect(result.current.isLoading).toBe(false);

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(3);
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      mockNotificationsApi.markAsRead.mockResolvedValue(undefined);
      mockNotificationsApi.getUnreadCount.mockResolvedValue(1);

      const { result } = renderHook(() => useNotificationsStore());

      useNotificationsStore.setState({ notifications: mockNotifications });

      await act(async () => {
        await result.current.markAsRead('notif-1');
      });

      expect(mockNotificationsApi.markAsRead).toHaveBeenCalledWith('notif-1');
      expect(result.current.notifications[0].is_read).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should update unread count after marking as read', async () => {
      mockNotificationsApi.markAsRead.mockResolvedValue(undefined);
      mockNotificationsApi.getUnreadCount.mockResolvedValue(1);

      const { result } = renderHook(() => useNotificationsStore());

      useNotificationsStore.setState({
        notifications: mockNotifications,
        unreadCount: 2,
      });

      await act(async () => {
        await result.current.markAsRead('notif-1');
      });

      expect(mockNotificationsApi.getUnreadCount).toHaveBeenCalled();
      expect(result.current.unreadCount).toBe(1);
    });

    it('should not affect other notifications', async () => {
      mockNotificationsApi.markAsRead.mockResolvedValue(undefined);
      mockNotificationsApi.getUnreadCount.mockResolvedValue(1);

      const { result } = renderHook(() => useNotificationsStore());

      useNotificationsStore.setState({ notifications: mockNotifications });

      await act(async () => {
        await result.current.markAsRead('notif-1');
      });

      expect(result.current.notifications[1].is_read).toBe(true); // Still true
      expect(result.current.notifications[2].is_read).toBe(false); // Still false
    });

    it('should handle mark as read error', async () => {
      const error = new Error('Mark as read failed');
      mockNotificationsApi.markAsRead.mockRejectedValue(error);

      const { result } = renderHook(() => useNotificationsStore());

      try {
        await act(async () => {
          await result.current.markAsRead('notif-1');
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Mark as read failed');
      });
    });

    it('should set loading state during mark as read', async () => {
      mockNotificationsApi.markAsRead.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );
      mockNotificationsApi.getUnreadCount.mockResolvedValue(0);

      const { result } = renderHook(() => useNotificationsStore());

      useNotificationsStore.setState({ notifications: mockNotifications });

      act(() => {
        result.current.markAsRead('notif-1');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      mockNotificationsApi.markAllAsRead.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotificationsStore());

      useNotificationsStore.setState({
        notifications: mockNotifications,
        unreadCount: 2,
      });

      await act(async () => {
        await result.current.markAllAsRead();
      });

      expect(mockNotificationsApi.markAllAsRead).toHaveBeenCalled();
      expect(result.current.notifications.every(n => n.is_read)).toBe(true);
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set unread count to zero', async () => {
      mockNotificationsApi.markAllAsRead.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotificationsStore());

      useNotificationsStore.setState({
        notifications: mockNotifications,
        unreadCount: 10,
      });

      await act(async () => {
        await result.current.markAllAsRead();
      });

      expect(result.current.unreadCount).toBe(0);
    });

    it('should handle mark all as read error', async () => {
      const error = new Error('Mark all failed');
      mockNotificationsApi.markAllAsRead.mockRejectedValue(error);

      const { result } = renderHook(() => useNotificationsStore());

      try {
        await act(async () => {
          await result.current.markAllAsRead();
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Mark all failed');
      });
    });

    it('should handle empty notifications list', async () => {
      mockNotificationsApi.markAllAsRead.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotificationsStore());

      await act(async () => {
        await result.current.markAllAsRead();
      });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      mockNotificationsApi.deleteNotification.mockResolvedValue(undefined);
      mockNotificationsApi.getUnreadCount.mockResolvedValue(1);

      const { result } = renderHook(() => useNotificationsStore());

      useNotificationsStore.setState({ notifications: mockNotifications });

      await act(async () => {
        await result.current.deleteNotification('notif-1');
      });

      expect(mockNotificationsApi.deleteNotification).toHaveBeenCalledWith('notif-1');
      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications.find(n => n.id === 'notif-1')).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should update unread count after deletion', async () => {
      mockNotificationsApi.deleteNotification.mockResolvedValue(undefined);
      mockNotificationsApi.getUnreadCount.mockResolvedValue(1);

      const { result } = renderHook(() => useNotificationsStore());

      useNotificationsStore.setState({
        notifications: mockNotifications,
        unreadCount: 2,
      });

      await act(async () => {
        await result.current.deleteNotification('notif-1');
      });

      expect(mockNotificationsApi.getUnreadCount).toHaveBeenCalled();
      expect(result.current.unreadCount).toBe(1);
    });

    it('should not update unread count if deleting read notification', async () => {
      mockNotificationsApi.deleteNotification.mockResolvedValue(undefined);
      mockNotificationsApi.getUnreadCount.mockResolvedValue(2);

      const { result } = renderHook(() => useNotificationsStore());

      useNotificationsStore.setState({
        notifications: mockNotifications,
        unreadCount: 2,
      });

      await act(async () => {
        await result.current.deleteNotification('notif-2'); // Already read
      });

      expect(result.current.unreadCount).toBe(2);
    });

    it('should handle delete notification error', async () => {
      const error = new Error('Delete failed');
      mockNotificationsApi.deleteNotification.mockRejectedValue(error);

      const { result } = renderHook(() => useNotificationsStore());

      try {
        await act(async () => {
          await result.current.deleteNotification('notif-1');
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Delete failed');
      });
    });

    it('should remove only the specified notification', async () => {
      mockNotificationsApi.deleteNotification.mockResolvedValue(undefined);
      mockNotificationsApi.getUnreadCount.mockResolvedValue(1);

      const { result } = renderHook(() => useNotificationsStore());

      useNotificationsStore.setState({ notifications: mockNotifications });

      await act(async () => {
        await result.current.deleteNotification('notif-2');
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications.find(n => n.id === 'notif-1')).toBeDefined();
      expect(result.current.notifications.find(n => n.id === 'notif-3')).toBeDefined();
    });

    it('should set loading state during delete', async () => {
      mockNotificationsApi.deleteNotification.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );
      mockNotificationsApi.getUnreadCount.mockResolvedValue(0);

      const { result } = renderHook(() => useNotificationsStore());

      useNotificationsStore.setState({ notifications: mockNotifications });

      act(() => {
        result.current.deleteNotification('notif-1');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('notification types', () => {
    it('should handle all notification types', () => {
      const types: Array<Notification['type']> = [
        'friend_request',
        'friend_accepted',
        'group_invite',
        'goal_achieved',
        'general',
      ];

      types.forEach(type => {
        const notification: Notification = {
          id: `notif-${type}`,
          user_id: 'user-123',
          type,
          title: 'Test',
          message: 'Test message',
          is_read: false,
          created_at: '2024-01-15T10:00:00Z',
        };

        expect(notification.type).toBe(type);
      });
    });
  });

  describe('subscribeToNotifications', () => {
    it('should create a realtime channel subscription', () => {
      const { result } = renderHook(() => useNotificationsStore());

      act(() => {
        result.current.subscribeToNotifications('user-123');
      });

      expect(supabase.channel).toHaveBeenCalledWith('notifications:user-123');
      expect(result.current._channel).not.toBeNull();
    });

    it('should set up postgres_changes listener with correct filter', () => {
      const mockChannel = supabase.channel('test');
      const { result } = renderHook(() => useNotificationsStore());

      act(() => {
        result.current.subscribeToNotifications('user-456');
      });

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'user_id=eq.user-456',
        },
        expect.any(Function)
      );
    });

    it('should call subscribe on the channel', () => {
      const mockChannel = supabase.channel('test');
      const { result } = renderHook(() => useNotificationsStore());

      act(() => {
        result.current.subscribeToNotifications('user-123');
      });

      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should clean up existing channel before creating new one', () => {
      const { result } = renderHook(() => useNotificationsStore());

      // Create first subscription
      act(() => {
        result.current.subscribeToNotifications('user-123');
      });

      const firstChannel = result.current._channel;

      // Create second subscription
      act(() => {
        result.current.subscribeToNotifications('user-456');
      });

      expect(supabase.removeChannel).toHaveBeenCalledWith(firstChannel);
    });
  });

  describe('unsubscribeFromNotifications', () => {
    it('should remove the channel when subscribed', () => {
      const { result } = renderHook(() => useNotificationsStore());

      // First subscribe
      act(() => {
        result.current.subscribeToNotifications('user-123');
      });

      const channel = result.current._channel;

      // Then unsubscribe
      act(() => {
        result.current.unsubscribeFromNotifications();
      });

      expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
      expect(result.current._channel).toBeNull();
    });

    it('should do nothing when no channel exists', () => {
      const { result } = renderHook(() => useNotificationsStore());

      act(() => {
        result.current.unsubscribeFromNotifications();
      });

      // Should not throw and removeChannel should not be called
      expect(supabase.removeChannel).not.toHaveBeenCalled();
      expect(result.current._channel).toBeNull();
    });
  });

  describe('realtime notification handling', () => {
    it('should prepend new notification and increment unread count when INSERT received', () => {
      const mockChannel = supabase.channel('test');
      let capturedCallback: ((payload: { new: Partial<Notification> }) => void) | null = null;

      // Capture the callback passed to .on()
      (mockChannel.on as jest.Mock).mockImplementation(
        (_event: string, _filter: object, callback: (payload: { new: Partial<Notification> }) => void) => {
          capturedCallback = callback;
          return mockChannel;
        }
      );

      const { result } = renderHook(() => useNotificationsStore());

      // Set initial state
      useNotificationsStore.setState({
        notifications: mockNotifications,
        unreadCount: 2,
      });

      act(() => {
        result.current.subscribeToNotifications('user-123');
      });

      // Simulate receiving a new notification via realtime
      const newNotification: Notification = {
        id: 'new-notif',
        user_id: 'user-123',
        type: 'general',
        title: 'New Notification',
        message: 'Just arrived',
        is_read: false,
        created_at: '2024-01-16T10:00:00Z',
      };

      act(() => {
        if (capturedCallback) {
          capturedCallback({ new: newNotification });
        }
      });

      // Verify notification was prepended
      expect(result.current.notifications[0].id).toBe('new-notif');
      expect(result.current.notifications).toHaveLength(mockNotifications.length + 1);
      // Verify unread count was incremented
      expect(result.current.unreadCount).toBe(3);
    });

    it('should not increment unread count for already read notification', () => {
      const mockChannel = supabase.channel('test');
      let capturedCallback: ((payload: { new: Partial<Notification> }) => void) | null = null;

      (mockChannel.on as jest.Mock).mockImplementation(
        (_event: string, _filter: object, callback: (payload: { new: Partial<Notification> }) => void) => {
          capturedCallback = callback;
          return mockChannel;
        }
      );

      const { result } = renderHook(() => useNotificationsStore());

      useNotificationsStore.setState({
        notifications: [],
        unreadCount: 0,
      });

      act(() => {
        result.current.subscribeToNotifications('user-123');
      });

      // Simulate receiving an already read notification
      const readNotification: Notification = {
        id: 'read-notif',
        user_id: 'user-123',
        type: 'general',
        title: 'Read Notification',
        message: 'Already read',
        is_read: true,
        created_at: '2024-01-16T10:00:00Z',
      };

      act(() => {
        if (capturedCallback) {
          capturedCallback({ new: readNotification });
        }
      });

      // Verify unread count was NOT incremented
      expect(result.current.unreadCount).toBe(0);
      // But notification was still added
      expect(result.current.notifications).toHaveLength(1);
    });
  });
});
