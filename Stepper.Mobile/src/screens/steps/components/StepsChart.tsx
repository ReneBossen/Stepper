import React, { useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { BarChart } from 'react-native-gifted-charts';
import type { AggregatedChartData } from '../hooks';

interface StepsChartProps {
  chartData: AggregatedChartData[];
  viewMode: 'daily' | 'weekly' | 'monthly';
  dailyGoal: number;
  testID?: string;
}

interface ChartBarItem {
  value: number;
  label: string;
  frontColor: string;
}

/**
 * Bar chart displaying step history.
 * Adapts display based on view mode (daily, weekly, monthly).
 * Receives pre-aggregated chart data from parent component or hook.
 */
export function StepsChart({
  chartData,
  viewMode,
  dailyGoal,
  testID,
}: StepsChartProps) {
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;

  // Calculate goal threshold based on view mode
  const goalThreshold = useMemo(() => {
    switch (viewMode) {
      case 'daily':
        return dailyGoal;
      case 'weekly':
        return dailyGoal * 7;
      case 'monthly':
        return dailyGoal * 30;
      default:
        return dailyGoal;
    }
  }, [viewMode, dailyGoal]);

  // Transform aggregated data into chart bar items with colors
  const barData = useMemo<ChartBarItem[]>(() => {
    return chartData.map((item) => {
      const frontColor =
        item.value >= goalThreshold
          ? theme.colors.primary
          : theme.colors.primaryContainer;

      return {
        value: item.value,
        label: item.label,
        frontColor,
      };
    });
  }, [chartData, goalThreshold, theme.colors]);

  // Calculate chart dimensions based on view mode
  const chartWidth = screenWidth - 64; // Account for padding
  const barWidth = viewMode === 'monthly' ? 16 : viewMode === 'weekly' ? 24 : 28;
  const spacing = viewMode === 'monthly' ? 8 : viewMode === 'weekly' ? 12 : 16;

  // Calculate Y-axis max value
  const maxSteps = Math.max(...chartData.map((d) => d.value), goalThreshold);
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

  if (chartData.length === 0) {
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

  // Determine label font size based on view mode
  const labelFontSize = viewMode === 'monthly' ? 8 : viewMode === 'weekly' ? 9 : 10;

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      testID={testID}
      accessibilityLabel={`Step chart showing ${chartData.length} data points`}
      accessibilityRole="image"
    >
      <Card.Content style={styles.content}>
        <BarChart
          data={barData}
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
            fontSize: labelFontSize,
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
