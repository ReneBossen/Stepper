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
import { useChartData, useCustomDateRange, useChartDisplay } from './hooks';
import type { ChartViewMode } from './hooks';
import { useStepsStore } from '@store/stepsStore';
import { useUserStore } from '@store/userStore';
import type { DailyStepEntry } from '@store/stepsStore';

/** Initial number of history items to load */
const INITIAL_PAGE_SIZE = 7;

/** Number of items to load on subsequent pages */
const LOAD_MORE_PAGE_SIZE = 15;

/**
 * Steps History screen displaying detailed walking activity over time.
 *
 * Architecture:
 * - Chart section: Uses useChartData hook with viewMode and chartOffset
 * - Custom date range: Uses useCustomDateRange hook for date picker and custom fetches
 * - Display logic: Uses useChartDisplay hook to select between regular and custom data
 * - History section: Uses paginated history from store with infinite scroll
 *
 * These sections have independent state and data fetching.
 */
export default function StepsHistoryScreen() {
  const theme = useTheme();

  // ===============================
  // Chart Navigation State
  // ===============================
  const [viewMode, setViewMode] = useState<ChartViewMode>('daily');
  const [chartOffset, setChartOffset] = useState(0); // 0 = current period

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
  // Custom Date Range Hook
  // ===============================
  const {
    isDatePickerVisible,
    customDateRange,
    customChartData,
    isCustomLoading,
    customError,
    defaultDateRangeStart,
    defaultDateRangeEnd,
    openDatePicker: handleOpenDatePicker,
    closeDatePicker: handleCloseDatePicker,
    confirmDateRange: handleDateRangeConfirm,
    clearCustomRange,
    retryCustomFetch,
  } = useCustomDateRange();

  // ===============================
  // Chart Display Hook
  // ===============================
  const {
    displayChartData,
    displayStats,
    displayPeriodLabel,
    displayIsLoading,
    displayError,
    canGoNext,
    isCustomMode,
  } = useChartDisplay({
    regularChartData: chartData,
    regularStats: stats,
    regularPeriodLabel: periodLabel,
    isRegularLoading: isChartLoading,
    regularError: chartError,
    customDateRange,
    customChartData,
    isCustomLoading,
    customError,
    chartOffset,
  });

  // ===============================
  // Initial History Load
  // ===============================
  useEffect(() => {
    resetPaginatedHistory();
    loadMoreHistory(INITIAL_PAGE_SIZE);
  }, []);

  // ===============================
  // Handlers
  // ===============================
  const handleViewModeChange = useCallback((mode: ChartViewMode) => {
    setViewMode(mode);
    setChartOffset(0); // Reset to current period when changing view
    clearCustomRange();
  }, [clearCustomRange]);

  const handlePrevious = useCallback(() => {
    setChartOffset((o) => o - 1);
    // Clear custom range when navigating
    if (customDateRange) {
      clearCustomRange();
    }
  }, [customDateRange, clearCustomRange]);

  const handleNext = useCallback(() => {
    setChartOffset((o) => o + 1);
    // Clear custom range when navigating
    if (customDateRange) {
      clearCustomRange();
    }
  }, [customDateRange, clearCustomRange]);

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
    clearCustomRange();

    // Reset and reload paginated history
    resetPaginatedHistory();
    await loadMoreHistory(INITIAL_PAGE_SIZE);

    setIsRefreshing(false);
  }, [resetPaginatedHistory, loadMoreHistory, clearCustomRange]);

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
                  retryCustomFetch();
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
            viewMode={isCustomMode ? 'daily' : viewMode}
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
      isCustomMode,
      customDateRange,
      viewMode,
      dailyGoal,
      units,
      theme.colors,
      retryCustomFetch,
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
