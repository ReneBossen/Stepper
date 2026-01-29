import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import type { DailyStepEntry } from '@store/stepsStore';

interface StatsSummaryProps {
  entries: DailyStepEntry[];
  dateRange: { start: Date; end: Date };
  units: 'metric' | 'imperial';
  testID?: string;
}

/**
 * Displays aggregated statistics summary card.
 * Shows total steps, average steps per day, and total distance.
 */
export function StatsSummary({
  entries,
  dateRange,
  units,
  testID,
}: StatsSummaryProps) {
  const theme = useTheme();

  // Calculate totals
  const totalSteps = entries.reduce((sum, entry) => sum + entry.steps, 0);
  const totalDistanceMeters = entries.reduce(
    (sum, entry) => sum + entry.distanceMeters,
    0
  );

  // Calculate average steps per day (based on entries with data)
  const averageSteps =
    entries.length > 0 ? Math.round(totalSteps / entries.length) : 0;

  // Format date range
  const formattedStart = dateRange.start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const formattedEnd = dateRange.end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  // Format distance
  const formattedDistance =
    units === 'metric'
      ? `${(totalDistanceMeters / 1000).toFixed(1)} km`
      : `${(totalDistanceMeters / 1609.344).toFixed(1)} mi`;

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      testID={testID}
      accessibilityLabel={`Period: ${formattedStart} to ${formattedEnd}. Total: ${totalSteps.toLocaleString()} steps. Average: ${averageSteps.toLocaleString()} steps per day. Distance: ${formattedDistance}`}
      accessibilityRole="text"
    >
      <Card.Content>
        <Text
          variant="labelMedium"
          style={[styles.dateRange, { color: theme.colors.onSurfaceVariant }]}
        >
          {formattedStart} - {formattedEnd}
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text
              variant="headlineSmall"
              style={[styles.statValue, { color: theme.colors.primary }]}
            >
              {totalSteps.toLocaleString()}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Total steps
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text
              variant="headlineSmall"
              style={[styles.statValue, { color: theme.colors.onSurface }]}
            >
              {averageSteps.toLocaleString()}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Daily average
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text
              variant="headlineSmall"
              style={[styles.statValue, { color: theme.colors.secondary }]}
            >
              {formattedDistance}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Distance
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    elevation: 2,
  },
  dateRange: {
    textAlign: 'center',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '700',
    marginBottom: 2,
  },
});
