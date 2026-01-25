import { apiClient } from './client';

/**
 * Step entry response from the backend API.
 * This matches the StepEntryResponse DTO from the backend.
 */
export interface StepEntry {
  id: string;
  stepCount: number;
  distanceMeters: number | null;
  date: string;
  recordedAt: string;
  source: string | null;
}

/**
 * Step statistics response from the backend API.
 * This matches the StepStatsResponse DTO from the backend.
 */
export interface StepStats {
  todaySteps: number;
  todayDistance: number;
  weekSteps: number;
  weekDistance: number;
  monthSteps: number;
  monthDistance: number;
  currentStreak: number;
  longestStreak: number;
  dailyGoal: number;
}

/**
 * Daily steps summary response from the backend API.
 * This matches the DailyStepsResponse DTO from the backend.
 */
export interface DailyStepsResponse {
  date: string;
  totalSteps: number;
  totalDistanceMeters: number;
}

/**
 * Step history response with pagination from the backend API.
 * This matches the StepHistoryResponse DTO from the backend.
 */
export interface StepHistoryResponse {
  items: StepEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Request parameters for recording steps.
 */
export interface RecordStepsRequest {
  stepCount: number;
  distanceMeters?: number;
  date: string;
  source?: string;
}

/**
 * Parameters for fetching step history.
 */
export interface StepHistoryParams {
  startDate: string;
  endDate: string;
  page?: number;
  pageSize?: number;
}

/**
 * Parameters for fetching daily step summaries.
 */
export interface DailyHistoryParams {
  startDate: string;
  endDate: string;
}

export const stepsApi = {
  /**
   * Records a step entry for the current user.
   *
   * @param request - The step recording request data
   * @returns The created step entry
   */
  addSteps: async (request: RecordStepsRequest): Promise<StepEntry> => {
    return apiClient.post<StepEntry>('/api/v1/steps', request);
  },

  /**
   * Gets today's step summary for the current user.
   *
   * @returns Today's step summary (totalSteps will be 0 if no entries)
   */
  getTodaySteps: async (): Promise<DailyStepsResponse> => {
    return apiClient.get<DailyStepsResponse>('/api/v1/steps/today');
  },

  /**
   * Gets comprehensive step statistics for the current user.
   *
   * @returns Step statistics including today, week, month totals and streaks
   */
  getStats: async (): Promise<StepStats> => {
    return apiClient.get<StepStats>('/api/v1/steps/stats');
  },

  /**
   * Gets paginated detailed step entry history.
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated step history
   */
  getHistory: async (params: StepHistoryParams): Promise<StepHistoryResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    if (params.page !== undefined) {
      queryParams.append('page', params.page.toString());
    }
    if (params.pageSize !== undefined) {
      queryParams.append('pageSize', params.pageSize.toString());
    }

    return apiClient.get<StepHistoryResponse>(`/api/v1/steps/history?${queryParams}`);
  },

  /**
   * Gets daily step summaries for a date range.
   *
   * @param params - Query parameters with start and end dates
   * @returns Array of daily step summaries
   */
  getDailyHistory: async (params: DailyHistoryParams): Promise<DailyStepsResponse[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);

    return apiClient.get<DailyStepsResponse[]>(`/api/v1/steps/daily?${queryParams}`);
  },

  /**
   * Gets a specific step entry by ID.
   *
   * @param id - The step entry ID
   * @returns The step entry
   */
  getEntry: async (id: string): Promise<StepEntry> => {
    return apiClient.get<StepEntry>(`/api/v1/steps/${id}`);
  },

  /**
   * Deletes a step entry.
   *
   * @param id - The step entry ID to delete
   */
  deleteEntry: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/api/v1/steps/${id}`);
  },
};
