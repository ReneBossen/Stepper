import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Avatar, Icon, useTheme } from 'react-native-paper';
import type { LeaderboardEntry } from '@store/groupsStore';

interface LeaderboardItemProps {
  entry: LeaderboardEntry;
  onPress?: (entry: LeaderboardEntry) => void;
  testID?: string;
}

/**
 * Medal icon configuration for top 3 positions.
 */
interface MedalConfig {
  source: string;
  color: string;
}

const MEDAL_ICONS: Record<number, MedalConfig> = {
  1: { source: 'medal', color: '#FFD700' },     // Gold
  2: { source: 'medal', color: '#C0C0C0' },     // Silver
  3: { source: 'medal', color: '#CD7F32' },      // Bronze
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

  const medalConfig = MEDAL_ICONS[entry.rank];

  const getRankChangeDisplay = () => {
    if (entry.rank_change === 0) {
      return (
        <View style={styles.rankChangeRow}>
          <Icon source="minus" size={14} color={theme.colors.onSurfaceVariant} />
          <Text
            variant="labelSmall"
            style={[styles.rankChange, { color: theme.colors.onSurfaceVariant }]}
          >
            {' '}0
          </Text>
        </View>
      );
    }

    if (entry.rank_change > 0) {
      return (
        <View style={styles.rankChangeRow}>
          <Icon source="arrow-up-bold" size={14} color={theme.colors.primary} />
          <Text
            variant="labelSmall"
            style={[styles.rankChange, { color: theme.colors.primary }]}
          >
            {' '}+{entry.rank_change}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.rankChangeRow}>
        <Icon source="arrow-down-bold" size={14} color={theme.colors.error} />
        <Text
          variant="labelSmall"
          style={[styles.rankChange, { color: theme.colors.error }]}
        >
          {' '}{entry.rank_change}
        </Text>
      </View>
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
        {medalConfig ? (
          <Icon source={medalConfig.source} size={24} color={medalConfig.color} />
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
  medalIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
  rankChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankChange: {
    fontWeight: '500',
  },
});
