import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { formatJoinDate } from '@utils/stringUtils';

export type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

interface FriendActionButtonProps {
  status: FriendStatus;
  friendsSince?: string;
  isLoading?: boolean;
  onAddFriend?: () => void;
  onAcceptRequest?: () => void;
  onDeclineRequest?: () => void;
  onRemoveFriend?: () => void;
  testID?: string;
}

/**
 * Displays friend action buttons based on current friendship status.
 */
export function FriendActionButton({
  status,
  friendsSince,
  isLoading = false,
  onAddFriend,
  onAcceptRequest,
  onDeclineRequest,
  onRemoveFriend,
  testID,
}: FriendActionButtonProps) {
  const theme = useTheme();

  switch (status) {
    case 'none':
      return (
        <Button
          mode="contained"
          icon="account-plus"
          onPress={onAddFriend}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          testID={testID}
          accessibilityLabel="Add friend"
        >
          Add Friend
        </Button>
      );

    case 'pending_sent':
      return (
        <Button
          mode="outlined"
          icon="clock-outline"
          disabled
          style={styles.button}
          testID={testID}
          accessibilityLabel="Friend request sent"
        >
          Friend Request Sent
        </Button>
      );

    case 'pending_received':
      return (
        <View style={styles.buttonRow} testID={testID}>
          <Button
            mode="contained"
            icon="check"
            onPress={onAcceptRequest}
            loading={isLoading}
            disabled={isLoading}
            style={[styles.button, styles.buttonFlex]}
            accessibilityLabel="Accept friend request"
          >
            Accept
          </Button>
          <Button
            mode="outlined"
            icon="close"
            onPress={onDeclineRequest}
            disabled={isLoading}
            style={[styles.button, styles.buttonFlex]}
            accessibilityLabel="Decline friend request"
          >
            Decline
          </Button>
        </View>
      );

    case 'accepted':
      return (
        <View style={styles.acceptedContainer} testID={testID}>
          {friendsSince && (
            <Text
              variant="bodyMedium"
              style={[styles.friendsSince, { color: theme.colors.onSurfaceVariant }]}
            >
              Friends since {formatJoinDate(friendsSince)}
            </Text>
          )}
          <Button
            mode="outlined"
            icon="account-remove"
            onPress={onRemoveFriend}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
            textColor={theme.colors.error}
            accessibilityLabel="Remove friend"
          >
            Remove Friend
          </Button>
        </View>
      );

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  button: {
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonFlex: {
    flex: 1,
  },
  acceptedContainer: {
    alignItems: 'center',
  },
  friendsSince: {
    marginBottom: 8,
  },
});
