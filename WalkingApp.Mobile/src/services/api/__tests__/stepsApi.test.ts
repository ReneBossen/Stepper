import {
  stepsApi,
  StepEntry,
  StepStats,
  DailyStepsResponse,
  StepHistoryResponse,
} from '../stepsApi';
import { apiClient } from '../client';

// Mock the apiClient
jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('stepsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addSteps', () => {
    it('should add steps successfully', async () => {
      const mockEntry: StepEntry = {
        id: '123',
        stepCount: 8500,
        distanceMeters: 6800,
        date: '2024-01-15',
        recordedAt: '2024-01-15T10:00:00Z',
        source: null,
      };

      mockApiClient.post.mockResolvedValue(mockEntry);

      const result = await stepsApi.addSteps({
        stepCount: 8500,
        distanceMeters: 6800,
        date: '2024-01-15',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/steps', {
        stepCount: 8500,
        distanceMeters: 6800,
        date: '2024-01-15',
      });
      expect(result).toEqual(mockEntry);
    });

    it('should add steps with source successfully', async () => {
      const mockEntry: StepEntry = {
        id: '123',
        stepCount: 5000,
        distanceMeters: 4000,
        date: '2024-01-15',
        recordedAt: '2024-01-15T10:00:00Z',
        source: 'health-app',
      };

      mockApiClient.post.mockResolvedValue(mockEntry);

      const result = await stepsApi.addSteps({
        stepCount: 5000,
        distanceMeters: 4000,
        date: '2024-01-15',
        source: 'health-app',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/steps', {
        stepCount: 5000,
        distanceMeters: 4000,
        date: '2024-01-15',
        source: 'health-app',
      });
      expect(result).toEqual(mockEntry);
    });

    it('should throw error when add steps fails', async () => {
      const mockError = new Error('Failed to add steps');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(
        stepsApi.addSteps({
          stepCount: 1000,
          distanceMeters: 800,
          date: '2024-01-15',
        })
      ).rejects.toThrow('Failed to add steps');
    });
  });

  describe('getTodaySteps', () => {
    it('should get today steps successfully', async () => {
      const mockResponse: DailyStepsResponse = {
        date: '2024-01-15',
        totalSteps: 8500,
        totalDistanceMeters: 6800,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await stepsApi.getTodaySteps();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/steps/today');
      expect(result).toEqual(mockResponse);
    });

    it('should return zero values when no steps recorded', async () => {
      const mockResponse: DailyStepsResponse = {
        date: '2024-01-15',
        totalSteps: 0,
        totalDistanceMeters: 0,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await stepsApi.getTodaySteps();

      expect(result.totalSteps).toBe(0);
      expect(result.totalDistanceMeters).toBe(0);
    });

    it('should throw error when fetch fails', async () => {
      const mockError = new Error('Failed to fetch today steps');
      mockApiClient.get.mockRejectedValue(mockError);

      await expect(stepsApi.getTodaySteps()).rejects.toThrow(
        'Failed to fetch today steps'
      );
    });
  });

  describe('getStats', () => {
    it('should get stats successfully', async () => {
      const mockStats: StepStats = {
        todaySteps: 8500,
        todayDistance: 6800,
        weekSteps: 60500,
        weekDistance: 48400,
        monthSteps: 255000,
        monthDistance: 204000,
        currentStreak: 5,
        longestStreak: 14,
        dailyGoal: 10000,
      };

      mockApiClient.get.mockResolvedValue(mockStats);

      const result = await stepsApi.getStats();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/steps/stats');
      expect(result).toEqual(mockStats);
    });

    it('should handle zero stats', async () => {
      const mockStats: StepStats = {
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

      mockApiClient.get.mockResolvedValue(mockStats);

      const result = await stepsApi.getStats();

      expect(result.todaySteps).toBe(0);
      expect(result.weekSteps).toBe(0);
      expect(result.monthSteps).toBe(0);
      expect(result.currentStreak).toBe(0);
    });

    it('should throw error when fetch stats fails', async () => {
      const mockError = new Error('Failed to fetch stats');
      mockApiClient.get.mockRejectedValue(mockError);

      await expect(stepsApi.getStats()).rejects.toThrow('Failed to fetch stats');
    });
  });

  describe('getHistory', () => {
    const mockHistory: StepEntry[] = [
      {
        id: '1',
        stepCount: 8500,
        distanceMeters: 6800,
        date: '2024-01-15',
        recordedAt: '2024-01-15T10:00:00Z',
        source: null,
      },
      {
        id: '2',
        stepCount: 9200,
        distanceMeters: 7360,
        date: '2024-01-14',
        recordedAt: '2024-01-14T10:00:00Z',
        source: null,
      },
    ];

    it('should fetch history with required params', async () => {
      const mockResponse: StepHistoryResponse = {
        items: mockHistory,
        totalCount: 2,
        page: 1,
        pageSize: 50,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await stepsApi.getHistory({
        startDate: '2024-01-01',
        endDate: '2024-01-15',
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/steps/history?startDate=2024-01-01&endDate=2024-01-15'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should fetch history with pagination params', async () => {
      const mockResponse: StepHistoryResponse = {
        items: mockHistory,
        totalCount: 100,
        page: 2,
        pageSize: 20,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await stepsApi.getHistory({
        startDate: '2024-01-01',
        endDate: '2024-01-15',
        page: 2,
        pageSize: 20,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/steps/history?startDate=2024-01-01&endDate=2024-01-15&page=2&pageSize=20'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty history', async () => {
      const mockResponse: StepHistoryResponse = {
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 50,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await stepsApi.getHistory({
        startDate: '2024-01-01',
        endDate: '2024-01-15',
      });

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should throw error when fetch history fails', async () => {
      const mockError = new Error('Failed to fetch history');
      mockApiClient.get.mockRejectedValue(mockError);

      await expect(
        stepsApi.getHistory({
          startDate: '2024-01-01',
          endDate: '2024-01-15',
        })
      ).rejects.toThrow('Failed to fetch history');
    });
  });

  describe('getDailyHistory', () => {
    const mockDailyHistory: DailyStepsResponse[] = [
      {
        date: '2024-01-15',
        totalSteps: 8500,
        totalDistanceMeters: 6800,
      },
      {
        date: '2024-01-14',
        totalSteps: 9200,
        totalDistanceMeters: 7360,
      },
    ];

    it('should fetch daily history successfully', async () => {
      mockApiClient.get.mockResolvedValue(mockDailyHistory);

      const result = await stepsApi.getDailyHistory({
        startDate: '2024-01-01',
        endDate: '2024-01-15',
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/steps/daily?startDate=2024-01-01&endDate=2024-01-15'
      );
      expect(result).toEqual(mockDailyHistory);
    });

    it('should handle empty daily history', async () => {
      mockApiClient.get.mockResolvedValue([]);

      const result = await stepsApi.getDailyHistory({
        startDate: '2024-01-01',
        endDate: '2024-01-15',
      });

      expect(result).toEqual([]);
    });

    it('should throw error when fetch daily history fails', async () => {
      const mockError = new Error('Failed to fetch daily history');
      mockApiClient.get.mockRejectedValue(mockError);

      await expect(
        stepsApi.getDailyHistory({
          startDate: '2024-01-01',
          endDate: '2024-01-15',
        })
      ).rejects.toThrow('Failed to fetch daily history');
    });
  });

  describe('getEntry', () => {
    it('should get a specific entry successfully', async () => {
      const mockEntry: StepEntry = {
        id: '123',
        stepCount: 8500,
        distanceMeters: 6800,
        date: '2024-01-15',
        recordedAt: '2024-01-15T10:00:00Z',
        source: null,
      };

      mockApiClient.get.mockResolvedValue(mockEntry);

      const result = await stepsApi.getEntry('123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/steps/123');
      expect(result).toEqual(mockEntry);
    });

    it('should throw error when entry not found', async () => {
      const mockError = new Error('Entry not found');
      mockApiClient.get.mockRejectedValue(mockError);

      await expect(stepsApi.getEntry('invalid-id')).rejects.toThrow(
        'Entry not found'
      );
    });
  });

  describe('deleteEntry', () => {
    it('should delete an entry successfully', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await stepsApi.deleteEntry('123');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/steps/123');
    });

    it('should throw error when delete fails', async () => {
      const mockError = new Error('Failed to delete entry');
      mockApiClient.delete.mockRejectedValue(mockError);

      await expect(stepsApi.deleteEntry('123')).rejects.toThrow(
        'Failed to delete entry'
      );
    });
  });
});
