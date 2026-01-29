import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { StreakBadge } from './StreakBadge';

interface StepCounterCardProps {
  steps: number;
  goal: number;
  distance: number;
  streak: number;
  units: 'metric' | 'imperial';
  onPress?: () => void;
}

/**
 * Main step counter card with circular progress indicator.
 * Shows today's step count, progress percentage, distance, and streak.
 */
export const StepCounterCard: React.FC<StepCounterCardProps> = ({
  steps,
  goal,
  distance,
  streak,
  units,
  onPress,
}) => {
  const theme = useTheme();

  const progress = Math.min((steps / goal) * 100, 100);
  const progressRounded = Math.round(progress);

  // Convert distance from meters
  const formattedDistance =
    units === 'metric'
      ? `${(distance / 1000).toFixed(1)} km`
      : `${(distance / 1609.344).toFixed(1)} mi`;

  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={`Today's steps: ${steps.toLocaleString()} of ${goal.toLocaleString()} goal. ${progressRounded}% complete. Distance: ${formattedDistance}. ${streak} day streak. ${onPress ? 'Tap to view history' : ''}`}
    >
      <Card
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
        testID="step-counter-card"
      >
        <Card.Content style={styles.content}>
          <View style={styles.progressContainer}>
            <AnimatedCircularProgress
              size={200}
              width={16}
              fill={progress}
              tintColor={theme.colors.primary}
              backgroundColor={theme.colors.surfaceVariant}
              rotation={0}
              lineCap="round"
            >
              {() => (
                <View style={styles.centerContent}>
                  <Text
                    variant="displayMedium"
                    style={[styles.stepCount, { color: theme.colors.onSurface }]}
                  >
                    {steps.toLocaleString()}
                  </Text>
                  <Text
                    variant="bodyLarge"
                    style={[styles.stepsLabel, { color: theme.colors.onSurfaceVariant }]}
                  >
                    steps
                  </Text>
                </View>
              )}
            </AnimatedCircularProgress>
          </View>

          <View style={styles.progressTextContainer}>
            <Text
              variant="bodyMedium"
              style={[styles.progressText, { color: theme.colors.primary }]}
            >
              {progressRounded}%
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.goalText, { color: theme.colors.onSurfaceVariant }]}
            >
              Goal: {goal.toLocaleString()} steps
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.distanceContainer}>
              <Text style={styles.statIcon}>📏</Text>
              <Text
                variant="labelLarge"
                style={{ color: theme.colors.onSurface }}
              >
                {formattedDistance}
              </Text>
            </View>
            <StreakBadge streak={streak} />
          </View>
        </Card.Content>
      </Card>
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    elevation: 4,
    marginHorizontal: 16,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  progressContainer: {
    marginBottom: 16,
  },
  centerContent: {
    alignItems: 'center',
  },
  stepCount: {
    fontWeight: '700',
  },
  stepsLabel: {
    marginTop: -4,
  },
  progressTextContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  progressText: {
    fontWeight: '600',
  },
  goalText: {
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    width: '100%',
    paddingHorizontal: 16,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    fontSize: 16,
  },
});
