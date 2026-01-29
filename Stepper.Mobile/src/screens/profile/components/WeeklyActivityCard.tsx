import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import type { WeeklyActivity } from '@store/userStore';

interface WeeklyActivityCardProps {
  activity: WeeklyActivity;
  units?: 'metric' | 'imperial';
  testID?: string;
}

/**
 * Displays this week's activity summary including steps, distance, average, and streak.
 */
export function WeeklyActivityCard({ activity, units = 'metric', testID }: WeeklyActivityCardProps) {
  const theme = useTheme();

  // Convert distance based on units
  const distance = units === 'metric'
    ? (activity.total_distance_meters / 1000).toFixed(1) + ' km'
    : ((activity.total_distance_meters / 1000) * 0.621371).toFixed(1) + ' mi';

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      testID={testID}
    >
      <Card.Content>
        <Text
          variant="titleMedium"
          style={[styles.title, { color: theme.colors.onSurface }]}
        >
          This Week's Activity
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text
              variant="headlineSmall"
              style={[styles.statValue, { color: theme.colors.primary }]}
            >
              {activity.total_steps.toLocaleString()}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              steps
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text
              variant="headlineSmall"
              style={[styles.statValue, { color: theme.colors.primary }]}
            >
              {distance}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              distance
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text
              variant="headlineSmall"
              style={[styles.statValue, { color: theme.colors.primary }]}
            >
              {activity.average_steps_per_day.toLocaleString()}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              avg/day
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text
              variant="headlineSmall"
              style={[styles.statValue, { color: theme.colors.tertiary }]}
            >
              {activity.current_streak}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              day streak
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
  },
  title: {
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statValue: {
    fontWeight: '700',
  },
});
