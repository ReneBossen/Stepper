import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Text, Badge, useTheme, Icon } from 'react-native-paper';

interface FriendRequestsBannerProps {
  count: number;
  onPress?: () => void;
  testID?: string;
}

/**
 * Banner showing the number of pending friend requests.
 * Tapping navigates to the friend requests screen.
 */
export function FriendRequestsBanner({
  count,
  onPress,
  testID,
}: FriendRequestsBannerProps) {
  const theme = useTheme();

  if (count === 0) {
    return null;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed
            ? theme.colors.primaryContainer
            : theme.colors.secondaryContainer,
        },
      ]}
      testID={testID}
      accessibilityLabel={`${count} pending friend request${count !== 1 ? 's' : ''}. Tap to view.`}
      accessibilityRole="button"
    >
      <Icon
        source="account-clock"
        size={24}
        color={theme.colors.onSecondaryContainer}
      />
      <Text
        variant="bodyLarge"
        style={[styles.text, { color: theme.colors.onSecondaryContainer }]}
      >
        Friend Requests
      </Text>
      <Badge
        style={[styles.badge, { backgroundColor: theme.colors.primary }]}
        size={24}
      >
        {count}
      </Badge>
      <Icon
        source="chevron-right"
        size={24}
        color={theme.colors.onSecondaryContainer}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12,
  },
  text: {
    flex: 1,
    fontWeight: '500',
  },
  badge: {
    alignSelf: 'center',
  },
});
