import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import {
  Appbar,
  Text,
  Chip,
  Divider,
  Menu,
  Button,
  useTheme,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { LeaderboardItem } from './components';
import { useGroupsStore, LeaderboardEntry } from '@store/groupsStore';
import { groupsApi } from '@services/api/groupsApi';
import { getCompetitionTypeLabelFull, getPeriodLabel } from '@utils/groupUtils';
import { track } from '@services/analytics';
import type { GroupsStackScreenProps, GroupsStackParamList } from '@navigation/types';

type Props = GroupsStackScreenProps<'GroupDetail'>;
type NavigationProp = NativeStackNavigationProp<GroupsStackParamList, 'GroupDetail'>;

/**
 * Group Detail screen showing full group information and leaderboard.
 * Includes real-time leaderboard updates via Supabase subscription.
 */
export default function GroupDetailScreen({ route }: Props) {
  const { groupId } = route.params;
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const {
    currentGroup,
    leaderboard,
    isLoadingDetail,
    detailError,
    fetchGroup,
    fetchLeaderboard,
    leaveGroup,
    clearCurrentGroup,
  } = useGroupsStore();
  const hasTrackedLeaderboard = useRef(false);

  // Fetch group and leaderboard data
  const loadData = useCallback(async () => {
    await Promise.all([
      fetchGroup(groupId),
      fetchLeaderboard(groupId),
    ]);

    // Track leaderboard viewed event (only once per screen visit)
    if (!hasTrackedLeaderboard.current) {
      track('leaderboard_viewed', {
        leaderboard_type: 'group',
        group_id: groupId,
      });
      hasTrackedLeaderboard.current = true;
    }
  }, [groupId, fetchGroup, fetchLeaderboard]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clear state when leaving screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearCurrentGroup();
      };
    }, [clearCurrentGroup])
  );

  // Set up real-time subscription for leaderboard updates
  useEffect(() => {
    const unsubscribe = groupsApi.subscribeToLeaderboard(groupId, () => {
      fetchLeaderboard(groupId);
    });

    return () => {
      unsubscribe();
    };
  }, [groupId, fetchLeaderboard]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const handleSettingsPress = useCallback(() => {
    navigation.navigate('GroupManagement', { groupId });
  }, [navigation, groupId]);

  const handleMenuOpen = useCallback(() => {
    setMenuVisible(true);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const handleViewInfo = useCallback(() => {
    setMenuVisible(false);
    // Could show a modal or navigate to an info screen
    if (currentGroup) {
      Alert.alert(
        currentGroup.name,
        currentGroup.description || 'No description available.',
        [{ text: 'OK' }]
      );
    }
  }, [currentGroup]);

  const handleLeaveGroup = useCallback(async () => {
    setMenuVisible(false);

    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group? You will need to rejoin to access it again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setIsLeaving(true);
            try {
              await leaveGroup(groupId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to leave group. Please try again.');
            } finally {
              setIsLeaving(false);
            }
          },
        },
      ]
    );
  }, [groupId, leaveGroup, navigation]);

  const handleInviteMembers = useCallback(() => {
    // Navigate to invite members screen
    navigation.navigate('InviteMembers', { groupId });
  }, [navigation, groupId]);

  const handleMemberPress = useCallback((entry: LeaderboardEntry) => {
    // Navigate to member profile
    // For now, we don't have a profile screen in GroupsStack
    // This would typically navigate to a UserProfile screen
  }, []);

  const renderLeaderboardItem = useCallback(
    ({ item }: { item: LeaderboardEntry }) => (
      <LeaderboardItem
        entry={item}
        onPress={handleMemberPress}
        testID={`leaderboard-item-${item.user_id}`}
      />
    ),
    [handleMemberPress]
  );

  const keyExtractor = useCallback((item: LeaderboardEntry) => item.user_id, []);

  const ListHeaderComponent = useCallback(
    () => {
      if (!currentGroup) return null;

      const competitionTypeLabel = getCompetitionTypeLabelFull(currentGroup.competition_type);
      const periodLabel = getPeriodLabel(currentGroup.competition_type);

      return (
        <View style={styles.header}>
          <View style={styles.groupInfo}>
            <Text style={styles.groupIcon}>{'\u{1F3C6}'}</Text>
            <Text
              variant="headlineSmall"
              style={[styles.groupName, { color: theme.colors.onSurface }]}
            >
              {currentGroup.name}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {currentGroup.member_count} {currentGroup.member_count === 1 ? 'member' : 'members'}
            </Text>
            <Chip
              compact
              textStyle={styles.chipText}
              style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]}
            >
              {competitionTypeLabel}
            </Chip>
          </View>

          <View style={[styles.periodBadge, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.onPrimaryContainer }}
            >
              {periodLabel}: {currentGroup.period_display}
            </Text>
          </View>

          <View style={styles.leaderboardHeader}>
            <Text
              variant="titleMedium"
              style={[styles.leaderboardTitle, { color: theme.colors.onSurface }]}
            >
              Leaderboard
            </Text>
            <Divider />
          </View>
        </View>
      );
    },
    [currentGroup, theme.colors]
  );

  const ListFooterComponent = useCallback(
    () => (
      <View style={styles.footer}>
        <Button
          mode="outlined"
          icon="account-plus"
          onPress={handleInviteMembers}
          style={styles.inviteButton}
        >
          Invite Members
        </Button>
      </View>
    ),
    [handleInviteMembers]
  );

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyLeaderboard}>
        <Text
          variant="bodyLarge"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          No activity yet
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}
        >
          Start walking to appear on the leaderboard!
        </Text>
      </View>
    ),
    [theme.colors]
  );

  // Determine if user is admin or owner
  const isAdminOrOwner = currentGroup?.user_role === 'owner' || currentGroup?.user_role === 'admin';

  // Show loading spinner only on initial load
  if (isLoadingDetail && !currentGroup && !isRefreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Group Details" />
        </Appbar.Header>
        <LoadingSpinner />
      </View>
    );
  }

  // Show error state
  if (detailError && !isRefreshing && !currentGroup) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Group Details" />
        </Appbar.Header>
        <ErrorMessage message={detailError} onRetry={handleRefresh} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={currentGroup?.name || 'Group Details'} />
        {isAdminOrOwner && (
          <Appbar.Action
            icon="cog"
            onPress={handleSettingsPress}
            accessibilityLabel="Group settings"
          />
        )}
        <Menu
          visible={menuVisible}
          onDismiss={handleMenuClose}
          anchor={
            <Appbar.Action
              icon="dots-vertical"
              onPress={handleMenuOpen}
              accessibilityLabel="More options"
            />
          }
        >
          <Menu.Item
            onPress={handleViewInfo}
            title="View Info"
            leadingIcon="information-outline"
          />
          <Divider />
          <Menu.Item
            onPress={handleLeaveGroup}
            title="Leave Group"
            leadingIcon="logout"
            disabled={isLeaving}
          />
        </Menu>
      </Appbar.Header>

      <FlatList
        data={leaderboard}
        renderItem={renderLeaderboardItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        ItemSeparatorComponent={() => <Divider />}
        contentContainerStyle={[
          styles.listContent,
          leaderboard.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  groupName: {
    fontWeight: '600',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  chip: {
    height: 26,
  },
  chipText: {
    fontSize: 12,
    marginVertical: 0,
    marginHorizontal: 0,
  },
  periodBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 16,
  },
  leaderboardHeader: {
    marginTop: 24,
  },
  leaderboardTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  inviteButton: {
    borderStyle: 'dashed',
  },
  emptyLeaderboard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
  },
});
