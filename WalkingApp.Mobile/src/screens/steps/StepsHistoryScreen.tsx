import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import {
  Appbar,
  SegmentedButtons,
  Text,
  Divider,
  useTheme,
} from 'react-native-paper';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { ManualStepEntryModal } from '@components/steps';
import { DateRangePicker, StepHistoryItem, StatsSummary, StepsChart } from './components';
import { useStepsStore } from '@store/stepsStore';
import { useUserStore } from '@store/userStore';
import type { DailyStepEntry } from '@store/stepsStore';

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'custom';

/**
 * Calculates the date range based on the selected view mode.
 * - Daily: Today only
 * - Weekly: Current week (Monday to Sunday)
 * - Monthly: Current month (1st to last day)
 */
function getDateRange(viewMode: ViewMode): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (viewMode) {
    case 'daily':
      // Today only - no change to start date
      break;
    case 'weekly':
      // Current week (Monday as start of week)
      const dayOfWeek = start.getDay();
      // getDay() returns 0 for Sunday, 1 for Monday, etc.
      // We want Monday = 0, so adjust: (dayOfWeek + 6) % 7
      const daysFromMonday = (dayOfWeek + 6) % 7;
      start.setDate(start.getDate() - daysFromMonday);
      break;
    case 'monthly':
      // Current month (1st of the month)
      start.setDate(1);
      break;
  }

  return { start, end };
}

/**
 * Formats a Date to YYYY-MM-DD string format.
 */
function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Steps History screen displaying detailed walking activity over time.
 * Shows charts, statistics, and a list of daily entries.
 */
export default function StepsHistoryScreen() {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const {
    dailyHistory,
    isHistoryLoading,
    historyError,
    fetchDailyHistory,
  } = useStepsStore();

  const { currentUser } = useUserStore();

  const dailyGoal = currentUser?.preferences.daily_step_goal ?? 10000;
  const units = currentUser?.preferences.units ?? 'metric';

  // Calculate date range based on view mode or use custom range
  const dateRange = useMemo(() => {
    if (viewMode === 'custom' && customDateRange) {
      return customDateRange;
    }
    return getDateRange(viewMode);
  }, [viewMode, customDateRange]);

  // Fetch data when view mode changes
  useEffect(() => {
    const startStr = formatDateForApi(dateRange.start);
    const endStr = formatDateForApi(dateRange.end);
    fetchDailyHistory(startStr, endStr);
  }, [dateRange, fetchDailyHistory]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const startStr = formatDateForApi(dateRange.start);
    const endStr = formatDateForApi(dateRange.end);
    await fetchDailyHistory(startStr, endStr);
    setIsRefreshing(false);
  }, [dateRange, fetchDailyHistory]);

  const handleViewModeChange = useCallback((value: string) => {
    setViewMode(value as ViewMode);
    // Reset custom date range when switching to preset modes
    if (value !== 'custom') {
      setCustomDateRange(null);
    }
  }, []);

  const handleOpenDatePicker = useCallback(() => {
    setIsDatePickerVisible(true);
  }, []);

  const handleCloseDatePicker = useCallback(() => {
    setIsDatePickerVisible(false);
  }, []);

  const handleDateRangeConfirm = useCallback((start: Date, end: Date) => {
    setCustomDateRange({ start, end });
    setViewMode('custom');
    setIsDatePickerVisible(false);
  }, []);

  const handleAddStepsPress = useCallback(() => {
    setShowManualEntry(true);
  }, []);

  const handleManualEntryDismiss = useCallback(() => {
    setShowManualEntry(false);
  }, []);

  const handleManualEntrySuccess = useCallback(() => {
    // Refresh the history data after successful entry
    handleRefresh();
  }, [handleRefresh]);

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

  // Map viewMode for chart display (custom uses monthly-style chart)
  const chartViewMode = viewMode === 'custom' ? 'monthly' : viewMode;

  const ListHeaderComponent = useMemo(
    () => (
      <>
        <StepsChart
          entries={dailyHistory}
          viewMode={chartViewMode}
          dailyGoal={dailyGoal}
          testID="steps-chart"
        />

        <View style={styles.summaryContainer}>
          <StatsSummary
            entries={dailyHistory}
            dateRange={dateRange}
            units={units}
            testID="stats-summary"
          />
        </View>

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
    [dailyHistory, chartViewMode, dailyGoal, dateRange, units, theme.colors]
  );

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyState}>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          No step data recorded for this period.
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

  // Show loading spinner only on initial load
  if (isHistoryLoading && dailyHistory.length === 0 && !isRefreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
        <LoadingSpinner />
        <DateRangePicker
          visible={isDatePickerVisible}
          startDate={dateRange.start}
          endDate={dateRange.end}
          onDismiss={handleCloseDatePicker}
          onConfirm={handleDateRangeConfirm}
          testID="date-range-picker"
        />
        <ManualStepEntryModal
          visible={showManualEntry}
          onDismiss={handleManualEntryDismiss}
          onSuccess={handleManualEntrySuccess}
        />
      </View>
    );
  }

  // Show error state
  if (historyError && !isRefreshing && dailyHistory.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
        <ErrorMessage message={historyError} onRetry={handleRefresh} />
        <DateRangePicker
          visible={isDatePickerVisible}
          startDate={dateRange.start}
          endDate={dateRange.end}
          onDismiss={handleCloseDatePicker}
          onConfirm={handleDateRangeConfirm}
          testID="date-range-picker"
        />
        <ManualStepEntryModal
          visible={showManualEntry}
          onDismiss={handleManualEntryDismiss}
          onSuccess={handleManualEntrySuccess}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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

      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={handleViewModeChange}
          buttons={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            ...(viewMode === 'custom' ? [{ value: 'custom', label: 'Custom' }] : []),
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <FlatList
        data={dailyHistory}
        renderItem={renderHistoryItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContent}
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

      <DateRangePicker
        visible={isDatePickerVisible}
        startDate={dateRange.start}
        endDate={dateRange.end}
        onDismiss={handleCloseDatePicker}
        onConfirm={handleDateRangeConfirm}
        testID="date-range-picker"
      />

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
  segmentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segmentedButtons: {
    // SegmentedButtons handles its own styling
  },
  listContent: {
    paddingBottom: 24,
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
});
