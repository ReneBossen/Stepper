import { create } from 'zustand';
import { activityApi, ActivityItem, GetFeedParams } from '@services/api/activityApi';
import { getErrorMessage } from '@utils/errorUtils';

interface ActivityState {
  feed: ActivityItem[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchFeed: (params?: GetFeedParams) => Promise<void>;
  loadMore: () => Promise<void>;
  addActivityItem: (item: ActivityItem) => void;
  clearFeed: () => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  feed: [],
  totalCount: 0,
  hasMore: false,
  isLoading: false,
  error: null,

  fetchFeed: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await activityApi.getFeed(params);
      set({
        feed: response.items,
        totalCount: response.totalCount,
        hasMore: response.hasMore,
        isLoading: false,
      });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  loadMore: async () => {
    const { feed, hasMore, isLoading } = get();
    if (!hasMore || isLoading) return;

    set({ isLoading: true, error: null });
    try {
      const response = await activityApi.getFeed({ offset: feed.length });
      set({
        feed: [...feed, ...response.items],
        totalCount: response.totalCount,
        hasMore: response.hasMore,
        isLoading: false,
      });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  addActivityItem: (item) => {
    const currentFeed = get().feed;
    // Add to beginning and avoid duplicates
    if (!currentFeed.some((existing) => existing.id === item.id)) {
      set({ feed: [item, ...currentFeed] });
    }
  },

  clearFeed: () => {
    set({ feed: [], totalCount: 0, hasMore: false, isLoading: false, error: null });
  },
}));

// Re-export ActivityItem type for convenience
export type { ActivityItem };
