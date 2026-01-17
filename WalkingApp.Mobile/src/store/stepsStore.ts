import { create } from 'zustand';
import { stepsApi } from '@services/api/stepsApi';

export interface StepEntry {
  id: string;
  user_id: string;
  date: string;
  steps: number;
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

interface StepsState {
  todaySteps: number;
  stats: StepStats | null;
  history: StepEntry[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addSteps: (steps: number, distanceMeters: number) => Promise<void>;
  fetchTodaySteps: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchHistory: (period: 'daily' | 'weekly' | 'monthly') => Promise<void>;
}

export const useStepsStore = create<StepsState>((set) => ({
  todaySteps: 0,
  stats: null,
  history: [],
  isLoading: false,
  error: null,

  addSteps: async (steps, distanceMeters) => {
    set({ isLoading: true, error: null });
    try {
      await stepsApi.addSteps(steps, distanceMeters);
      const today = await stepsApi.getTodaySteps();
      set({ todaySteps: today.steps, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchTodaySteps: async () => {
    set({ isLoading: true, error: null });
    try {
      const today = await stepsApi.getTodaySteps();
      set({ todaySteps: today.steps, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await stepsApi.getStats();
      set({ stats, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchHistory: async (period) => {
    set({ isLoading: true, error: null });
    try {
      const history = await stepsApi.getHistory(period);
      set({ history, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
