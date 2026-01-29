import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Avatar, ProgressBar, useTheme } from 'react-native-paper';
import type { Friend } from '@store/friendsStore';

interface FriendListItemProps {
  friend: Friend;
  dailyGoal?: number;
  onPress?: (friend: Friend) => void;
  testID?: string;
}

const DEFAULT_DAILY_GOAL = 10000;

/**
 * Displays a friend in the friends list with avatar, name, today's steps, and progress bar.
 */
export function FriendListItem({
  friend,
  dailyGoal = DEFAULT_DAILY_GOAL,
  onPress,
  testID,
}: FriendListItemProps) {
  const theme = useTheme();

  const steps = friend.today_steps ?? 0;
  const progress = Math.min(steps / dailyGoal, 1);
  const percentage = Math.round((steps / dailyGoal) * 100);

  const progressColor =
    percentage >= 100 ? theme.colors.primary : theme.colors.secondary;

  const handlePress = () => {
    onPress?.(friend);
  };

  const avatarLabel = friend.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface },
      ]}
      testID={testID}
      accessibilityLabel={`${friend.display_name}, ${steps.toLocaleString()} steps today, ${percentage}% of goal`}
      accessibilityRole="button"
    >
      <View style={styles.avatarContainer}>
        {friend.avatar_url ? (
          <Avatar.Image
            size={48}
            source={{ uri: friend.avatar_url }}
          />
        ) : (
          <Avatar.Text
            size={48}
            label={avatarLabel}
            style={{ backgroundColor: theme.colors.primaryContainer }}
            labelStyle={{ color: theme.colors.onPrimaryContainer }}
          />
        )}
      </View>

      <View style={styles.contentContainer}>
        <Text
          variant="titleMedium"
          style={[styles.name, { color: theme.colors.onSurface }]}
          numberOfLines={1}
        >
          {friend.display_name}
        </Text>

        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {steps > 0
            ? `${steps.toLocaleString()} steps today`
            : 'No activity today'}
        </Text>

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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarContainer: {
    marginRight: 16,
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontWeight: '600',
    marginBottom: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
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
