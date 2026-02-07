import { useCallback, useEffect, useMemo, useState } from 'react';
import { stepsApi } from '@services/api/stepsApi';
import { getErrorMessage } from '@utils/errorUtils';
import type { DailyStepEntry } from '@store/stepsStore';
import type { AggregatedChartData, ChartStats } from './useChartData';

/**
 * Data returned from a custom date range fetch.
 */
interface CustomChartData {
  chartData: AggregatedChartData[];
  stats: ChartStats;
  periodLabel: string;
}

/**
 * Return type for the useCustomDateRange hook.
 */
export interface UseCustomDateRangeReturn {
  /** Whether the date picker modal is visible */
  isDatePickerVisible: boolean;
  /** The currently selected custom date range, or null if none */
  customDateRange: { start: Date; end: Date } | null;
  /** Fetched chart data for the custom range, or null */
  customChartData: CustomChartData | null;
  /** Whether the custom range data is loading */
  isCustomLoading: boolean;
  /** Error from the custom range fetch, or null */
  customError: string | null;
  /** Default start date for the date picker (6 days ago) */
  defaultDateRangeStart: Date;
  /** Default end date for the date picker (today) */
  defaultDateRangeEnd: Date;

  /** Opens the date picker modal */
  openDatePicker: () => void;
  /** Closes the date picker modal */
  closeDatePicker: () => void;
  /** Confirms a date range selection and closes the picker */
  confirmDateRange: (start: Date, end: Date) => void;
  /** Clears the custom date range and chart data */
  clearCustomRange: () => void;
  /** Re-fetches data for the current custom range */
  retryCustomFetch: () => void;
}

/**
 * Formats a Date to YYYY-MM-DD string format for API calls.
 */
function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date for display (e.g., "Jan 1").
 */
function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a full date with year (e.g., "Jan 1, 2026").
 */
function formatDateWithYear(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Hook for managing custom date range selection and data fetching.
 *
 * Encapsulates the date picker visibility, custom date range state,
 * and the API call to fetch step data for the selected range.
 *
 * @example
 * ```tsx
 * const {
 *   isDatePickerVisible,
 *   customDateRange,
 *   customChartData,
 *   openDatePicker,
 *   confirmDateRange,
 *   clearCustomRange,
 * } = useCustomDateRange();
 * ```
 */
export function useCustomDateRange(): UseCustomDateRangeReturn {
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [customChartData, setCustomChartData] = useState<CustomChartData | null>(null);
  const [isCustomLoading, setIsCustomLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // Fetch data for a custom date range
  const fetchCustomDateRangeData = useCallback(async (start: Date, end: Date) => {
    setIsCustomLoading(true);
    setCustomError(null);

    try {
      const startStr = formatDateForApi(start);
      const endStr = formatDateForApi(end);

      const dailySummaries = await stepsApi.getDailyHistory({
        startDate: startStr,
        endDate: endStr,
      });

      // Transform to entries
      const entries: DailyStepEntry[] = dailySummaries.map((summary) => ({
        date: summary.date,
        steps: summary.totalSteps,
        distanceMeters: summary.totalDistanceMeters,
      }));

      // Sort by date ascending for chart display
      entries.sort((a, b) => a.date.localeCompare(b.date));

      // Aggregate as daily view
      const aggregatedData: AggregatedChartData[] = entries.map((entry) => {
        const dateObj = new Date(entry.date + 'T00:00:00');
        return {
          label: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
          value: entry.steps,
          subLabel: formatDateForDisplay(dateObj),
        };
      });

      // Calculate stats
      const total = entries.reduce((sum, e) => sum + e.steps, 0);
      const distanceMeters = entries.reduce((sum, e) => sum + e.distanceMeters, 0);
      const average = entries.length > 0 ? Math.round(total / entries.length) : 0;

      // Generate period label
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      let customPeriodLabel: string;
      if (startYear === endYear) {
        customPeriodLabel = `${formatDateForDisplay(start)} - ${formatDateWithYear(end)}`;
      } else {
        customPeriodLabel = `${formatDateWithYear(start)} - ${formatDateWithYear(end)}`;
      }

      setCustomChartData({
        chartData: aggregatedData,
        stats: { total, average, distanceMeters },
        periodLabel: customPeriodLabel,
      });
    } catch (error) {
      setCustomError(getErrorMessage(error));
      setCustomChartData(null);
    } finally {
      setIsCustomLoading(false);
    }
  }, []);

  // Fetch custom data when custom range is set
  useEffect(() => {
    if (customDateRange) {
      fetchCustomDateRangeData(customDateRange.start, customDateRange.end);
    }
  }, [customDateRange, fetchCustomDateRangeData]);

  // Actions
  const openDatePicker = useCallback(() => {
    setIsDatePickerVisible(true);
  }, []);

  const closeDatePicker = useCallback(() => {
    setIsDatePickerVisible(false);
  }, []);

  const confirmDateRange = useCallback((start: Date, end: Date) => {
    setCustomDateRange({ start, end });
    setIsDatePickerVisible(false);
  }, []);

  const clearCustomRange = useCallback(() => {
    setCustomDateRange(null);
    setCustomChartData(null);
  }, []);

  const retryCustomFetch = useCallback(() => {
    if (customDateRange) {
      fetchCustomDateRangeData(customDateRange.start, customDateRange.end);
    }
  }, [customDateRange, fetchCustomDateRangeData]);

  // Default date range for date picker
  const defaultDateRangeStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return date;
  }, []);

  const defaultDateRangeEnd = useMemo(() => new Date(), []);

  return {
    isDatePickerVisible,
    customDateRange,
    customChartData,
    isCustomLoading,
    customError,
    defaultDateRangeStart,
    defaultDateRangeEnd,

    openDatePicker,
    closeDatePicker,
    confirmDateRange,
    clearCustomRange,
    retryCustomFetch,
  };
}
