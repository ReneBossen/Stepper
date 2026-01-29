import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { Text, IconButton, Surface, useTheme } from 'react-native-paper';
import type { Notification } from '@store/notificationsStore';

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onDelete: (notificationId: string) => void;
  testID?: string;
}

/**
 * Displays a single notification item with icon, content, timestamp, and delete action.
 */
export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onDelete,
  testID,
}) => {
  const theme = useTheme();
  const [showDelete, setShowDelete] = useState(false);

  const handlePress = useCallback(() => {
    onPress(notification);
  }, [notification, onPress]);

  const handleLongPress = useCallback(() => {
    setShowDelete(true);
  }, []);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setShowDelete(false) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(notification.id);
            setShowDelete(false);
          },
        },
      ]
    );
  }, [notification.id, onDelete]);

  const handleCancelDelete = useCallback(() => {
    setShowDelete(false);
  }, []);

  const getIcon = (): string => {
    switch (notification.type) {
      case 'friend_request':
        return 'account-plus';
      case 'friend_accepted':
        return 'account-check';
      case 'group_invite':
        return 'account-group';
      case 'goal_achieved':
        return 'trophy';
      case 'general':
      default:
        return 'bell';
    }
  };

  const getIconBackgroundColor = (): string => {
    switch (notification.type) {
      case 'friend_request':
        return theme.colors.primaryContainer;
      case 'friend_accepted':
        return theme.colors.tertiaryContainer ?? theme.colors.primaryContainer;
      case 'group_invite':
        return theme.colors.secondaryContainer;
      case 'goal_achieved':
        return '#FFF8E1'; // Amber tint for achievements
      case 'general':
      default:
        return theme.colors.surfaceVariant;
    }
  };

  const getIconColor = (): string => {
    switch (notification.type) {
      case 'friend_request':
        return theme.colors.onPrimaryContainer;
      case 'friend_accepted':
        return theme.colors.onTertiaryContainer ?? theme.colors.onPrimaryContainer;
      case 'group_invite':
        return theme.colors.onSecondaryContainer;
      case 'goal_achieved':
        return '#FF8F00'; // Amber for achievements
      case 'general':
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const formattedTime = formatRelativeTime(notification.created_at);

  const containerBackgroundColor = notification.is_read
    ? theme.colors.background
    : theme.colors.primaryContainer + '20'; // Subtle tint for unread

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      testID={testID}
      accessibilityLabel={`${notification.title}. ${notification.message}. ${formattedTime}${!notification.is_read ? '. Unread' : ''}`}
      accessibilityRole="button"
      accessibilityHint="Tap to mark as read, long press to delete"
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: containerBackgroundColor,
            borderBottomColor: theme.colors.outlineVariant,
          },
        ]}
      >
        {/* Unread indicator */}
        {!notification.is_read && (
          <View
            style={[styles.unreadIndicator, { backgroundColor: theme.colors.primary }]}
            testID={`${testID}-unread-indicator`}
          />
        )}

        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getIconBackgroundColor() },
          ]}
        >
          <IconButton
            icon={getIcon()}
            size={24}
            iconColor={getIconColor()}
            style={styles.icon}
          />
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text
            variant="titleSmall"
            style={[
              styles.title,
              {
                color: theme.colors.onSurface,
                fontWeight: notification.is_read ? '500' : '700',
              },
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.message, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={2}
          >
            {notification.message}
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.timestamp, { color: theme.colors.onSurfaceVariant }]}
          >
            {formattedTime}
          </Text>
        </View>

        {/* Delete button (shown on long press) */}
        {showDelete ? (
          <View style={styles.deleteActions}>
            <IconButton
              icon="close"
              size={20}
              onPress={handleCancelDelete}
              iconColor={theme.colors.onSurfaceVariant}
              testID={`${testID}-cancel-delete`}
            />
            <IconButton
              icon="delete"
              size={20}
              onPress={handleDelete}
              iconColor={theme.colors.error}
              testID={`${testID}-delete-button`}
            />
          </View>
        ) : (
          <IconButton
            icon="chevron-right"
            size={20}
            iconColor={theme.colors.onSurfaceVariant}
            style={styles.chevron}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

/**
 * Formats a timestamp to a relative time string
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    minHeight: 80,
  },
  unreadIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    margin: 0,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 2,
  },
  message: {
    lineHeight: 20,
    marginBottom: 4,
  },
  timestamp: {
    opacity: 0.8,
  },
  deleteActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    margin: 0,
  },
});
