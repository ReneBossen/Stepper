import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Avatar, Icon, useTheme } from 'react-native-paper';
import type { ActivityItem } from '@store/activityStore';

interface ActivityFeedItemProps {
  item: ActivityItem;
  onPress?: (item: ActivityItem) => void;
}

/**
 * Displays a single activity feed item with avatar, message, and timestamp.
 */
export const ActivityFeedItem: React.FC<ActivityFeedItemProps> = ({
  item,
  onPress,
}) => {
  const theme = useTheme();

  const formattedTime = formatRelativeTime(item.timestamp);

  const getActivityIconSource = (): string => {
    switch (item.type) {
      case 'milestone':
        return 'target';
      case 'friend_achievement':
        return 'party-popper';
      case 'group_join':
        return 'account-group';
      case 'streak':
        return 'fire';
      default:
        return 'note-text';
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress(item);
    }
  };

  const content = (
    <View
      style={[styles.container, { borderBottomColor: theme.colors.outlineVariant }]}
      accessibilityLabel={`${item.userName || 'You'}: ${item.message}. ${formattedTime}`}
      accessibilityRole="button"
    >
      <View style={styles.avatarContainer}>
        {item.avatarUrl ? (
          <Avatar.Image size={44} source={{ uri: item.avatarUrl }} />
        ) : (
          <Avatar.Text size={44} label={getInitials(item.userName)} />
        )}
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.messageRow}>
          <View style={styles.iconContainer}>
            <Icon source={getActivityIconSource()} size={14} color={theme.colors.onSurfaceVariant} />
          </View>
          <Text
            variant="bodyMedium"
            style={[styles.message, { color: theme.colors.onSurface }]}
            numberOfLines={2}
          >
            {item.message}
          </Text>
        </View>
        <Text
          variant="bodySmall"
          style={[styles.timestamp, { color: theme.colors.onSurfaceVariant }]}
        >
          {formattedTime}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
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

/**
 * Gets initials from a name for avatar fallback
 */
function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    minHeight: 68,
  },
  avatarContainer: {
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  iconContainer: {
    marginTop: 2,
  },
  message: {
    flex: 1,
    lineHeight: 20,
  },
  timestamp: {
    marginTop: 4,
  },
});
