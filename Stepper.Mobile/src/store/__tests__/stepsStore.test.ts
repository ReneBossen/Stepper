import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useStepsStore, StepStats, DailyStepEntry } from '../stepsStore';
import { stepsApi, StepEntry, DailyStepsResponse, StepHistoryResponse } from '@services/api/stepsApi';

// Mock the steps API
jest.mock('@services/api/stepsApi');

const mockStepsApi = stepsApi as jest.Mocked<typeof stepsApi>;

describe('stepsStore', () => {
  const mockStepEntry: StepEntry = {
    id: '123',
    stepCount: 8500,
    distanceMeters: 6800,
    date: '2024-01-15',
    recordedAt: '2024-01-15T10:00:00Z',
    source: null,
  };

  const mockTodayResponse: DailyStepsResponse = {
    date: '2024-01-15',
    totalSteps: 8500,
    totalDistanceMeters: 6800,
  };

  const mockStats: StepStats = {
    todaySteps: 8500,
    todayDistance: 6800,
    weekSteps: 52000,
    weekDistance: 41600,
    monthSteps: 220000,
    monthDistance: 176000,
    currentStreak: 5,
    longestStreak: 14,
    dailyGoal: 10000,
  };

  const mockDailyHistory: DailyStepEntry[] = [
    { date: '2024-01-15', steps: 8500, distanceMeters: 6800 },
    { date: '2024-01-14', steps: 9200, distanceMeters: 7360 },
    { date: '2024-01-13', steps: 7800, distanceMeters: 6240 },
  ];

  const mockDailySummaries: DailyStepsResponse[] = [
    { date: '2024-01-15', totalSteps: 8500, totalDistanceMeters: 6800 },
    { date: '2024-01-14', totalSteps: 9200, totalDistanceMeters: 7360 },
    { date: '2024-01-13', totalSteps: 7800, totalDistanceMeters: 6240 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    useStepsStore.setState({
      todaySteps: 0,
      todayDistance: 0,
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
      expect(result.current.todayDistance).toBe(0);
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
      const updatedTodayResponse: DailyStepsResponse = {
        date: '2024-01-15',
        totalSteps: 10000,
        totalDistanceMeters: 8000,
      };

      mockStepsApi.addSteps.mockResolvedValue(mockStepEntry);
      mockStepsApi.getTodaySteps.mockResolvedValue(updatedTodayResponse);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.addSteps(1500, 1200);
      });

      expect(mockStepsApi.addSteps).toHaveBeenCalledWith(
        expect.objectContaining({
          stepCount: 1500,
          distanceMeters: 1200,
          date: expect.any(String),
        })
      );
      expect(mockStepsApi.getTodaySteps).toHaveBeenCalled();
      expect(result.current.todaySteps).toBe(10000);
      expect(result.current.todayDistance).toBe(8000);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during add steps', async () => {
      mockStepsApi.addSteps.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockStepEntry), 100))
      );
      mockStepsApi.getTodaySteps.mockResolvedValue(mockTodayResponse);

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
      mockStepsApi.getTodaySteps.mockResolvedValue(mockTodayResponse);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.addSteps(0, 0);
      });

      expect(mockStepsApi.addSteps).toHaveBeenCalledWith(
        expect.objectContaining({
          stepCount: 0,
          distanceMeters: 0,
        })
      );
    });

    it('should clear previous errors on new add', async () => {
      mockStepsApi.addSteps.mockResolvedValue(mockStepEntry);
      mockStepsApi.getTodaySteps.mockResolvedValue(mockTodayResponse);

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
      mockStepsApi.getTodaySteps.mockResolvedValue(mockTodayResponse);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchTodaySteps();
      });

      expect(mockStepsApi.getTodaySteps).toHaveBeenCalled();
      expect(result.current.todaySteps).toBe(8500);
      expect(result.current.todayDistance).toBe(6800);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle zero steps for today', async () => {
      const zeroResponse: DailyStepsResponse = {
        date: '2024-01-15',
        totalSteps: 0,
        totalDistanceMeters: 0,
      };
      mockStepsApi.getTodaySteps.mockResolvedValue(zeroResponse);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchTodaySteps();
      });

      expect(result.current.todaySteps).toBe(0);
      expect(result.current.todayDistance).toBe(0);
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
        new Promise((resolve) => setTimeout(() => resolve(mockTodayResponse), 100))
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
        todaySteps: 0,
        todayDistance: 0,
        weekSteps: 0,
        weekDistance: 0,
        monthSteps: 0,
        monthDistance: 0,
        currentStreak: 0,
        longestStreak: 0,
        dailyGoal: 10000,
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

      useStepsStore.setState({ todaySteps: 5000, todayDistance: 4000 });

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(result.current.todaySteps).toBe(5000);
      expect(result.current.todayDistance).toBe(4000);
      expect(result.current.stats).toEqual(mockStats);
    });
  });

  describe('fetchHistory', () => {
    const mockHistoryResponse: StepHistoryResponse = {
      items: [
        { ...mockStepEntry, id: '1', date: '2024-01-15', stepCount: 8500 },
        { ...mockStepEntry, id: '2', date: '2024-01-14', stepCount: 9200 },
        { ...mockStepEntry, id: '3', date: '2024-01-13', stepCount: 7800 },
      ],
      totalCount: 3,
      page: 1,
      pageSize: 50,
    };

    it('should fetch daily history successfully', async () => {
      mockStepsApi.getHistory.mockResolvedValue(mockHistoryResponse);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchHistory('daily');
      });

      expect(mockStepsApi.getHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String),
        })
      );
      expect(result.current.history).toEqual(mockHistoryResponse.items);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should fetch weekly history successfully', async () => {
      mockStepsApi.getHistory.mockResolvedValue(mockHistoryResponse);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchHistory('weekly');
      });

      expect(mockStepsApi.getHistory).toHaveBeenCalled();
      expect(result.current.history).toEqual(mockHistoryResponse.items);
    });

    it('should fetch monthly history successfully', async () => {
      mockStepsApi.getHistory.mockResolvedValue(mockHistoryResponse);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchHistory('monthly');
      });

      expect(mockStepsApi.getHistory).toHaveBeenCalled();
      expect(result.current.history).toEqual(mockHistoryResponse.items);
    });

    it('should handle empty history', async () => {
      const emptyResponse: StepHistoryResponse = {
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 50,
      };
      mockStepsApi.getHistory.mockResolvedValue(emptyResponse);

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
      const oldHistory: StepEntry[] = [{ ...mockStepEntry, id: 'old' }];
      const newResponse: StepHistoryResponse = {
        items: [{ ...mockStepEntry, id: 'new' }],
        totalCount: 1,
        page: 1,
        pageSize: 50,
      };

      mockStepsApi.getHistory.mockResolvedValue(newResponse);

      const { result } = renderHook(() => useStepsStore());

      useStepsStore.setState({ history: oldHistory });

      await act(async () => {
        await result.current.fetchHistory('daily');
      });

      expect(result.current.history).toEqual(newResponse.items);
      expect(result.current.history).not.toContainEqual(oldHistory[0]);
    });

    it('should set loading state during history fetch', async () => {
      mockStepsApi.getHistory.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockHistoryResponse), 100))
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
      mockStepsApi.getDailyHistory.mockResolvedValue(mockDailySummaries);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchDailyHistory('2024-01-09', '2024-01-15');
      });

      expect(mockStepsApi.getDailyHistory).toHaveBeenCalledWith({
        startDate: '2024-01-09',
        endDate: '2024-01-15',
      });
      expect(result.current.dailyHistory).toEqual(mockDailyHistory);
      expect(result.current.isHistoryLoading).toBe(false);
      expect(result.current.historyError).toBeNull();
    });

    it('should set isHistoryLoading state during fetch', async () => {
      mockStepsApi.getDailyHistory.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockDailySummaries), 100))
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
      mockStepsApi.getDailyHistory.mockResolvedValue(mockDailySummaries);

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
      const newSummaries: DailyStepsResponse[] = [
        { date: '2024-01-15', totalSteps: 8000, totalDistanceMeters: 6400 },
      ];

      mockStepsApi.getDailyHistory.mockResolvedValue(newSummaries);

      const { result } = renderHook(() => useStepsStore());

      useStepsStore.setState({ dailyHistory: oldHistory });

      await act(async () => {
        await result.current.fetchDailyHistory('2024-01-09', '2024-01-15');
      });

      expect(result.current.dailyHistory).toEqual([
        { date: '2024-01-15', steps: 8000, distanceMeters: 6400 },
      ]);
      expect(result.current.dailyHistory).not.toContainEqual(oldHistory[0]);
    });

    it('should not affect main isLoading state', async () => {
      mockStepsApi.getDailyHistory.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockDailySummaries), 100))
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
      mockStepsApi.getDailyHistory.mockResolvedValue(mockDailySummaries);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchDailyHistory('2024-01-01', '2024-01-31');
      });

      expect(mockStepsApi.getDailyHistory).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });

    it('should handle single day range', async () => {
      const singleDaySummary: DailyStepsResponse[] = [
        { date: '2024-01-15', totalSteps: 10000, totalDistanceMeters: 8000 },
      ];
      mockStepsApi.getDailyHistory.mockResolvedValue(singleDaySummary);

      const { result } = renderHook(() => useStepsStore());

      await act(async () => {
        await result.current.fetchDailyHistory('2024-01-15', '2024-01-15');
      });

      expect(result.current.dailyHistory).toEqual([
        { date: '2024-01-15', steps: 10000, distanceMeters: 8000 },
      ]);
    });
  });
});
