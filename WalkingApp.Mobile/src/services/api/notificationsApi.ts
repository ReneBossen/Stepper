import { apiClient } from './client';
import { Notification } from '@store/notificationsStore';

/**
 * Backend API response shape for a single notification.
 * Uses camelCase from .NET backend.
 */
interface BackendNotificationResponse {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: string; // JSON string from backend
  createdAt: string;
}

/**
 * Backend API response shape for notification list.
 */
interface BackendNotificationListResponse {
  items: BackendNotificationResponse[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
}

/**
 * Backend API response shape for unread count.
 */
interface BackendUnreadCountResponse {
  count: number;
}

/**
 * Maps a backend notification response (camelCase) to mobile format (snake_case).
 */
function mapNotificationResponse(backend: BackendNotificationResponse): Notification {
  // Parse the data field from JSON string if present
  let parsedData: Record<string, unknown> | undefined;
  if (backend.data) {
    try {
      parsedData = JSON.parse(backend.data);
    } catch {
      // If parsing fails, leave data undefined
      parsedData = undefined;
    }
  }

  return {
    id: backend.id,
    user_id: backend.userId,
    type: backend.type as Notification['type'],
    title: backend.title,
    message: backend.message,
    is_read: backend.isRead,
    data: parsedData,
    created_at: backend.createdAt,
  };
}

export const notificationsApi = {
  /**
   * Fetches notifications for the current user from the backend API.
   * Returns up to 50 notifications ordered by creation date (newest first).
   */
  getNotifications: async (): Promise<Notification[]> => {
    const response = await apiClient.get<BackendNotificationListResponse>(
      '/api/v1/notifications?limit=50&offset=0'
    );
    return response.items.map(mapNotificationResponse);
  },

  /**
   * Fetches the count of unread notifications for the current user.
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<BackendUnreadCountResponse>(
      '/api/v1/notifications/unread/count'
    );
    return response.count;
  },

  /**
   * Marks a specific notification as read.
   */
  markAsRead: async (notificationId: string): Promise<void> => {
    await apiClient.put<void>(`/api/v1/notifications/${notificationId}/read`);
  },

  /**
   * Marks all notifications as read for the current user.
   */
  markAllAsRead: async (): Promise<void> => {
    await apiClient.put<void>('/api/v1/notifications/read-all');
  },

  /**
   * Deletes a specific notification.
   */
  deleteNotification: async (notificationId: string): Promise<void> => {
    await apiClient.delete<void>(`/api/v1/notifications/${notificationId}`);
  },
};
