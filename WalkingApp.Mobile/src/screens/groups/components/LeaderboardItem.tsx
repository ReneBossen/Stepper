import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Avatar, useTheme } from 'react-native-paper';
import type { LeaderboardEntry } from '@store/groupsStore';

interface LeaderboardItemProps {
  entry: LeaderboardEntry;
  onPress?: (entry: LeaderboardEntry) => void;
  testID?: string;
}

/**
 * Medal icons for top 3 positions.
 */
const MEDAL_ICONS: Record<number, string> = {
  1: '\u{1F947}', // Gold medal
  2: '\u{1F948}', // Silver medal
  3: '\u{1F949}', // Bronze medal
};

/**
 * Displays a single leaderboard entry with rank, avatar, name, steps, and rank change.
 */
export function LeaderboardItem({ entry, onPress, testID }: LeaderboardItemProps) {
  const theme = useTheme();

  const handlePress = () => {
    onPress?.(entry);
  };

  const avatarLabel = entry.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const medalIcon = MEDAL_ICONS[entry.rank];

  const getRankChangeDisplay = () => {
    if (entry.rank_change === 0) {
      return (
        <Text
          variant="labelSmall"
          style={[styles.rankChange, { color: theme.colors.onSurfaceVariant }]}
        >
          {'\u2500'} 0
        </Text>
      );
    }

    if (entry.rank_change > 0) {
      return (
        <Text
          variant="labelSmall"
          style={[styles.rankChange, { color: theme.colors.primary }]}
        >
          {'\u{1F446}'} +{entry.rank_change}
        </Text>
      );
    }

    return (
      <Text
        variant="labelSmall"
        style={[styles.rankChange, { color: theme.colors.error }]}
      >
        {'\u{1F447}'} {entry.rank_change}
      </Text>
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.container,
        entry.is_current_user && {
          backgroundColor: theme.colors.primaryContainer,
        },
        pressed && onPress && { opacity: 0.7 },
      ]}
      testID={testID}
      accessibilityLabel={`Rank ${entry.rank}, ${entry.display_name}, ${entry.steps.toLocaleString()} steps`}
      accessibilityRole="button"
    >
      <View style={styles.rankContainer}>
        {medalIcon ? (
          <Text style={styles.medalIcon}>{medalIcon}</Text>
        ) : (
          <Text
            variant="titleMedium"
            style={[
              styles.rankNumber,
              {
                color: entry.is_current_user
                  ? theme.colors.onPrimaryContainer
                  : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            {entry.rank}
          </Text>
        )}
      </View>

      <View style={styles.avatarContainer}>
        {entry.avatar_url ? (
          <Avatar.Image size={44} source={{ uri: entry.avatar_url }} />
        ) : (
          <Avatar.Text
            size={44}
            label={avatarLabel}
            style={{
              backgroundColor: entry.is_current_user
                ? theme.colors.primary
                : theme.colors.secondaryContainer,
            }}
            labelStyle={{
              color: entry.is_current_user
                ? theme.colors.onPrimary
                : theme.colors.onSecondaryContainer,
            }}
          />
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text
          variant="titleMedium"
          style={[
            styles.displayName,
            {
              color: entry.is_current_user
                ? theme.colors.onPrimaryContainer
                : theme.colors.onSurface,
            },
          ]}
          numberOfLines={1}
        >
          {entry.is_current_user ? `You (${entry.display_name})` : entry.display_name}
        </Text>
        <Text
          variant="bodyMedium"
          style={{
            color: entry.is_current_user
              ? theme.colors.onPrimaryContainer
              : theme.colors.onSurfaceVariant,
          }}
        >
          {entry.steps.toLocaleString()} steps
        </Text>
      </View>

      <View style={styles.rankChangeContainer}>
        {getRankChangeDisplay()}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  medalIcon: {
    fontSize: 24,
  },
  rankNumber: {
    fontWeight: '600',
  },
  avatarContainer: {
    marginLeft: 8,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  displayName: {
    fontWeight: '600',
  },
  rankChangeContainer: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  rankChange: {
    fontWeight: '500',
  },
});
