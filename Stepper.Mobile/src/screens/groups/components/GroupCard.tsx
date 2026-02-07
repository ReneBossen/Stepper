import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, Chip, Icon, useTheme } from 'react-native-paper';
import type { GroupWithLeaderboard, LeaderboardEntry } from '@store/groupsStore';
import { getCompetitionTypeLabel } from '@utils/groupUtils';

interface GroupCardProps {
  group: GroupWithLeaderboard;
  onPress: (group: GroupWithLeaderboard) => void;
  testID?: string;
}

/**
 * Displays a group card with leaderboard preview for the groups list.
 */
export function GroupCard({ group, onPress, testID }: GroupCardProps) {
  const theme = useTheme();

  const handlePress = () => {
    onPress(group);
  };

  const competitionTypeLabel = getCompetitionTypeLabel(group.competition_type);

  const accessibilityLabel = `${group.name} group with ${group.member_count} ${group.member_count === 1 ? 'member' : 'members'}`;

  const getAvatarLabel = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderLeaderboardPreview = () => {
    if (group.leaderboard_preview.length === 0) {
      return (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          No activity yet
        </Text>
      );
    }

    return group.leaderboard_preview.map((entry: LeaderboardEntry) => (
      <View
        key={entry.user_id}
        style={[
          styles.leaderboardRow,
          entry.is_current_user && {
            backgroundColor: theme.colors.primaryContainer,
            borderRadius: 8,
            marginHorizontal: -8,
            paddingHorizontal: 8,
          },
        ]}
      >
        <Text
          variant="bodyMedium"
          style={[
            styles.rankText,
            { color: entry.is_current_user ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant },
          ]}
        >
          {entry.rank}.
        </Text>
        <Text
          variant="bodyMedium"
          style={[
            styles.nameText,
            { color: entry.is_current_user ? theme.colors.onPrimaryContainer : theme.colors.onSurface },
            entry.is_current_user && { fontWeight: '600' },
          ]}
          numberOfLines={1}
        >
          {entry.is_current_user ? 'You' : entry.display_name}
        </Text>
        <Text
          variant="bodyMedium"
          style={[
            styles.stepsText,
            { color: entry.is_current_user ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant },
          ]}
        >
          ({entry.steps.toLocaleString()})
        </Text>
      </View>
    ));
  };

  return (
    <Pressable onPress={handlePress} testID={testID} accessibilityLabel={accessibilityLabel}>
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.groupIconContainer}>
                <Icon source="trophy" size={20} color={theme.colors.primary} />
              </View>
              <Text
                variant="titleMedium"
                style={[styles.groupName, { color: theme.colors.onSurface }]}
                numberOfLines={1}
              >
                {group.name}
              </Text>
            </View>
            <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
          </View>

          <View style={styles.metaRow}>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
            </Text>
            <Chip
              compact
              textStyle={styles.chipText}
              style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]}
            >
              {competitionTypeLabel}
            </Chip>
          </View>

          {group.current_user_rank !== undefined && (
            <View style={[styles.userRankBadge, { backgroundColor: theme.colors.primary }]}>
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.onPrimary, fontWeight: '600' }}
              >
                You're #{group.current_user_rank}
              </Text>
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onPrimary, marginLeft: 8 }}
              >
                {(group.current_user_steps || 0).toLocaleString()} steps
              </Text>
            </View>
          )}

          <View style={styles.leaderboardPreview}>
            {renderLeaderboardPreview()}
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupIconContainer: {
    marginRight: 8,
    justifyContent: 'center',
  },
  groupName: {
    fontWeight: '600',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  chip: {
    height: 24,
  },
  chipText: {
    fontSize: 11,
    marginVertical: 0,
    marginHorizontal: 0,
  },
  userRankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  leaderboardPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rankText: {
    width: 24,
  },
  nameText: {
    flex: 1,
  },
  stepsText: {
    marginLeft: 8,
  },
});
