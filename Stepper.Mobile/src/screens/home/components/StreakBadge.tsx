import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface StreakBadgeProps {
  streak: number;
}

/**
 * Displays the current streak count with a fire icon.
 * Shows the number of consecutive days the user has been active.
 */
export const StreakBadge: React.FC<StreakBadgeProps> = ({ streak }) => {
  const theme = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.tertiaryContainer }]}
      accessibilityLabel={`${streak} day streak`}
      accessibilityRole="text"
    >
      <Text style={styles.icon}>🔥</Text>
      <Text
        variant="labelLarge"
        style={[styles.text, { color: theme.colors.onTertiaryContainer }]}
      >
        {streak} {streak === 1 ? 'day' : 'days'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    fontWeight: '600',
  },
});
