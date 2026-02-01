import { useEffect, useMemo, useState, useCallback } from 'react';
import { DailyStepEntry } from '@store/stepsStore';
import { getErrorMessage } from '@utils/errorUtils';

/**
 * Represents a single data point for the chart.
 */
export interface AggregatedChartData {
  /** Display label (e.g., "Mon", "Wk 1", "Jan") */
  label: string;
  /** Total steps for the period */
  value: number;
  /** Additional context (e.g., "Jan 1-7" for weekly view) */
  subLabel?: string;
}

/**
 * Statistics calculated from the chart data.
 */
export interface ChartStats {
  /** Total steps across all data points */
  total: number;
  /** Average steps per data point */
  average: number;
  /** Total distance in meters */
  distanceMeters: number;
}

/**
 * Return type for the useChartData hook.
 */
export interface UseChartDataResult {
  /** Aggregated data points for the chart */
  chartData: AggregatedChartData[];
  /** Statistics calculated from the data */
  stats: ChartStats;
  /** Human-readable period label (e.g., "Jan 1 - Jan 7, 2026") */
  periodLabel: string;
  /** Whether data is currently being fetched */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
}

/**
 * View modes for chart data aggregation.
 */
export type ChartViewMode = 'daily' | 'weekly' | 'monthly';

/**
 * Day abbreviations for daily view.
 */
const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Month abbreviations for monthly view.
 */
const MONTH_ABBREVIATIONS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Formats a date as YYYY-MM-DD string.
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
  const month = MONTH_ABBREVIATIONS[date.getMonth()];
  const day = date.getDate();
  return `${month} ${day}`;
}

/**
 * Formats a full date with year (e.g., "Jan 1, 2026").
 */
