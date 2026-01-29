import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';
import type { Achievement } from '@store/userStore';

interface AchievementChipProps {
  achievement: Achievement;
  onPress?: (achievement: Achievement) => void;
  testID?: string;
}

/**
 * Displays an achievement badge as a chip.
 */
export function AchievementChip({ achievement, onPress, testID }: AchievementChipProps) {
  const theme = useTheme();

  const handlePress = () => {
    onPress?.(achievement);
  };

  return (
    <Pressable
      onPress={onPress ? handlePress : undefined}
      testID={testID}
      accessibilityLabel={`${achievement.name} badge: ${achievement.description}`}
      accessibilityRole={onPress ? 'button' : 'text'}
    >
      <Chip
        icon={achievement.icon || 'medal'}
        style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]}
        textStyle={{ color: theme.colors.onSecondaryContainer }}
        compact
      >
        {achievement.name}
      </Chip>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
});
