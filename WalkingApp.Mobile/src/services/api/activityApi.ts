import { apiClient } from './client';
import { supabase } from '../supabase';

/**
 * Backend API response shape for a single activity item.
 */
interface BackendActivityItemByIdResponse {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  relatedUserId?: string;
  relatedGroupId?: string;
}

/**
 * Activity item as returned to the mobile app.
 */
export interface ActivityItem {
  id: string;
  type: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  relatedUserId?: string;
  relatedGroupId?: string;
}

/**
 * Activity feed response with pagination info.
 */
export interface ActivityFeedResponse {
  items: ActivityItem[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Backend API response shape for activity item.
 * Uses camelCase from .NET backend.
 */
interface BackendActivityItemResponse {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  relatedUserId?: string;
  relatedGroupId?: string;
}

/**
 * Backend API response shape for activity feed.
 * Uses camelCase from .NET backend.
 */
interface BackendActivityFeedResponse {
  items: BackendActivityItemResponse[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Maps a backend activity item (camelCase) to mobile format.
 */
function mapActivityItem(backend: BackendActivityItemResponse): ActivityItem {
  return {
    id: backend.id,
    type: backend.type,
    userId: backend.userId,
    userName: backend.userName,
    avatarUrl: backend.userAvatarUrl,
    message: backend.message,
    timestamp: backend.createdAt,
    metadata: backend.metadata,
    relatedUserId: backend.relatedUserId,
    relatedGroupId: backend.relatedGroupId,
  };
}

/**
 * Parameters for fetching the activity feed.
 */
export interface GetFeedParams {
  limit?: number;
  offset?: number;
}

export const activityApi = {
  /**
   * Fetches the activity feed for the current user from the backend API.
   * This includes friend achievements, milestones, and group activities.
   *
   * @param params - Optional pagination parameters (limit, offset)
   * @returns The activity feed response with items and pagination info
   */
  getFeed: async (params: GetFeedParams = {}): Promise<ActivityFeedResponse> => {
    const queryParams = new URLSearchParams();
    if (params.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params.offset !== undefined) {
      queryParams.append('offset', params.offset.toString());
    }

    const query = queryParams.toString();
    const endpoint = query ? `/activity/feed?${query}` : '/activity/feed';

    const response = await apiClient.get<BackendActivityFeedResponse>(endpoint);

    return {
      items: response.items.map(mapActivityItem),
      totalCount: response.totalCount,
      hasMore: response.hasMore,
    };
  },

  /**
   * Fetches a single activity item by ID from the backend API.
   * Used internally by real-time subscription to get full item details.
   *
   * @param id - Activity item ID
   * @returns The activity item
   */
  getActivityItem: async (id: string): Promise<ActivityItem> => {
    const response = await apiClient.get<BackendActivityItemByIdResponse>(`/activity/${id}`);
    return mapActivityItem(response);
  },

  /**
   * Subscribes to real-time activity feed updates using Supabase.
   * This uses Supabase real-time subscriptions to listen for new activity items.
   * When a new item is detected, the full item details are fetched from the backend API.
   *
   * @param callback - Called when a new activity item is received
   * @param onError - Optional callback for error handling (errors are also logged to console)
   * @returns A function to unsubscribe from the feed
   */
  subscribeToFeed: (callback: (item: ActivityItem) => void, onError?: (error: Error) => void) => {
    const subscription = supabase
      .channel('activity_feed_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
        },
        async (payload) => {
          try {
            // Fetch the full item with user details from the backend API
            const item = await activityApi.getActivityItem(payload.new.id as string);
            callback(item);
          } catch (error) {
            const wrappedError = error instanceof Error
              ? error
              : new Error('Unknown error in activity feed subscription');
            console.error('[activityApi] Real-time subscription error:', wrappedError.message);
            onError?.(wrappedError);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },
};
