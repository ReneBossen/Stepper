import { create } from 'zustand';
import { stepsApi } from '@services/api/stepsApi';
import { getErrorMessage } from '@utils/errorUtils';

export interface StepEntry {
  id: string;
  user_id: string;
  date: string;
  step_count: number;
  distance_meters: number;
  created_at: string;
}

export interface StepStats {
  today: number;
  week: number;
  month: number;
  average: number;
  streak: number;
}

/**
 * Represents a daily step entry for history display.
 */
export interface DailyStepEntry {
  id: string;
  date: string;
  steps: number;
  distanceMeters: number;
}

interface StepsState {
  todaySteps: number;
  stats: StepStats | null;
  history: StepEntry[];
  dailyHistory: DailyStepEntry[];
  isLoading: boolean;
  isHistoryLoading: boolean;
  error: string | null;
  historyError: string | null;

  // Actions
  addSteps: (steps: number, distanceMeters: number) => Promise<void>;
  fetchTodaySteps: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchHistory: (period: 'daily' | 'weekly' | 'monthly') => Promise<void>;
  fetchDailyHistory: (startDate: string, endDate: string) => Promise<void>;
}

export const useStepsStore = create<StepsState>((set) => ({
  todaySteps: 0,
  stats: null,
  history: [],
  dailyHistory: [],
  isLoading: false,
  isHistoryLoading: false,
  error: null,
  historyError: null,

  addSteps: async (steps, distanceMeters) => {
    set({ isLoading: true, error: null });
    try {
      await stepsApi.addSteps(steps, distanceMeters);
      const today = await stepsApi.getTodaySteps();
      set({ todaySteps: today.step_count, isLoading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  fetchTodaySteps: async () => {
    set({ isLoading: true, error: null });
    try {
      const today = await stepsApi.getTodaySteps();
      set({ todaySteps: today.step_count, isLoading: false });
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
      const history = await stepsApi.getHistory(period);
      set({ history, isLoading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  fetchDailyHistory: async (startDate, endDate) => {
    set({ isHistoryLoading: true, historyError: null });
    try {
      const dailyHistory = await stepsApi.getDailyHistory(startDate, endDate);
      set({ dailyHistory, isHistoryLoading: false });
    } catch (error: unknown) {
      set({ historyError: getErrorMessage(error), isHistoryLoading: false });
    }
  },
}));
