import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Appbar, Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { NotificationItem } from './components/NotificationItem';
import { useNotificationsStore, Notification } from '@store/notificationsStore';
import { useAuthStore } from '@store/authStore';

/**
 * Notifications screen - displays all user notifications.
 * Shown as a modal from the main navigator.
 */
export default function NotificationsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { user } = useAuthStore();

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    subscribeToNotifications,
    unsubscribeFromNotifications,
  } = useNotificationsStore();

  // Fetch notifications on mount and subscribe to realtime updates
  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime notifications if user is authenticated
    if (user?.id) {
      subscribeToNotifications(user.id);
    }

    // Cleanup subscription on unmount
    return () => {
      unsubscribeFromNotifications();
    };
  }, [fetchNotifications, subscribeToNotifications, unsubscribeFromNotifications, user?.id]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
  }, [fetchNotifications]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
    } catch {
      Alert.alert('Error', 'Failed to mark all as read. Please try again.');
    }
  }, [markAllAsRead]);

  const handleNotificationPress = useCallback(
    async (notification: Notification) => {
      if (!notification.is_read) {
        try {
          await markAsRead(notification.id);
        } catch {
          // Silently fail - user can still see the notification
        }
      }
    },
    [markAsRead]
  );

  const handleDeleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        await deleteNotification(notificationId);
      } catch {
        Alert.alert('Error', 'Failed to delete notification. Please try again.');
      }
    },
    [deleteNotification]
  );

  const renderNotificationItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationItem
        notification={item}
        onPress={handleNotificationPress}
        onDelete={handleDeleteNotification}
        testID={`notification-item-${item.id}`}
      />
    ),
    [handleNotificationPress, handleDeleteNotification]
  );

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Text
          variant="titleMedium"
          style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
        >
          No notifications
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}
        >
          You're all caught up! New notifications will appear here.
        </Text>
      </View>
    ),
    [theme.colors]
  );

  // Show loading spinner on initial load (no data yet)
  if (isLoading && notifications.length === 0 && !isRefreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={handleGoBack} testID="back-action" />
          <Appbar.Content title="Notifications" />
        </Appbar.Header>
        <LoadingSpinner />
      </View>
    );
  }

  // Show error state only when there's no data to show
  if (error && notifications.length === 0 && !isRefreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={handleGoBack} testID="back-action" />
          <Appbar.Content title="Notifications" />
        </Appbar.Header>
        <ErrorMessage message={error} onRetry={handleRefresh} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={handleGoBack} testID="back-action" />
        <Appbar.Content title="Notifications" />
        {unreadCount > 0 && (
          <Appbar.Action
            icon="check-all"
            onPress={handleMarkAllAsRead}
            accessibilityLabel="Mark all as read"
            testID="mark-all-read-action"
          />
        )}
      </Appbar.Header>

      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.emptyListContent,
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
        testID="notifications-list"
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
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
