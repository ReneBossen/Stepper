import { useMemo } from 'react';
import type { AggregatedChartData, ChartStats } from './useChartData';

/**
 * Parameters for the useChartDisplay hook.
 */
interface UseChartDisplayParams {
  /** Chart data from the regular useChartData hook */
  regularChartData: AggregatedChartData[];
  /** Stats from the regular useChartData hook */
  regularStats: ChartStats;
  /** Period label from the regular useChartData hook */
  regularPeriodLabel: string;
  /** Loading state from the regular useChartData hook */
  isRegularLoading: boolean;
  /** Error from the regular useChartData hook */
  regularError: string | null;
  /** Selected custom date range, or null if none */
  customDateRange: { start: Date; end: Date } | null;
  /** Fetched chart data for the custom range, or null */
  customChartData: { chartData: AggregatedChartData[]; stats: ChartStats; periodLabel: string } | null;
  /** Loading state for the custom range fetch */
  isCustomLoading: boolean;
  /** Error from the custom range fetch */
  customError: string | null;
  /** Current chart offset (0 = current period) */
  chartOffset: number;
}

/**
 * Return type for the useChartDisplay hook.
 */
export interface UseChartDisplayReturn {
  /** The chart data to display (custom or regular) */
  displayChartData: AggregatedChartData[];
  /** The stats to display (custom or regular) */
  displayStats: ChartStats;
  /** The period label to display (custom or regular) */
  displayPeriodLabel: string;
  /** Whether the displayed data is loading */
  displayIsLoading: boolean;
  /** Error for the displayed data, or null */
  displayError: string | null;
  /** Whether the user can navigate to the next period */
  canGoNext: boolean;
  /** Whether the display is showing custom date range data */
  isCustomMode: boolean;
}

/**
 * Hook that selects between regular chart data and custom date range data.
 *
 * Provides a unified display interface that the screen component can consume
 * without needing to know which data source is active. When a custom date
 * range is selected, custom data takes precedence; otherwise, regular
 * period-based data is shown.
 *
 * @param params - Regular and custom chart data along with their states
 * @returns Unified display values for chart, stats, and navigation
 *
 * @example
 * ```tsx
 * const {
 *   displayChartData,
 *   displayStats,
 *   displayPeriodLabel,
 *   displayIsLoading,
 *   displayError,
 *   canGoNext,
 *   isCustomMode,
 * } = useChartDisplay({
 *   regularChartData: chartData,
 *   regularStats: stats,
 *   regularPeriodLabel: periodLabel,
 *   isRegularLoading: isChartLoading,
 *   regularError: chartError,
 *   customDateRange,
 *   customChartData,
 *   isCustomLoading,
 *   customError,
 *   chartOffset,
 * });
 * ```
 */
export function useChartDisplay(params: UseChartDisplayParams): UseChartDisplayReturn {
  const {
    regularChartData,
    regularStats,
    regularPeriodLabel,
    isRegularLoading,
    regularError,
    customDateRange,
    customChartData,
    isCustomLoading,
    customError,
    chartOffset,
  } = params;

  return useMemo(() => {
    const isCustomMode = !!customDateRange;

    const displayChartData = isCustomMode && customChartData
      ? customChartData.chartData
      : regularChartData;

    const displayStats = isCustomMode && customChartData
      ? customChartData.stats
      : regularStats;

    const displayPeriodLabel = isCustomMode && customChartData
      ? customChartData.periodLabel
      : regularPeriodLabel;

    const displayIsLoading = isCustomMode
      ? isCustomLoading
      : isRegularLoading;

    const displayError = isCustomMode
      ? customError
      : regularError;

    // Can only go forward if we are in the past and not in custom mode
    const canGoNext = !isCustomMode && chartOffset < 0;

    return {
      displayChartData,
      displayStats,
      displayPeriodLabel,
      displayIsLoading,
      displayError,
      canGoNext,
      isCustomMode,
    };
  }, [
    regularChartData,
    regularStats,
    regularPeriodLabel,
    isRegularLoading,
    regularError,
    customDateRange,
    customChartData,
    isCustomLoading,
    customError,
    chartOffset,
  ]);
}
