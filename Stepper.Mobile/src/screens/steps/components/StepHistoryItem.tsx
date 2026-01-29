import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar, useTheme } from 'react-native-paper';
import type { DailyStepEntry } from '@store/stepsStore';

interface StepHistoryItemProps {
  entry: DailyStepEntry;
  dailyGoal: number;
  units: 'metric' | 'imperial';
  testID?: string;
}

/**
 * Displays a single day's step history with progress bar.
 * Shows date, steps, distance, and goal completion percentage.
 */
export function StepHistoryItem({
  entry,
  dailyGoal,
  units,
  testID,
}: StepHistoryItemProps) {
  const theme = useTheme();

  const progress = Math.min(entry.steps / dailyGoal, 1);
  const percentage = Math.round((entry.steps / dailyGoal) * 100);

  // Format date to display day name and date
  const dateObj = new Date(entry.date + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // Convert distance from meters
  const formattedDistance =
    units === 'metric'
      ? `${(entry.distanceMeters / 1000).toFixed(1)} km`
      : `${(entry.distanceMeters / 1609.344).toFixed(1)} mi`;

  const progressColor =
    percentage >= 100 ? theme.colors.primary : theme.colors.secondary;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant },
      ]}
      testID={testID}
      accessibilityLabel={`${formattedDate}: ${entry.steps.toLocaleString()} steps, ${formattedDistance}, ${percentage}% of goal`}
      accessibilityRole="text"
    >
      <View style={styles.header}>
        <Text
          variant="titleSmall"
          style={[styles.date, { color: theme.colors.onSurface }]}
        >
          {formattedDate}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurface }}
        >
          {entry.steps.toLocaleString()} steps
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {formattedDistance}
        </Text>
      </View>

      <View style={styles.progressRow}>
        <ProgressBar
          progress={progress}
          color={progressColor}
          style={[
            styles.progressBar,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        />
        <Text
          variant="labelSmall"
          style={[styles.percentage, { color: progressColor }]}
        >
          {percentage}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    marginBottom: 4,
  },
  date: {
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  percentage: {
    minWidth: 40,
    textAlign: 'right',
    fontWeight: '600',
  },
});
