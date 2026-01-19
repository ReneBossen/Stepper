import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Appbar, Text, Button, Avatar, useTheme, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { useFriendsStore, Friend } from '@store/friendsStore';

/**
 * Screen displaying pending friend requests that can be accepted or declined.
 */
export default function FriendRequestsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const {
    requests,
    isLoading,
    error,
    fetchRequests,
    acceptRequest,
    declineRequest,
  } = useFriendsStore();

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchRequests();
    setIsRefreshing(false);
  }, [fetchRequests]);

  const handleAccept = useCallback(async (userId: string) => {
    setProcessingIds((prev) => new Set(prev).add(userId));
    try {
      await acceptRequest(userId);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [acceptRequest]);

  const handleDecline = useCallback(async (userId: string) => {
    setProcessingIds((prev) => new Set(prev).add(userId));
    try {
      await declineRequest(userId);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [declineRequest]);

  const renderRequest = useCallback(
    ({ item }: { item: Friend }) => {
      const isProcessing = processingIds.has(item.user_id);
      const avatarLabel = item.display_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      return (
        <View
          style={[
            styles.requestItem,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <View style={styles.requestInfo}>
            {item.avatar_url ? (
              <Avatar.Image size={48} source={{ uri: item.avatar_url }} />
            ) : (
              <Avatar.Text
                size={48}
                label={avatarLabel}
                style={{ backgroundColor: theme.colors.primaryContainer }}
                labelStyle={{ color: theme.colors.onPrimaryContainer }}
              />
            )}
            <View style={styles.requestText}>
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurface }}
                numberOfLines={1}
              >
                {item.display_name}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
                numberOfLines={1}
              >
                @{item.username}
              </Text>
            </View>
          </View>
          <View style={styles.requestActions}>
            <Button
              mode="contained"
              onPress={() => handleAccept(item.user_id)}
              disabled={isProcessing}
              loading={isProcessing}
              compact
              style={styles.actionButton}
            >
              Accept
            </Button>
            <Button
              mode="outlined"
              onPress={() => handleDecline(item.user_id)}
              disabled={isProcessing}
              compact
              style={styles.actionButton}
            >
              Decline
            </Button>
          </View>
        </View>
      );
    },
    [theme.colors, processingIds, handleAccept, handleDecline]
  );

  const keyExtractor = useCallback((item: Friend) => item.id, []);

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Text
          variant="bodyLarge"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          No pending friend requests
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}
        >
          When someone sends you a friend request, it will appear here.
        </Text>
      </View>
    ),
    [theme.colors]
  );

  if (isLoading && requests.length === 0 && !isRefreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Friend Requests" />
        </Appbar.Header>
        <LoadingSpinner />
      </View>
    );
  }

  if (error && !isRefreshing && requests.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Friend Requests" />
        </Appbar.Header>
        <ErrorMessage message={error} onRetry={handleRefresh} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Friend Requests" />
      </Appbar.Header>

      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={keyExtractor}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  requestText: {
    marginLeft: 12,
    flex: 1,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minWidth: 80,
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
});
