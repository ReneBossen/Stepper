import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

export interface ChartStats {
  total: number;           // Total steps
  average: number;         // Average steps per day/week/month
  distanceMeters: number;  // Total distance in meters
}

interface StatsSummaryProps {
  stats: ChartStats;
  periodLabel: string;     // e.g., "Jan 1 - Jan 7, 2026"
  units: 'metric' | 'imperial';
  testID?: string;
}

/**
 * Displays aggregated statistics summary card.
 * Shows total steps, average steps per day, and total distance.
 */
export function StatsSummary({
  stats,
  periodLabel,
  units,
  testID,
}: StatsSummaryProps) {
  const theme = useTheme();

  // Format distance
  const formattedDistance =
    units === 'metric'
      ? `${(stats.distanceMeters / 1000).toFixed(1)} km`
      : `${(stats.distanceMeters / 1609.344).toFixed(1)} mi`;

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      testID={testID}
      accessibilityLabel={`Period: ${periodLabel}. Total: ${stats.total.toLocaleString()} steps. Average: ${stats.average.toLocaleString()} steps per day. Distance: ${formattedDistance}`}
      accessibilityRole="text"
    >
      <Card.Content>
        <Text
          variant="labelMedium"
          style={[styles.dateRange, { color: theme.colors.onSurfaceVariant }]}
        >
          {periodLabel}
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text
              variant="headlineSmall"
              style={[styles.statValue, { color: theme.colors.primary }]}
            >
              {stats.total.toLocaleString()}
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
              {stats.average.toLocaleString()}
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
