import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Appbar, Text, Divider, Icon, useTheme, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { GroupCard, InviteCodeDialog, JoinGroupCard } from './components';
import { useGroupsStore, GroupWithLeaderboard } from '@store/groupsStore';
import { getErrorMessage } from '@utils/errorUtils';
import { isAlphanumeric } from '@utils/stringUtils';
import { INVITE_CODE } from '@utils/constants';
import type { GroupsStackParamList } from '@navigation/types';

type NavigationProp = NativeStackNavigationProp<GroupsStackParamList, 'GroupsList'>;

/**
 * Groups List screen displaying all groups the user is a member of.
 * Shows leaderboard preview for each group and navigation to create/join groups.
 */
export default function GroupsListScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    myGroups,
    isLoadingGroups,
    groupsError,
    fetchMyGroups,
    joinGroupByCode,
  } = useGroupsStore();

  // Invite code dialog state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeError, setInviteCodeError] = useState<string | null>(null);
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchMyGroups();
  }, [fetchMyGroups]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchMyGroups();
    setIsRefreshing(false);
  }, [fetchMyGroups]);

  const handleCreateGroup = useCallback(() => {
    navigation.navigate('CreateGroup');
  }, [navigation]);

  const handleJoinGroup = useCallback(() => {
    navigation.navigate('JoinGroup', {});
  }, [navigation]);

  const handleInviteCodeChange = useCallback((code: string) => {
    setInviteCode(code.toUpperCase());
    if (inviteCodeError) setInviteCodeError(null);
  }, [inviteCodeError]);

  const handleDismissDialog = useCallback(() => {
    setShowInviteDialog(false);
    setInviteCodeError(null);
  }, []);

  const handleJoinWithCode = useCallback(async () => {
    const trimmedCode = inviteCode.trim();
    if (!trimmedCode) {
      setInviteCodeError('Please enter an invite code');
      return;
    }
    if (trimmedCode.length < INVITE_CODE.MIN_LENGTH || trimmedCode.length > INVITE_CODE.MAX_LENGTH) {
      setInviteCodeError(`Invite code must be ${INVITE_CODE.MIN_LENGTH}-${INVITE_CODE.MAX_LENGTH} characters`);
      return;
    }
    if (!isAlphanumeric(trimmedCode)) {
      setInviteCodeError('Invite code must contain only letters and numbers');
      return;
    }
    setIsJoiningByCode(true);
    setInviteCodeError(null);
    try {
      const groupId = await joinGroupByCode(trimmedCode);
      setShowInviteDialog(false);
      setInviteCode('');
      navigation.navigate('GroupDetail', { groupId });
    } catch (error) {
      setInviteCodeError(getErrorMessage(error));
    } finally {
      setIsJoiningByCode(false);
    }
  }, [inviteCode, joinGroupByCode, navigation]);

  const handleGroupPress = useCallback(
    (group: GroupWithLeaderboard) => {
      navigation.navigate('GroupDetail', { groupId: group.id });
    },
    [navigation]
  );

  const renderGroupItem = useCallback(
    ({ item }: { item: GroupWithLeaderboard }) => (
      <GroupCard
        group={item}
        onPress={handleGroupPress}
        testID={`group-card-${item.id}`}
      />
    ),
    [handleGroupPress]
  );

  const keyExtractor = useCallback((item: GroupWithLeaderboard) => item.id, []);

  const ListHeaderComponent = useCallback(
    () => (
      <>
        {myGroups.length > 0 && (
          <View style={styles.listHeader}>
            <Text
              variant="titleSmall"
              style={[styles.listHeaderText, { color: theme.colors.onSurfaceVariant }]}
            >
              My Groups ({myGroups.length})
            </Text>
            <Divider />
          </View>
        )}
      </>
    ),
    [myGroups.length, theme.colors]
  );

  const ListFooterComponent = useCallback(
    () => (
      <View style={styles.footer}>
        <JoinGroupCard onPress={handleJoinGroup} testID="join-group-card" />
      </View>
    ),
    [handleJoinGroup]
  );

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Icon source="account-group" size={48} color={theme.colors.onSurfaceVariant} />
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.onSurface, marginTop: 16 }}
        >
          No groups yet
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}
        >
          Create a group to compete with friends or join an existing one.
        </Text>
      </View>
    ),
    [theme.colors]
  );

  // Show loading spinner only on initial load
  if (isLoadingGroups && myGroups.length === 0 && !isRefreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.Content title="Groups" />
          <Appbar.Action
            icon="ticket-outline"
            onPress={() => setShowInviteDialog(true)}
            accessibilityLabel="Join with invite code"
          />
          <Appbar.Action
            icon="plus"
            onPress={handleCreateGroup}
            accessibilityLabel="Create group"
          />
        </Appbar.Header>
        <LoadingSpinner />
        <InviteCodeDialog
          visible={showInviteDialog}
          inviteCode={inviteCode}
          inviteCodeError={inviteCodeError}
          isJoining={isJoiningByCode}
          onChangeCode={handleInviteCodeChange}
          onDismiss={handleDismissDialog}
          onJoin={handleJoinWithCode}
        />
      </View>
    );
  }

  // Show error state
  if (groupsError && !isRefreshing && myGroups.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.Content title="Groups" />
          <Appbar.Action
            icon="ticket-outline"
            onPress={() => setShowInviteDialog(true)}
            accessibilityLabel="Join with invite code"
          />
          <Appbar.Action
            icon="plus"
            onPress={handleCreateGroup}
            accessibilityLabel="Create group"
          />
        </Appbar.Header>
        <ErrorMessage message={groupsError} onRetry={handleRefresh} />
        <InviteCodeDialog
          visible={showInviteDialog}
          inviteCode={inviteCode}
          inviteCodeError={inviteCodeError}
          isJoining={isJoiningByCode}
          onChangeCode={handleInviteCodeChange}
          onDismiss={handleDismissDialog}
          onJoin={handleJoinWithCode}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Groups" />
        <Appbar.Action
          icon="ticket-outline"
          onPress={() => setShowInviteDialog(true)}
          accessibilityLabel="Join with invite code"
        />
        <Appbar.Action
          icon="plus"
          onPress={handleCreateGroup}
          accessibilityLabel="Create group"
        />
      </Appbar.Header>

      <FlatList
        data={myGroups}
        renderItem={renderGroupItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={[
          styles.listContent,
          myGroups.length === 0 && styles.emptyListContent,
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

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={handleCreateGroup}
        accessibilityLabel="Create new group"
        testID="create-group-fab"
      />

      <InviteCodeDialog
        visible={showInviteDialog}
        inviteCode={inviteCode}
        inviteCodeError={inviteCodeError}
        isJoining={isJoiningByCode}
        onChangeCode={handleInviteCodeChange}
        onDismiss={handleDismissDialog}
        onJoin={handleJoinWithCode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 88, // Space for FAB
  },
  emptyListContent: {
    flexGrow: 1,
  },
  listHeader: {
    marginTop: 8,
  },
  listHeaderText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontWeight: '600',
  },
  footer: {
    marginTop: 8,
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyIconContainer: {
    alignItems: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
