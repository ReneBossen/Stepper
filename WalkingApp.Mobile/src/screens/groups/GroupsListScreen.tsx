import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Appbar, Text, Divider, useTheme, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { GroupCard, JoinGroupCard } from './components';
import { useGroupsStore, GroupWithLeaderboard } from '@store/groupsStore';
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
  } = useGroupsStore();

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
        <Text style={styles.emptyIcon}>{'\u{1F465}'}</Text>
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
            icon="plus"
            onPress={handleCreateGroup}
            accessibilityLabel="Create group"
          />
        </Appbar.Header>
        <LoadingSpinner />
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
            icon="plus"
            onPress={handleCreateGroup}
            accessibilityLabel="Create group"
          />
        </Appbar.Header>
        <ErrorMessage message={groupsError} onRetry={handleRefresh} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Groups" />
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
  emptyIcon: {
    fontSize: 48,
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
