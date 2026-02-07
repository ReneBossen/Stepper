import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import {
  Appbar,
  Searchbar,
  Text,
  FAB,
  Divider,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { FriendListItem, FriendRequestsBanner } from './components';
import { useFriendsStore, Friend } from '@store/friendsStore';
import { useUserStore } from '@store/userStore';
import type { FriendsStackParamList } from '@navigation/types';
import { FRIENDS_ROUTES } from '@navigation/routes';

type NavigationProp = NativeStackNavigationProp<FriendsStackParamList, 'FriendsList'>;

const DEFAULT_DAILY_GOAL = 10000;

/**
 * Friends List screen displaying all accepted friends with their today's step counts.
 * Includes search functionality, friend requests banner, and navigation to friend discovery.
 */
export default function FriendsListScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    friends,
    requests,
    isLoading,
    error,
    fetchFriendsWithSteps,
    fetchRequests,
  } = useFriendsStore();

  const { currentUser } = useUserStore();

  const dailyGoal = currentUser?.preferences.daily_step_goal ?? DEFAULT_DAILY_GOAL;

  // Fetch data on mount
  useEffect(() => {
    fetchFriendsWithSteps();
    fetchRequests();
  }, [fetchFriendsWithSteps, fetchRequests]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchFriendsWithSteps(), fetchRequests()]);
    setIsRefreshing(false);
  }, [fetchFriendsWithSteps, fetchRequests]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleAddFriend = useCallback(() => {
    navigation.navigate(FRIENDS_ROUTES.FriendDiscovery);
  }, [navigation]);

  const handleFriendRequestsPress = useCallback(() => {
    navigation.navigate(FRIENDS_ROUTES.FriendRequests);
  }, [navigation]);

  const handleFriendPress = useCallback(
    (friend: Friend) => {
      navigation.navigate(FRIENDS_ROUTES.UserProfile, { userId: friend.user_id });
    },
    [navigation]
  );

  // Filter friends by search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) {
      return friends;
    }
    const query = searchQuery.toLowerCase().trim();
    return friends.filter(
      (friend) =>
        friend.display_name.toLowerCase().includes(query) ||
        friend.username.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  // Sort friends by today's steps (highest first)
  const sortedFriends = useMemo(() => {
    return [...filteredFriends].sort((a, b) => {
      const stepsA = a.today_steps ?? 0;
      const stepsB = b.today_steps ?? 0;
      return stepsB - stepsA;
    });
  }, [filteredFriends]);

  const renderFriendItem = useCallback(
    ({ item }: { item: Friend }) => (
      <FriendListItem
        friend={item}
        dailyGoal={dailyGoal}
        onPress={handleFriendPress}
        testID={`friend-item-${item.id}`}
      />
    ),
    [dailyGoal, handleFriendPress]
  );

  const keyExtractor = useCallback((item: Friend) => item.id, []);

  const ListHeaderComponent = useMemo(
    () => (
      <>
        <FriendRequestsBanner
          count={requests.length}
          onPress={handleFriendRequestsPress}
          testID="friend-requests-banner"
        />
        {friends.length > 0 && (
          <View style={styles.listHeader}>
            <Text
              variant="titleSmall"
              style={[styles.listHeaderText, { color: theme.colors.onSurfaceVariant }]}
            >
              My Friends ({filteredFriends.length})
            </Text>
            <Divider />
          </View>
        )}
      </>
    ),
    [requests.length, friends.length, filteredFriends.length, handleFriendRequestsPress, theme.colors]
  );

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyState}>
        {searchQuery.trim() ? (
          <>
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              No friends found
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}
            >
              Try a different search term.
            </Text>
          </>
        ) : (
          <>
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              No friends yet
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}
            >
              Tap the + button to discover and add friends.
            </Text>
          </>
        )}
      </View>
    ),
    [searchQuery, theme.colors]
  );

  // Show loading spinner only on initial load
  if (isLoading && friends.length === 0 && !isRefreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.Content title="Friends" />
          <Appbar.Action
            icon="account-plus"
            onPress={handleAddFriend}
            accessibilityLabel="Add friend"
          />
        </Appbar.Header>
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search friends..."
            onChangeText={handleSearchChange}
            value={searchQuery}
            style={styles.searchBar}
            testID="friends-search-bar"
          />
        </View>
        <LoadingSpinner />
      </View>
    );
  }

  // Show error state
  if (error && !isRefreshing && friends.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.Content title="Friends" />
          <Appbar.Action
            icon="account-plus"
            onPress={handleAddFriend}
            accessibilityLabel="Add friend"
          />
        </Appbar.Header>
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search friends..."
            onChangeText={handleSearchChange}
            value={searchQuery}
            style={styles.searchBar}
            testID="friends-search-bar"
          />
        </View>
        <ErrorMessage message={error} onRetry={handleRefresh} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Friends" />
        <Appbar.Action
          icon="account-plus"
          onPress={handleAddFriend}
          accessibilityLabel="Add friend"
        />
      </Appbar.Header>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search friends..."
          onChangeText={handleSearchChange}
          value={searchQuery}
          style={styles.searchBar}
          testID="friends-search-bar"
        />
      </View>

      <FlatList
        data={sortedFriends}
        renderItem={renderFriendItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        ItemSeparatorComponent={() => <Divider />}
        contentContainerStyle={styles.listContent}
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
        onPress={handleAddFriend}
        accessibilityLabel="Add new friend"
        testID="add-friend-fab"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    elevation: 0,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 88, // Space for FAB
  },
  listHeader: {
    marginTop: 8,
  },
  listHeaderText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
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
