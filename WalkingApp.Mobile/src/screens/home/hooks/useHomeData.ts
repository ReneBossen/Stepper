import { useEffect, useCallback, useState } from 'react';
import { useStepsStore } from '@store/stepsStore';
import { useUserStore } from '@store/userStore';
import { useActivityStore, ActivityItem } from '@store/activityStore';
import { useNotificationsStore } from '@store/notificationsStore';
import { activityApi } from '@services/api/activityApi';
import { supabase } from '@services/supabase';

interface UseHomeDataReturn {
  // Step data
  todaySteps: number;
  todayDistance: number;
  dailyGoal: number;
  streak: number;
  weeklyAverage: number;
  weeklyTotal: number;

  // User data
  displayName: string;
  units: 'metric' | 'imperial';

  // Activity feed
  activityFeed: ActivityItem[];
  activityError: string | null;

  // Notifications
  unreadCount: number;

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
}

/**
 * Custom hook that fetches and manages all data needed for the home screen.
 * Handles loading states, error handling, and real-time updates.
 */
export const useHomeData = (): UseHomeDataReturn => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Steps store
  const {
    todaySteps,
    stats,
    isLoading: stepsLoading,
    error: stepsError,
    fetchTodaySteps,
    fetchStats,
  } = useStepsStore();

  // User store
  const { currentUser, fetchCurrentUser } = useUserStore();

  // Activity store
  const {
    feed: activityFeed,
    isLoading: activityLoading,
    error: activityError,
    fetchFeed,
    addActivityItem,
  } = useActivityStore();

  // Notifications store
  const { unreadCount, fetchUnreadCount } = useNotificationsStore();

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    const fetchPromises: Promise<void>[] = [
      fetchTodaySteps(),
      fetchStats(),
      fetchFeed(10),
      fetchUnreadCount(),
    ];

    // Only fetch current user if not already loaded
    if (!currentUser) {
      fetchPromises.push(fetchCurrentUser());
    }

    await Promise.all(fetchPromises);
  }, [fetchTodaySteps, fetchStats, fetchFeed, fetchUnreadCount, currentUser, fetchCurrentUser]);

  // Refresh handler for pull-to-refresh
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchAllData();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchAllData]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Subscribe to real-time step updates
  useEffect(() => {
    const channel = supabase
      .channel('step_entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'step_entries',
        },
        () => {
          // Refetch today's steps when changes occur
          fetchTodaySteps();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchTodaySteps, fetchStats]);

  // Subscribe to real-time activity feed updates
  useEffect(() => {
    const unsubscribe = activityApi.subscribeToFeed((item) => {
      addActivityItem(item);
    });

    return () => {
      unsubscribe();
    };
  }, [addActivityItem]);

  // Derived values
  // Only steps loading is critical for the main dashboard display
  const isLoading = stepsLoading;
  // Only steps error should block the main dashboard - activity errors are non-critical
  const error = stepsError;

  // User preferences with defaults
  const dailyGoal = currentUser?.preferences?.daily_step_goal ?? 10000;
  const units = currentUser?.preferences?.units ?? 'metric';
  const displayName = currentUser?.display_name ?? 'User';

  // Use today's distance from stats (backend provides this)
  const todayDistance = stats?.todayDistance ?? 0;

  // Weekly stats
  const weeklyTotal = stats?.weekSteps ?? 0;
  const weeklyAverage = weeklyTotal > 0 ? Math.round(weeklyTotal / 7) : 0;

  // Streak
  const streak = stats?.currentStreak ?? 0;

  return {
    todaySteps,
    todayDistance,
    dailyGoal,
    streak,
    weeklyAverage,
    weeklyTotal,
    displayName,
    units,
    activityFeed,
    activityError,
    unreadCount,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
};
