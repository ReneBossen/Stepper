import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Avatar, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import type { UserSearchResult as UserSearchResultType } from '@services/api/friendsApi';

interface UserSearchResultProps {
  user: UserSearchResultType;
  onAddFriend: (userId: string) => Promise<void>;
  onPress?: (user: UserSearchResultType) => void;
  testID?: string;
}

/**
 * Displays a user search result with avatar, name, and Add Friend button.
 */
export function UserSearchResult({
  user,
  onAddFriend,
  onPress,
  testID,
}: UserSearchResultProps) {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleAddFriend = useCallback(async () => {
    setIsLoading(true);
    try {
      await onAddFriend(user.id);
      setRequestSent(true);
    } catch {
      // Error is handled by parent
    } finally {
      setIsLoading(false);
    }
  }, [onAddFriend, user.id]);

  const handlePress = useCallback(() => {
    onPress?.(user);
  }, [onPress, user]);

  const avatarLabel = user.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed
            ? theme.colors.surfaceVariant
            : theme.colors.surface,
        },
      ]}
      testID={testID}
      accessibilityLabel={`${user.display_name}${requestSent ? ', friend request sent' : ''}`}
      accessibilityRole="button"
    >
      <View style={styles.avatarContainer}>
        {user.avatar_url ? (
          <Avatar.Image size={48} source={{ uri: user.avatar_url }} />
        ) : (
          <Avatar.Text
            size={48}
            label={avatarLabel}
            style={{ backgroundColor: theme.colors.secondaryContainer }}
            labelStyle={{ color: theme.colors.onSecondaryContainer }}
          />
        )}
      </View>

      <View style={styles.contentContainer}>
        <Text
          variant="titleMedium"
          style={[styles.name, { color: theme.colors.onSurface }]}
          numberOfLines={1}
        >
          {user.display_name}
        </Text>
        {user.username && user.username !== user.display_name && (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
            numberOfLines={1}
          >
            @{user.username}
          </Text>
        )}
      </View>

      <View style={styles.actionContainer}>
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : requestSent ? (
          <Button
            mode="outlined"
            compact
            disabled
            labelStyle={styles.buttonLabel}
          >
            Sent
          </Button>
        ) : (
          <Button
            mode="contained"
            compact
            onPress={handleAddFriend}
            labelStyle={styles.buttonLabel}
            testID={`add-friend-${user.id}`}
          >
            Add
          </Button>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarContainer: {
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontWeight: '600',
  },
  actionContainer: {
    marginLeft: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 12,
    marginHorizontal: 8,
    marginVertical: 4,
  },
});
