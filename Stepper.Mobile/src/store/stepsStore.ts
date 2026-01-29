import { create } from 'zustand';
import {
  stepsApi,
  StepEntry,
  StepStats,
  DailyStepsResponse,
  RecordStepsRequest,
} from '@services/api/stepsApi';
import { getErrorMessage } from '@utils/errorUtils';

// Re-export types for consumers
export type { StepEntry, StepStats, DailyStepsResponse, RecordStepsRequest };

/**
 * Represents a daily step entry for history display.
 * This is a simpler view model for UI display purposes.
 */
export interface DailyStepEntry {
  id?: string;
  date: string;
  steps: number;
  distanceMeters: number;
}

interface StepsState {
  todaySteps: number;
  todayDistance: number;
  stats: StepStats | null;
  history: StepEntry[];
  dailyHistory: DailyStepEntry[];
  isLoading: boolean;
  isHistoryLoading: boolean;
  error: string | null;
  historyError: string | null;

  // Sync-related state
  isSyncing: boolean;
  syncError: string | null;
  lastSyncTimestamp: string | null;

  // Actions
  addSteps: (steps: number, distanceMeters: number, source?: string) => Promise<void>;
  fetchTodaySteps: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchHistory: (period: 'daily' | 'weekly' | 'monthly') => Promise<void>;
  fetchDailyHistory: (startDate: string, endDate: string) => Promise<void>;

  // Sync-related actions
  setSyncing: (syncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  setLastSyncTimestamp: (timestamp: string | null) => void;
  refreshAfterSync: () => Promise<void>;
}

/**
 * Calculates the start date for a given period relative to today.
 *
 * @param period - The time period ('daily', 'weekly', or 'monthly')
 * @returns The start date in YYYY-MM-DD format
 */
function getStartDateForPeriod(period: 'daily' | 'weekly' | 'monthly'): string {
  const daysAgo = period === 'monthly' ? 30 : 7;
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

/**
 * Gets today's date in YYYY-MM-DD format.
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export const useStepsStore = create<StepsState>((set, get) => ({
  todaySteps: 0,
  todayDistance: 0,
  stats: null,
  history: [],
  dailyHistory: [],
  isLoading: false,
  isHistoryLoading: false,
  error: null,
  historyError: null,

  // Sync-related state
  isSyncing: false,
  syncError: null,
  lastSyncTimestamp: null,

  addSteps: async (steps, distanceMeters, source) => {
    set({ isLoading: true, error: null });
    try {
      const request: RecordStepsRequest = {
        stepCount: steps,
        distanceMeters,
        date: getTodayString(),
        source,
      };
      await stepsApi.addSteps(request);
      const today = await stepsApi.getTodaySteps();
      set({
        todaySteps: today.totalSteps,
        todayDistance: today.totalDistanceMeters,
        isLoading: false,
      });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  fetchTodaySteps: async () => {
    set({ isLoading: true, error: null });
    try {
      const today = await stepsApi.getTodaySteps();
      set({
        todaySteps: today.totalSteps,
        todayDistance: today.totalDistanceMeters,
        isLoading: false,
      });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await stepsApi.getStats();
      set({ stats, isLoading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  fetchHistory: async (period) => {
    set({ isLoading: true, error: null });
    try {
      const startDate = getStartDateForPeriod(period);
      const endDate = getTodayString();
      const response = await stepsApi.getHistory({ startDate, endDate });
      set({ history: response.items, isLoading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  fetchDailyHistory: async (startDate, endDate) => {
    set({ isHistoryLoading: true, historyError: null });
    try {
      const dailySummaries = await stepsApi.getDailyHistory({ startDate, endDate });
      // Transform to DailyStepEntry format for UI
      const dailyHistory: DailyStepEntry[] = dailySummaries.map((summary) => ({
        date: summary.date,
        steps: summary.totalSteps,
        distanceMeters: summary.totalDistanceMeters,
      }));
      set({ dailyHistory, isHistoryLoading: false });
    } catch (error: unknown) {
      set({ historyError: getErrorMessage(error), isHistoryLoading: false });
    }
  },

  // Sync-related actions
  setSyncing: (syncing) => set({ isSyncing: syncing }),

  setSyncError: (error) => set({ syncError: error }),

  setLastSyncTimestamp: (timestamp) => set({ lastSyncTimestamp: timestamp }),

  refreshAfterSync: async () => {
    // Refresh today's steps and stats after a sync operation
    const { fetchTodaySteps, fetchStats } = get();
    await Promise.all([fetchTodaySteps(), fetchStats()]);
  },
}));
