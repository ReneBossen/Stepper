import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import {
  Appbar,
  Text,
  Divider,
  useTheme,
} from 'react-native-paper';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { ManualStepEntryModal } from '@components/steps';
import {
  ChartNavigation,
  DateRangePicker,
  StepHistoryItem,
  StatsSummary,
  StepsChart,
} from './components';
import type { ChartStats } from './components';
import { useChartData } from './hooks';
import type { ChartViewMode } from './hooks';
import { useStepsStore } from '@store/stepsStore';
import { useUserStore } from '@store/userStore';
import type { DailyStepEntry } from '@store/stepsStore';
import { stepsApi } from '@services/api/stepsApi';
import { getErrorMessage } from '@utils/errorUtils';

/**
 * Formats a Date to YYYY-MM-DD string format.
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

/** Initial number of history items to load */
const INITIAL_PAGE_SIZE = 7;

/** Number of items to load on subsequent pages */
const LOAD_MORE_PAGE_SIZE = 15;

/**
 * Steps History screen displaying detailed walking activity over time.
 *
 * Architecture:
 * - Chart section: Uses useChartData hook with viewMode and chartOffset
 * - History section: Uses paginated history from store with infinite scroll
 *
 * These two sections have independent state and data fetching.
 */
export default function StepsHistoryScreen() {
  const theme = useTheme();

  // ===============================
  // Chart Navigation State
  // ===============================
  const [viewMode, setViewMode] = useState<ChartViewMode>('daily');
  const [chartOffset, setChartOffset] = useState(0); // 0 = current period

  // ===============================
  // Date Picker State
  // ===============================
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null);

  // ===============================
  // Custom Date Range Chart State
  // ===============================
  const [customChartData, setCustomChartData] = useState<
    { chartData: typeof chartData; stats: ChartStats; periodLabel: string } | null
  >(null);
  const [isCustomLoading, setIsCustomLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // ===============================
  // Manual Entry Modal State
  // ===============================
  const [showManualEntry, setShowManualEntry] = useState(false);

  // ===============================
  // Refresh State
  // ===============================
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ===============================
  // Store State (Paginated History)
  // ===============================
  const {
    paginatedHistory,
    hasMoreHistory,
    isPaginatedHistoryLoading,
    loadMoreHistory,
    resetPaginatedHistory,
  } = useStepsStore();

  const { currentUser } = useUserStore();

  const dailyGoal = currentUser?.preferences.daily_step_goal ?? 10000;
  const units = currentUser?.preferences.units ?? 'metric';

  // ===============================
  // Chart Data Hook (for non-custom ranges)
  // ===============================
  const {
    chartData,
    stats,
    periodLabel,
    isLoading: isChartLoading,
    error: chartError,
  } = useChartData(viewMode, chartOffset);

  // ===============================
  // Initial History Load
  // ===============================
  useEffect(() => {
    resetPaginatedHistory();
    loadMoreHistory(INITIAL_PAGE_SIZE);
  }, []);

  // ===============================
  // Custom Date Range Fetching
  // ===============================
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
      const aggregatedData = entries.map((entry) => {
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

  // ===============================
  // Handlers
  // ===============================
  const handleViewModeChange = useCallback((mode: ChartViewMode) => {
    setViewMode(mode);
    setChartOffset(0); // Reset to current period when changing view
    setCustomDateRange(null); // Clear custom range
    setCustomChartData(null);
  }, []);

  const handlePrevious = useCallback(() => {
    setChartOffset((o) => o - 1);
    // Clear custom range when navigating
    if (customDateRange) {
      setCustomDateRange(null);
      setCustomChartData(null);
    }
  }, [customDateRange]);

  const handleNext = useCallback(() => {
    setChartOffset((o) => o + 1);
    // Clear custom range when navigating
    if (customDateRange) {
      setCustomDateRange(null);
      setCustomChartData(null);
    }
  }, [customDateRange]);

  const handleOpenDatePicker = useCallback(() => {
    setIsDatePickerVisible(true);
  }, []);

  const handleCloseDatePicker = useCallback(() => {
    setIsDatePickerVisible(false);
  }, []);

  const handleDateRangeConfirm = useCallback((start: Date, end: Date) => {
    setCustomDateRange({ start, end });
    setIsDatePickerVisible(false);
  }, []);

  const handleAddStepsPress = useCallback(() => {
    setShowManualEntry(true);
  }, []);

  const handleManualEntryDismiss = useCallback(() => {
    setShowManualEntry(false);
  }, []);

  const handleManualEntrySuccess = useCallback(() => {
    // Refresh both chart and history data after successful entry
    handleRefresh();
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!isPaginatedHistoryLoading && hasMoreHistory) {
      loadMoreHistory(LOAD_MORE_PAGE_SIZE);
    }
  }, [isPaginatedHistoryLoading, hasMoreHistory, loadMoreHistory]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    // Reset chart to current period
    setChartOffset(0);
    setCustomDateRange(null);
    setCustomChartData(null);

    // Reset and reload paginated history
    resetPaginatedHistory();
    await loadMoreHistory(INITIAL_PAGE_SIZE);

    setIsRefreshing(false);
  }, [resetPaginatedHistory, loadMoreHistory]);

  // ===============================
  // Computed Values
  // ===============================

  // Determine which chart data to display
  const displayChartData = customDateRange && customChartData ? customChartData.chartData : chartData;
  const displayStats = customDateRange && customChartData ? customChartData.stats : stats;
  const displayPeriodLabel = customDateRange && customChartData ? customChartData.periodLabel : periodLabel;
  const displayIsLoading = customDateRange ? isCustomLoading : isChartLoading;
  const displayError = customDateRange ? customError : chartError;

  // Can only go forward if we're in the past (and not in custom mode)
  const canGoNext = !customDateRange && chartOffset < 0;

  // ===============================
  // Render Helpers
  // ===============================
  const renderHistoryItem = useCallback(
    ({ item }: { item: DailyStepEntry }) => (
      <StepHistoryItem
        entry={item}
        dailyGoal={dailyGoal}
        units={units}
        testID={`history-item-${item.date}`}
      />
    ),
    [dailyGoal, units]
  );

  const keyExtractor = useCallback((item: DailyStepEntry) => item.date, []);

  const ListHeaderComponent = useMemo(
    () => (
      <>
        {/* Chart Section */}
        {displayError ? (
          <View style={styles.chartErrorContainer}>
            <ErrorMessage
              message={displayError}
              onRetry={() => {
                if (customDateRange) {
                  fetchCustomDateRangeData(customDateRange.start, customDateRange.end);
                }
              }}
            />
          </View>
        ) : displayIsLoading ? (
          <View style={styles.chartLoadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <StepsChart
            chartData={displayChartData}
            viewMode={customDateRange ? 'daily' : viewMode}
            dailyGoal={dailyGoal}
            testID="steps-chart"
          />
        )}

        {/* Stats Summary */}
        <View style={styles.summaryContainer}>
          <StatsSummary
            stats={displayStats}
            periodLabel={displayPeriodLabel}
            units={units}
            testID="stats-summary"
          />
        </View>

        {/* History Header */}
        <View style={styles.historyHeader}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            History
          </Text>
          <Divider />
        </View>
      </>
    ),
    [
      displayChartData,
      displayStats,
      displayPeriodLabel,
      displayError,
      displayIsLoading,
      customDateRange,
      viewMode,
      dailyGoal,
      units,
      theme.colors,
      fetchCustomDateRangeData,
    ]
  );

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyState}>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          No step data recorded yet.
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}
        >
          Start walking to see your history here!
        </Text>
      </View>
    ),
    [theme.colors]
  );

  const ListFooterComponent = useMemo(
    () =>
      isPaginatedHistoryLoading ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : null,
    [isPaginatedHistoryLoading, theme.colors]
  );

  // Default date range for date picker
  const defaultDateRangeStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return date;
  }, []);

  const defaultDateRangeEnd = useMemo(() => new Date(), []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* App Bar */}
      <Appbar.Header elevated>
        <Appbar.Content title="Steps History" />
        <Appbar.Action
          icon="plus"
          onPress={handleAddStepsPress}
          accessibilityLabel="Add steps manually"
        />
        <Appbar.Action
          icon="calendar"
          onPress={handleOpenDatePicker}
          accessibilityLabel="Select custom date range"
        />
      </Appbar.Header>

      {/* Chart Navigation */}
      <ChartNavigation
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onPrevious={handlePrevious}
        onNext={handleNext}
        canGoNext={canGoNext}
        periodLabel={displayPeriodLabel}
        testID="chart-navigation"
      />

      {/* History List with Chart Header */}
      <FlatList
        data={paginatedHistory}
        renderItem={renderHistoryItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={!isPaginatedHistoryLoading ? ListEmptyComponent : null}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Date Range Picker Modal */}
      <DateRangePicker
        visible={isDatePickerVisible}
        startDate={customDateRange?.start ?? defaultDateRangeStart}
        endDate={customDateRange?.end ?? defaultDateRangeEnd}
        onDismiss={handleCloseDatePicker}
        onConfirm={handleDateRangeConfirm}
        testID="date-range-picker"
      />

      {/* Manual Step Entry Modal */}
      <ManualStepEntryModal
        visible={showManualEntry}
        onDismiss={handleManualEntryDismiss}
        onSuccess={handleManualEntrySuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  chartLoadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  chartErrorContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  summaryContainer: {
    marginTop: 16,
  },
  historyHeader: {
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptySubtext: {
    marginTop: 4,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
