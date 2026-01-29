import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { BarChart } from 'react-native-gifted-charts';
import type { DailyStepEntry } from '@store/stepsStore';

interface StepsChartProps {
  entries: DailyStepEntry[];
  viewMode: 'daily' | 'weekly' | 'monthly';
  dailyGoal: number;
  testID?: string;
}

interface ChartDataItem {
  value: number;
  label: string;
  frontColor: string;
  topLabelComponent?: () => React.ReactNode;
}

/**
 * Bar chart displaying step history.
 * Adapts display based on view mode (daily, weekly, monthly).
 */
export function StepsChart({
  entries,
  viewMode,
  dailyGoal,
  testID,
}: StepsChartProps) {
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;

  const chartData = useMemo<ChartDataItem[]>(() => {
    // Sort entries by date ascending for chart display
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sortedEntries.map((entry) => {
      const dateObj = new Date(entry.date + 'T00:00:00');
      let label: string;

      if (viewMode === 'daily') {
        // Show day abbreviation for daily view
        label = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      } else if (viewMode === 'weekly') {
        // Show day number for weekly view
        label = dateObj.getDate().toString();
      } else {
        // Show abbreviated date for monthly view
        label = dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }

      // Color based on goal achievement
      const frontColor =
        entry.steps >= dailyGoal
          ? theme.colors.primary
          : theme.colors.primaryContainer;

      return {
        value: entry.steps,
        label,
        frontColor,
      };
    });
  }, [entries, viewMode, dailyGoal, theme.colors]);

  // Calculate chart dimensions
  const chartWidth = screenWidth - 64; // Account for padding
  const barWidth = viewMode === 'monthly' ? 12 : viewMode === 'weekly' ? 20 : 28;
  const spacing = viewMode === 'monthly' ? 8 : viewMode === 'weekly' ? 12 : 16;

  // Calculate Y-axis max value
  const maxSteps = Math.max(...entries.map((e) => e.steps), dailyGoal);
  const yAxisMaxValue = Math.ceil(maxSteps / 2000) * 2000; // Round up to nearest 2000
  const noOfSections = 4;
  const stepValue = yAxisMaxValue / noOfSections;

  // Format Y-axis labels (e.g., 10000 -> "10k")
  const formatYAxisLabel = (label: string): string => {
    const value = parseFloat(label);
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return label;
  };

  if (entries.length === 0) {
    return (
      <Card
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
        testID={testID}
      >
        <Card.Content style={styles.emptyContent}>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            No data available for this period
          </Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      testID={testID}
      accessibilityLabel={`Step chart showing ${entries.length} days of data`}
      accessibilityRole="image"
    >
      <Card.Content style={styles.content}>
        <BarChart
          data={chartData}
          width={chartWidth}
          height={180}
          barWidth={barWidth}
          spacing={spacing}
          initialSpacing={12}
          endSpacing={12}
          noOfSections={noOfSections}
          maxValue={yAxisMaxValue}
          stepValue={stepValue}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={theme.colors.outline}
          yAxisTextStyle={{
            color: theme.colors.onSurfaceVariant,
            fontSize: 10,
          }}
          xAxisLabelTextStyle={{
            color: theme.colors.onSurfaceVariant,
            fontSize: viewMode === 'monthly' ? 8 : 10,
          }}
          formatYLabel={formatYAxisLabel}
          barBorderRadius={4}
          disableScroll={viewMode !== 'monthly'}
          showScrollIndicator={false}
          rulesColor={theme.colors.outlineVariant}
          rulesType="solid"
          dashGap={0}
          dashWidth={0}
          hideRules={false}
          isAnimated
          animationDuration={500}
        />
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    elevation: 2,
  },
  content: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyContent: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});
