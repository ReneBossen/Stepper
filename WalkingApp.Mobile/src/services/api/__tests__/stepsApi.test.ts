import { stepsApi } from '../stepsApi';
import { supabase } from '@services/supabase';
import { StepEntry, StepStats } from '@store/stepsStore';

// Mock the supabase client
jest.mock('@services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('stepsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addSteps', () => {
    it('should add steps for today successfully', async () => {
      const mockEntry: StepEntry = {
        id: '123',
        user_id: 'user-123',
        date: '2024-01-15',
        steps: 8500,
        distance_meters: 6800,
        created_at: '2024-01-15T10:00:00Z',
      };

      const mockUpsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockEntry,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: mockUpsert,
        select: mockSelect,
        single: mockSingle,
      });

      mockUpsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const result = await stepsApi.addSteps(8500, 6800);

      expect(mockSupabase.from).toHaveBeenCalledWith('step_entries');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          steps: 8500,
          distance_meters: 6800,
          date: expect.any(String),
        })
      );
      expect(result).toEqual(mockEntry);
    });

    it('should use today date for upsert', async () => {
      const today = new Date('2024-01-15T12:00:00Z');
      const dateSpy = jest.spyOn(global, 'Date').mockImplementation(() => today as any);

      const mockUpsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: {} as StepEntry,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: mockUpsert,
        select: mockSelect,
        single: mockSingle,
      });

      mockUpsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      await stepsApi.addSteps(1000, 800);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          date: '2024-01-15',
        })
      );

      dateSpy.mockRestore();
    });

    it('should throw error when add steps fails', async () => {
      const mockError = { message: 'Insert failed' };

      const mockUpsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: mockUpsert,
        select: mockSelect,
        single: mockSingle,
      });

      mockUpsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      await expect(stepsApi.addSteps(1000, 800)).rejects.toEqual(mockError);
    });
  });

  describe('getTodaySteps', () => {
    it('should get today steps successfully', async () => {
      const mockEntry: StepEntry = {
        id: '123',
        user_id: 'user-123',
        date: '2024-01-15',
        steps: 8500,
        distance_meters: 6800,
        created_at: '2024-01-15T10:00:00Z',
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockEntry,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await stepsApi.getTodaySteps();

      expect(mockSupabase.from).toHaveBeenCalledWith('step_entries');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('date', expect.any(String));
      expect(result).toEqual(mockEntry);
    });

    it('should return default entry when no steps recorded', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // No rows returned
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await stepsApi.getTodaySteps();

      expect(result.steps).toBe(0);
      expect(result.distance_meters).toBe(0);
    });

    it('should throw error for non-PGRST116 errors', async () => {
      const mockError = { message: 'Database error', code: 'OTHER_ERROR' };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      await expect(stepsApi.getTodaySteps()).rejects.toEqual(mockError);
    });
  });

  describe('getStats', () => {
    it('should calculate stats successfully', async () => {
      const todayData = { steps: 8500 };
      const weekData = [
        { steps: 8500 },
        { steps: 9000 },
        { steps: 7500 },
        { steps: 10000 },
        { steps: 8000 },
        { steps: 9500 },
        { steps: 8000 },
      ];
      const monthData = [...weekData, ...Array(23).fill({ steps: 8000 })];
      const allData = [
        { date: '2024-01-15', steps: 8500 },
        { date: '2024-01-14', steps: 9000 },
        { date: '2024-01-13', steps: 7500 },
      ];

      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockImplementation(() => {
        callCount++;

        if (callCount === 1) {
          // Today stats
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: todayData, error: null }),
          };
        } else if (callCount === 2) {
          // Week stats
          return {
            select: jest.fn().mockReturnThis(),
            gte: jest.fn().mockResolvedValue({ data: weekData, error: null }),
          };
        } else if (callCount === 3) {
          // Month stats
          return {
            select: jest.fn().mockReturnThis(),
            gte: jest.fn().mockResolvedValue({ data: monthData, error: null }),
          };
        } else {
          // All data for streak
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: allData, error: null }),
          };
        }
      });

      const result = await stepsApi.getStats();

      expect(result.today).toBe(8500);
      expect(result.week).toBe(60500);
      expect(result.month).toBeGreaterThan(0);
      expect(result.average).toBeGreaterThan(0);
      expect(result.streak).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero stats', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({ data: null, error: null }),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      const result = await stepsApi.getStats();

      expect(result.today).toBe(0);
      expect(result.week).toBe(0);
      expect(result.month).toBe(0);
      expect(result.average).toBe(0);
    });
  });

  describe('getHistory', () => {
    const mockHistory: StepEntry[] = [
      {
        id: '1',
        user_id: 'user-123',
        date: '2024-01-15',
        steps: 8500,
        distance_meters: 6800,
        created_at: '2024-01-15T10:00:00Z',
      },
      {
        id: '2',
        user_id: 'user-123',
        date: '2024-01-14',
        steps: 9200,
        distance_meters: 7360,
        created_at: '2024-01-14T10:00:00Z',
      },
    ];

    it('should fetch daily history successfully', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockGte = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockHistory,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        order: mockOrder,
      });

      mockSelect.mockReturnValue({
        gte: mockGte,
      });

      mockGte.mockReturnValue({
        order: mockOrder,
      });

      const result = await stepsApi.getHistory('daily');

      expect(mockSupabase.from).toHaveBeenCalledWith('step_entries');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockGte).toHaveBeenCalledWith('date', expect.any(String));
      expect(mockOrder).toHaveBeenCalledWith('date', { ascending: false });
      expect(result).toEqual(mockHistory);
    });

    it('should fetch weekly history successfully', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockGte = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockHistory,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        order: mockOrder,
      });

      mockSelect.mockReturnValue({
        gte: mockGte,
      });

      mockGte.mockReturnValue({
        order: mockOrder,
      });

      const result = await stepsApi.getHistory('weekly');

      expect(result).toEqual(mockHistory);
    });

    it('should fetch monthly history successfully', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockGte = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockHistory,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        order: mockOrder,
      });

      mockSelect.mockReturnValue({
        gte: mockGte,
      });

      mockGte.mockReturnValue({
        order: mockOrder,
      });

      const result = await stepsApi.getHistory('monthly');

      expect(result).toEqual(mockHistory);
    });

    it('should handle empty history', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockGte = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        order: mockOrder,
      });

      mockSelect.mockReturnValue({
        gte: mockGte,
      });

      mockGte.mockReturnValue({
        order: mockOrder,
      });

      const result = await stepsApi.getHistory('daily');

      expect(result).toEqual([]);
    });

    it('should throw error when fetch history fails', async () => {
      const mockError = { message: 'Fetch failed' };

      const mockSelect = jest.fn().mockReturnThis();
      const mockGte = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        order: mockOrder,
      });

      mockSelect.mockReturnValue({
        gte: mockGte,
      });

      mockGte.mockReturnValue({
        order: mockOrder,
      });

      await expect(stepsApi.getHistory('weekly')).rejects.toEqual(mockError);
    });
  });
});
