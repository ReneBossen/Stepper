import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useStepsStore, StepEntry, StepStats, DailyStepEntry } from '../stepsStore';
import { stepsApi } from '@services/api/stepsApi';

// Mock the steps API
jest.mock('@services/api/stepsApi');

const mockStepsApi = stepsApi as jest.Mocked<typeof stepsApi>;

describe('stepsStore', () => {
  const mockStepEntry: StepEntry = {
    id: '123',
    user_id: 'user-123',
    date: '2024-01-15',
    step_count: 8500,
    distance_meters: 6800,
    created_at: '2024-01-15T10:00:00Z',
  };

  const mockStats: StepStats = {
    today: 8500,
    week: 52000,
    month: 220000,
    average: 7333,
    streak: 5,
  };

  const mockDailyHistory: DailyStepEntry[] = [
    { id: '1', date: '2024-01-15', steps: 8500, distanceMeters: 6800 },
    { id: '2', date: '2024-01-14', steps: 9200, distanceMeters: 7360 },
    { id: '3', date: '2024-01-13', steps: 7800, distanceMeters: 6240 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    useStepsStore.setState({
      todaySteps: 0,
      stats: null,
      history: [],
      dailyHistory: [],
      isLoading: false,
      isHistoryLoading: false,
      error: null,
      historyError: null,
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useStepsStore());

      expect(result.current.todaySteps).toBe(0);
      expect(result.current.stats).toBeNull();
      expect(result.current.history).toEqual([]);
      expect(result.current.dailyHistory).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isHistoryLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.historyError).toBeNull();
    });
  });

  describe('addSteps', () => {
    it('should add steps successfully and update today steps', async () => {
      const updatedEntry = { ...mockStepEntry, step_count: 10000 };

      mockStepsApi.addSteps.mockResolvedValue(mockStepEntry);
      mockStepsApi.getTodaySteps.mockResolvedValue(updatedEntry);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.addSteps(1500, 1200);
      });

      expect(mockStepsApi.addSteps).toHaveBeenCalledWith(1500, 1200);
      expect(mockStepsApi.getTodaySteps).toHaveBeenCalled();
      expect(result.current.todaySteps).toBe(10000);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during add steps', async () => {
      mockStepsApi.addSteps.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockStepEntry), 100))
      );
      mockStepsApi.getTodaySteps.mockResolvedValue(mockStepEntry);

      const { result } = renderHook(() => useStepsStore());

      act(() => {
        result.current.addSteps(1000, 800);
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle add steps error', async () => {
      const error = new Error('Failed to add steps');
      mockStepsApi.addSteps.mockRejectedValue(error);

      const { result } = renderHook(() => useStepsStore());

      await expect(
        act(async () => {
          await result.current.addSteps(1000, 800);
        })
      ).rejects.toThrow('Failed to add steps');

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to add steps');
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle zero steps', async () => {
      mockStepsApi.addSteps.mockResolvedValue(mockStepEntry);
      mockStepsApi.getTodaySteps.mockResolvedValue(mockStepEntry);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.addSteps(0, 0);
      });

      expect(mockStepsApi.addSteps).toHaveBeenCalledWith(0, 0);
    });

    it('should clear previous errors on new add', async () => {
      mockStepsApi.addSteps.mockResolvedValue(mockStepEntry);
      mockStepsApi.getTodaySteps.mockResolvedValue(mockStepEntry);

      const { result } = renderHook(() => useStepsStore());

      useStepsStore.setState({ error: 'Previous error' });

      await act(async () => {
        await result.current.addSteps(1000, 800);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('fetchTodaySteps', () => {
    it('should fetch today steps successfully', async () => {
      mockStepsApi.getTodaySteps.mockResolvedValue(mockStepEntry);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchTodaySteps();
      });

      expect(mockStepsApi.getTodaySteps).toHaveBeenCalled();
      expect(result.current.todaySteps).toBe(8500);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle zero steps for today', async () => {
      const zeroEntry = { ...mockStepEntry, step_count: 0 };
      mockStepsApi.getTodaySteps.mockResolvedValue(zeroEntry);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchTodaySteps();
      });

      expect(result.current.todaySteps).toBe(0);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Network error');
      mockStepsApi.getTodaySteps.mockRejectedValue(error);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchTodaySteps();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      mockStepsApi.getTodaySteps.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockStepEntry), 100))
      );

      const { result } = renderHook(() => useStepsStore());

      act(() => {
        result.current.fetchTodaySteps();
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('fetchStats', () => {
    it('should fetch stats successfully', async () => {
      mockStepsApi.getStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(mockStepsApi.getStats).toHaveBeenCalled();
      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle stats with all zeros', async () => {
      const zeroStats: StepStats = {
        today: 0,
        week: 0,
        month: 0,
        average: 0,
        streak: 0,
      };
      mockStepsApi.getStats.mockResolvedValue(zeroStats);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(result.current.stats).toEqual(zeroStats);
    });

    it('should handle fetch stats error', async () => {
      const error = new Error('Stats unavailable');
      mockStepsApi.getStats.mockRejectedValue(error);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchStats();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Stats unavailable');
      });
      expect(result.current.stats).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should update stats without affecting today steps', async () => {
      mockStepsApi.getStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useStepsStore());

      useStepsStore.setState({ todaySteps: 5000 });

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(result.current.todaySteps).toBe(5000);
      expect(result.current.stats).toEqual(mockStats);
    });
  });

  describe('fetchHistory', () => {
    const mockHistory: StepEntry[] = [
      { ...mockStepEntry, id: '1', date: '2024-01-15', step_count: 8500 },
      { ...mockStepEntry, id: '2', date: '2024-01-14', step_count: 9200 },
      { ...mockStepEntry, id: '3', date: '2024-01-13', step_count: 7800 },
    ];

    it('should fetch daily history successfully', async () => {
      mockStepsApi.getHistory.mockResolvedValue(mockHistory);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchHistory('daily');
      });

      expect(mockStepsApi.getHistory).toHaveBeenCalledWith('daily');
      expect(result.current.history).toEqual(mockHistory);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should fetch weekly history successfully', async () => {
      mockStepsApi.getHistory.mockResolvedValue(mockHistory);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchHistory('weekly');
      });

      expect(mockStepsApi.getHistory).toHaveBeenCalledWith('weekly');
      expect(result.current.history).toEqual(mockHistory);
    });

    it('should fetch monthly history successfully', async () => {
      mockStepsApi.getHistory.mockResolvedValue(mockHistory);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchHistory('monthly');
      });

      expect(mockStepsApi.getHistory).toHaveBeenCalledWith('monthly');
      expect(result.current.history).toEqual(mockHistory);
    });

    it('should handle empty history', async () => {
      mockStepsApi.getHistory.mockResolvedValue([]);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchHistory('daily');
      });

      expect(result.current.history).toEqual([]);
    });

    it('should handle fetch history error', async () => {
      const error = new Error('History unavailable');
      mockStepsApi.getHistory.mockRejectedValue(error);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchHistory('weekly');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('History unavailable');
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should replace previous history on new fetch', async () => {
      const oldHistory = [{ ...mockStepEntry, id: 'old' }];
      const newHistory = [{ ...mockStepEntry, id: 'new' }];

      mockStepsApi.getHistory.mockResolvedValue(newHistory);

      const { result } = renderHook(() => useStepsStore());

      useStepsStore.setState({ history: oldHistory });

      await act(async () => {
        await result.current.fetchHistory('daily');
      });

      expect(result.current.history).toEqual(newHistory);
      expect(result.current.history).not.toContainEqual(oldHistory[0]);
    });

    it('should set loading state during history fetch', async () => {
      mockStepsApi.getHistory.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockHistory), 100))
      );

      const { result } = renderHook(() => useStepsStore());

      act(() => {
        result.current.fetchHistory('monthly');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('fetchDailyHistory', () => {
    it('should fetch daily history successfully', async () => {
      mockStepsApi.getDailyHistory.mockResolvedValue(mockDailyHistory);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchDailyHistory('2024-01-09', '2024-01-15');
      });

      expect(mockStepsApi.getDailyHistory).toHaveBeenCalledWith('2024-01-09', '2024-01-15');
      expect(result.current.dailyHistory).toEqual(mockDailyHistory);
      expect(result.current.isHistoryLoading).toBe(false);
      expect(result.current.historyError).toBeNull();
    });

    it('should set isHistoryLoading state during fetch', async () => {
      mockStepsApi.getDailyHistory.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockDailyHistory), 100))
      );

      const { result } = renderHook(() => useStepsStore());

      act(() => {
        result.current.fetchDailyHistory('2024-01-09', '2024-01-15');
      });

      expect(result.current.isHistoryLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isHistoryLoading).toBe(false);
      });
    });

    it('should handle empty daily history', async () => {
      mockStepsApi.getDailyHistory.mockResolvedValue([]);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchDailyHistory('2024-01-09', '2024-01-15');
      });

      expect(result.current.dailyHistory).toEqual([]);
      expect(result.current.isHistoryLoading).toBe(false);
    });

    it('should handle fetch daily history error', async () => {
      const error = new Error('Daily history unavailable');
      mockStepsApi.getDailyHistory.mockRejectedValue(error);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchDailyHistory('2024-01-09', '2024-01-15');
      });

      await waitFor(() => {
        expect(result.current.historyError).toBe('Daily history unavailable');
      });
      expect(result.current.isHistoryLoading).toBe(false);
    });

    it('should clear previous historyError on new fetch', async () => {
      mockStepsApi.getDailyHistory.mockResolvedValue(mockDailyHistory);

      const { result } = renderHook(() => useStepsStore());

      useStepsStore.setState({ historyError: 'Previous error' });

      await act(async () => {
        await result.current.fetchDailyHistory('2024-01-09', '2024-01-15');
      });

      expect(result.current.historyError).toBeNull();
    });

    it('should replace previous dailyHistory on new fetch', async () => {
      const oldHistory: DailyStepEntry[] = [
        { id: 'old', date: '2024-01-01', steps: 1000, distanceMeters: 800 },
      ];
      const newHistory: DailyStepEntry[] = [
        { id: 'new', date: '2024-01-15', steps: 8000, distanceMeters: 6400 },
      ];

      mockStepsApi.getDailyHistory.mockResolvedValue(newHistory);

      const { result } = renderHook(() => useStepsStore());

      useStepsStore.setState({ dailyHistory: oldHistory });

      await act(async () => {
        await result.current.fetchDailyHistory('2024-01-09', '2024-01-15');
      });

      expect(result.current.dailyHistory).toEqual(newHistory);
      expect(result.current.dailyHistory).not.toContainEqual(oldHistory[0]);
    });

    it('should not affect main isLoading state', async () => {
      mockStepsApi.getDailyHistory.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockDailyHistory), 100))
      );

      const { result } = renderHook(() => useStepsStore());

      act(() => {
        result.current.fetchDailyHistory('2024-01-09', '2024-01-15');
      });

      // isHistoryLoading should be true but isLoading should remain false
      expect(result.current.isHistoryLoading).toBe(true);
      expect(result.current.isLoading).toBe(false);

      await waitFor(() => {
        expect(result.current.isHistoryLoading).toBe(false);
      });
    });

    it('should not affect main error state', async () => {
      const error = new Error('Daily history error');
      mockStepsApi.getDailyHistory.mockRejectedValue(error);

      const { result } = renderHook(() => useStepsStore());

      useStepsStore.setState({ error: null });

      await act(async () => {
        await result.current.fetchDailyHistory('2024-01-09', '2024-01-15');
      });

      // historyError should be set but error should remain null
      expect(result.current.historyError).toBe('Daily history error');
      expect(result.current.error).toBeNull();
    });

    it('should handle different date ranges', async () => {
      mockStepsApi.getDailyHistory.mockResolvedValue(mockDailyHistory);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchDailyHistory('2024-01-01', '2024-01-31');
      });

      expect(mockStepsApi.getDailyHistory).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
    });

    it('should handle single day range', async () => {
      const singleDayHistory: DailyStepEntry[] = [
        { id: '1', date: '2024-01-15', steps: 10000, distanceMeters: 8000 },
      ];
      mockStepsApi.getDailyHistory.mockResolvedValue(singleDayHistory);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchDailyHistory('2024-01-15', '2024-01-15');
      });

      expect(result.current.dailyHistory).toEqual(singleDayHistory);
    });
  });
});
