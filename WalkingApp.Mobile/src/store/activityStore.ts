import { create } from 'zustand';
import { activityApi, ActivityItem } from '@services/api/activityApi';

interface ActivityState {
  feed: ActivityItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchFeed: (limit?: number) => Promise<void>;
  addActivityItem: (item: ActivityItem) => void;
  clearFeed: () => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  feed: [],
  isLoading: false,
  error: null,

  fetchFeed: async (limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const feed = await activityApi.getFeed(limit);
      set({ feed, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
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
    set({ feed: [], isLoading: false, error: null });
  },
}));

// Re-export ActivityItem type for convenience
export type { ActivityItem };