function formatDateWithYear(date: Date): string {
  const month = MONTH_ABBREVIATIONS[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

/**
 * Gets the Monday of the week containing the given date.
 */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // getDay() returns 0 for Sunday, 1 for Monday, etc.
  // We want Monday = 0, so adjust: (day + 6) % 7
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Gets the Sunday of the week containing the given date.
 */
function getSunday(date: Date): Date {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

/**
 * Calculates the date range based on view mode and offset.
 *
 * @param viewMode - The aggregation mode
 * @param offset - Offset from current period (0 = current, -1 = previous, etc.)
 * @returns Start and end dates for the period
 */
function calculateDateRange(
  viewMode: ChartViewMode,
  offset: number
): { startDate: Date; endDate: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (viewMode) {
    case 'daily': {
      // Last 7 days, offset shifts by 7 days
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + (offset * 7));

      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);

      return { startDate, endDate };
    }

    case 'weekly': {
      // Last 7 weeks (Mon-Sun each), offset shifts by 7 weeks
      const currentMonday = getMonday(today);

      // End of the 7-week period
      const endWeekMonday = new Date(currentMonday);
      endWeekMonday.setDate(endWeekMonday.getDate() + (offset * 7 * 7));
      const endDate = getSunday(endWeekMonday);

      // Start of the 7-week period (6 weeks before the end week's Monday)
      const startDate = new Date(endWeekMonday);
      startDate.setDate(startDate.getDate() - (6 * 7));

      return { startDate, endDate };
    }

    case 'monthly': {
      // Last 12 months, offset shifts by 12 months
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // End month
      const endMonth = new Date(currentMonth);
      endMonth.setMonth(endMonth.getMonth() + (offset * 12));

      // Start month (11 months before end month)
      const startMonth = new Date(endMonth);
      startMonth.setMonth(startMonth.getMonth() - 11);

      // Start date is first day of start month
      const startDate = new Date(startMonth);

      // End date is last day of end month
      const endDate = new Date(endMonth);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Last day of previous month

      return { startDate, endDate };
    }
  }
}

/**
 * Generates the period label for display.
 */
function generatePeriodLabel(
  viewMode: ChartViewMode,
  startDate: Date,
  endDate: Date
): string {
  switch (viewMode) {
    case 'daily': {
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();

      if (startYear === endYear) {
        return `${formatDateForDisplay(startDate)} - ${formatDateWithYear(endDate)}`;
      }
      return `${formatDateWithYear(startDate)} - ${formatDateWithYear(endDate)}`;
    }

    case 'weekly': {
      return `7 weeks ending ${formatDateWithYear(endDate)}`;
    }

    case 'monthly': {
      const startMonth = MONTH_ABBREVIATIONS[startDate.getMonth()];
      const startYear = startDate.getFullYear();
      const endMonth = MONTH_ABBREVIATIONS[endDate.getMonth()];
      const endYear = endDate.getFullYear();

      if (startYear === endYear) {
        return `${startMonth} - ${endMonth} ${endYear}`;
      }
      return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
    }
  }
}

/**
 * Creates a map of date string to daily entry for quick lookup.
 */
function createDailyDataMap(dailyHistory: DailyStepEntry[]): Map<string, DailyStepEntry> {
  const map = new Map<string, DailyStepEntry>();
  for (const entry of dailyHistory) {
    map.set(entry.date, entry);
  }
  return map;
}

/**
 * Aggregates daily data into daily view (7 days).
 */
function aggregateDailyView(
  startDate: Date,
  endDate: Date,
  dataMap: Map<string, DailyStepEntry>
): AggregatedChartData[] {
  const result: AggregatedChartData[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = formatDateForApi(currentDate);
    const entry = dataMap.get(dateStr);
    const dayIndex = currentDate.getDay();

    result.push({
      label: DAY_ABBREVIATIONS[dayIndex],
      value: entry?.steps ?? 0,
      subLabel: formatDateForDisplay(currentDate),
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}

/**
 * Aggregates daily data into weekly view (7 weeks).
 */
function aggregateWeeklyView(
  startDate: Date,
  endDate: Date,
  dataMap: Map<string, DailyStepEntry>
): AggregatedChartData[] {
  const result: AggregatedChartData[] = [];

  // Start from the first Monday
  const currentMonday = getMonday(startDate);
  let weekNumber = 1;

  while (currentMonday <= endDate) {
    const weekEnd = getSunday(currentMonday);
    let weekTotal = 0;

    // Sum up steps for this week
    const dayInWeek = new Date(currentMonday);
    for (let i = 0; i < 7; i++) {
      const dateStr = formatDateForApi(dayInWeek);
      const entry = dataMap.get(dateStr);
      weekTotal += entry?.steps ?? 0;
      dayInWeek.setDate(dayInWeek.getDate() + 1);
    }

    // Create subLabel showing date range (e.g., "Jan 1-7")
    const mondayDisplay = formatDateForDisplay(currentMonday);
    const sundayDay = weekEnd.getDate();
    const subLabel = `${mondayDisplay}-${sundayDay}`;

    result.push({
      label: `Wk ${weekNumber}`,
      value: weekTotal,
      subLabel,
    });

    weekNumber++;
    currentMonday.setDate(currentMonday.getDate() + 7);
  }

  return result;
}

/**
 * Aggregates daily data into monthly view (12 months).
 */
function aggregateMonthlyView(
  startDate: Date,
  endDate: Date,
  dataMap: Map<string, DailyStepEntry>
): AggregatedChartData[] {
  const result: AggregatedChartData[] = [];

  // Start from the first day of start month
  const currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (currentMonth <= endMonth) {
    let monthTotal = 0;

    // Get the number of days in this month
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Sum up steps for this month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = formatDateForApi(date);
      const entry = dataMap.get(dateStr);
      monthTotal += entry?.steps ?? 0;
    }

    result.push({
      label: MONTH_ABBREVIATIONS[month],
      value: monthTotal,
      subLabel: `${year}`,
    });

    // Move to next month
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }

  return result;
}

/**
 * Calculates statistics from the daily data within a date range.
 */
function calculateStats(
  startDate: Date,
  endDate: Date,
  dataMap: Map<string, DailyStepEntry>,
  chartData: AggregatedChartData[]
): ChartStats {
  let total = 0;
  let distanceMeters = 0;

  // Sum all data from the data map within the date range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = formatDateForApi(currentDate);
    const entry = dataMap.get(dateStr);
    if (entry) {
      total += entry.steps;
      distanceMeters += entry.distanceMeters;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calculate average based on number of data points in the chart
  const average = chartData.length > 0 ? Math.round(total / chartData.length) : 0;

  return {
    total,
    average,
    distanceMeters,
  };
}

/**
 * Hook for fetching and aggregating chart data for the Steps History screen.
 *
 * Centralizes chart data fetching and aggregation logic, separating it from
 * the history list. Handles different view modes (daily, weekly, monthly)
 * and supports navigation through time periods via offset.
 *
 * @param viewMode - The aggregation mode ('daily', 'weekly', or 'monthly')
 * @param offset - Offset from current period (0 = current, -1 = previous, etc.)
 * @returns Chart data, statistics, and loading/error states
 *
 * @example
 * ```tsx
 * const { chartData, stats, periodLabel, isLoading, error } = useChartData('weekly', 0);
 *
 * // Navigate to previous period
 * const [offset, setOffset] = useState(0);
 * const goBack = () => setOffset(o => o - 1);
 * const goForward = () => setOffset(o => Math.min(o + 1, 0));
 * ```
 */
export function useChartData(
  viewMode: ChartViewMode,
  offset: number
): UseChartDataResult {
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [fetchedData, setFetchedData] = useState<DailyStepEntry[]>([]);

  // Note: We fetch directly from stepsApi to avoid store state conflicts

  // Calculate date range based on view mode and offset
  const dateRange = useMemo(() => {
    return calculateDateRange(viewMode, offset);
  }, [viewMode, offset]);

  // Fetch data when date range changes
  const fetchData = useCallback(async () => {
    setLocalLoading(true);
    setLocalError(null);

    try {
      const startStr = formatDateForApi(dateRange.startDate);
      const endStr = formatDateForApi(dateRange.endDate);

      // Fetch data directly from the API to avoid store state conflicts
      const { stepsApi } = await import('@services/api/stepsApi');
      const dailySummaries = await stepsApi.getDailyHistory({
        startDate: startStr,
        endDate: endStr,
      });

      // Transform to DailyStepEntry format
      const entries: DailyStepEntry[] = dailySummaries.map((summary) => ({
        date: summary.date,
        steps: summary.totalSteps,
        distanceMeters: summary.totalDistanceMeters,
      }));

      setFetchedData(entries);
    } catch (error) {
      setLocalError(getErrorMessage(error));
      setFetchedData([]);
    } finally {
      setLocalLoading(false);
    }
  }, [dateRange]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create data map for quick lookups
  const dataMap = useMemo(() => {
    return createDailyDataMap(fetchedData);
  }, [fetchedData]);

  // Aggregate data based on view mode
  const chartData = useMemo(() => {
    if (fetchedData.length === 0 && !localLoading) {
      // Return empty aggregated structure based on view mode
      switch (viewMode) {
        case 'daily':
          return aggregateDailyView(dateRange.startDate, dateRange.endDate, dataMap);
        case 'weekly':
          return aggregateWeeklyView(dateRange.startDate, dateRange.endDate, dataMap);
        case 'monthly':
          return aggregateMonthlyView(dateRange.startDate, dateRange.endDate, dataMap);
      }
    }

    switch (viewMode) {
      case 'daily':
        return aggregateDailyView(dateRange.startDate, dateRange.endDate, dataMap);
      case 'weekly':
        return aggregateWeeklyView(dateRange.startDate, dateRange.endDate, dataMap);
      case 'monthly':
        return aggregateMonthlyView(dateRange.startDate, dateRange.endDate, dataMap);
    }
  }, [viewMode, dateRange, dataMap, localLoading, fetchedData.length]);

  // Calculate statistics
  const stats = useMemo(() => {
    return calculateStats(dateRange.startDate, dateRange.endDate, dataMap, chartData);
  }, [dateRange, dataMap, chartData]);

  // Generate period label
  const periodLabel = useMemo(() => {
    return generatePeriodLabel(viewMode, dateRange.startDate, dateRange.endDate);
  }, [viewMode, dateRange]);

  return {
    chartData,
    stats,
    periodLabel,
    isLoading: localLoading,
    error: localError,
  };
}
