import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, Dimensions, View, Pressable } from 'react-native';
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
  onPress?: () => void;
}

interface SelectedBarInfo {
  index: number;
  value: number;
  label: string;
  subLabel?: string;
}

/**
 * Calculates the Y-axis maximum value with proper rounding intervals.
 * - Daily view: rounds up to nearest 5,000
 * - Weekly/Monthly view: rounds up to nearest 10,000
 */
function calculateYAxisMax(maxValue: number, viewMode: 'daily' | 'weekly' | 'monthly'): number {
  if (maxValue <= 0) {
    return viewMode === 'daily' ? 5000 : 10000;
  }
  const interval = viewMode === 'daily' ? 5000 : 10000;
  return Math.ceil(maxValue / interval) * interval;
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
  const [selectedBar, setSelectedBar] = useState<SelectedBarInfo | null>(null);

  const handleBarPress = useCallback((item: AggregatedChartData, index: number) => {
    setSelectedBar((prev) => {
      // Toggle off if pressing the same bar
      if (prev?.index === index) {
        return null;
      }
      return {
        index,
        value: item.value,
        label: item.label,
        subLabel: item.subLabel,
      };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedBar(null);
  }, []);

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
    return chartData.map((item, index) => {
      const isSelected = selectedBar?.index === index;
      const meetsGoal = item.value >= goalThreshold;

      // Highlight selected bar with a different shade
      let frontColor: string;
      if (isSelected) {
        frontColor = theme.colors.tertiary;
      } else if (meetsGoal) {
        frontColor = theme.colors.primary;
      } else {
        frontColor = theme.colors.primaryContainer;
      }

      return {
        value: item.value,
        label: item.label,
        frontColor,
        onPress: () => handleBarPress(item, index),
      };
    });
  }, [chartData, goalThreshold, theme.colors, selectedBar, handleBarPress]);

  // Calculate chart dimensions based on view mode
  const chartWidth = screenWidth - 64; // Account for padding
  const barWidth = viewMode === 'monthly' ? 16 : viewMode === 'weekly' ? 24 : 28;
  const spacing = viewMode === 'monthly' ? 8 : viewMode === 'weekly' ? 12 : 16;

  // Calculate Y-axis max value based on actual data with proper rounding
  const maxDataValue = Math.max(...chartData.map((d) => d.value), 0);
  const yAxisMaxValue = calculateYAxisMax(maxDataValue, viewMode);
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

  // Format step count for display (e.g., 14500 -> "14,500")
  const formatStepCount = (value: number): string => {
    return value.toLocaleString();
  };

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      testID={testID}
      accessibilityLabel={`Step chart showing ${chartData.length} data points`}
      accessibilityRole="image"
    >
      <Card.Content style={styles.content}>
        {selectedBar && (
          <Pressable
            style={[styles.tooltip, { backgroundColor: theme.colors.inverseSurface }]}
            onPress={clearSelection}
            accessibilityLabel={`${selectedBar.label}: ${formatStepCount(selectedBar.value)} steps. Tap to dismiss.`}
            accessibilityRole="button"
          >
            <Text
              variant="labelMedium"
              style={[styles.tooltipLabel, { color: theme.colors.inverseOnSurface }]}
            >
              {selectedBar.subLabel ?? selectedBar.label}
            </Text>
            <Text
              variant="titleMedium"
              style={[styles.tooltipValue, { color: theme.colors.inverseOnSurface }]}
            >
              {formatStepCount(selectedBar.value)} steps
            </Text>
          </Pressable>
        )}
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
  tooltip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  tooltipLabel: {
    fontWeight: '500',
  },
  tooltipValue: {
    fontWeight: '700',
  },
});
