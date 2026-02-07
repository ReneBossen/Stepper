import { create } from 'zustand';
import { RealtimeChannel } from '@supabase/supabase-js';
import { notificationsApi } from '@services/api/notificationsApi';
import { supabase } from '@services/supabase';
import { getErrorMessage } from '@utils/errorUtils';
import { createAsyncAction } from './utils';

export interface Notification {
  id: string;
  user_id: string;
  type: 'friend_request' | 'friend_accepted' | 'group_invite' | 'goal_achieved' | 'general';
  title: string;
  message: string;
  is_read: boolean;
  data?: Record<string, unknown>;
  created_at: string;
}

/**
 * Payload structure from Supabase Realtime postgres_changes INSERT event.
 * The `new` field contains the inserted row data.
 */
interface RealtimeNotificationPayload {
  new: {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    data?: Record<string, unknown>;
    created_at: string;
  };
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Realtime subscription state
  _channel: RealtimeChannel | null;

  // Actions
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;

  // Realtime subscription actions
  subscribeToNotifications: (userId: string) => void;
  unsubscribeFromNotifications: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  _channel: null,

  fetchNotifications: createAsyncAction<NotificationsState, [], Notification[]>(
    set,
    () => notificationsApi.getNotifications(),
    {
      onSuccess: (notifications) => ({ notifications }),
    }
  ),

  fetchUnreadCount: async () => {
    try {
      const unreadCount = await notificationsApi.getUnreadCount();
      set({ unreadCount });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) });
    }
  },

  markAsRead: async (notificationId) => {
    set({ isLoading: true, error: null });
    try {
      await notificationsApi.markAsRead(notificationId);
      const notifications = get().notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      );
      set({ notifications, isLoading: false });
      await get().fetchUnreadCount();
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  markAllAsRead: async () => {
    set({ isLoading: true, error: null });
    try {
      await notificationsApi.markAllAsRead();
      const notifications = get().notifications.map(n => ({ ...n, is_read: true }));
      set({ notifications, unreadCount: 0, isLoading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  deleteNotification: async (notificationId) => {
    set({ isLoading: true, error: null });
    try {
      await notificationsApi.deleteNotification(notificationId);
      const notifications = get().notifications.filter(n => n.id !== notificationId);
      set({ notifications, isLoading: false });
      await get().fetchUnreadCount();
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  subscribeToNotifications: (userId: string) => {
    // Clean up any existing subscription first
    const existingChannel = get()._channel;
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    // Create a new channel for notifications
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimeNotificationPayload) => {
          const newNotification = payload.new;

          // Map the realtime payload to match the Notification type
          const notification: Notification = {
            id: newNotification.id,
            user_id: newNotification.user_id,
            type: newNotification.type as Notification['type'],
            title: newNotification.title,
            message: newNotification.message,
            is_read: newNotification.is_read,
            data: newNotification.data,
            created_at: newNotification.created_at,
          };

          // Prepend the new notification to the list and increment unread count
          set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
          }));
        }
      )
      .subscribe();

    set({ _channel: channel });
  },

  unsubscribeFromNotifications: () => {
    const channel = get()._channel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ _channel: null });
    }
  },
}));
