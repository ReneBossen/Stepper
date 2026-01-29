import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon, Button, useTheme } from 'react-native-paper';

interface PrivacyRestrictedViewProps {
  onAddFriend?: () => void;
  isLoading?: boolean;
  testID?: string;
}

/**
 * Displays a privacy restricted message when profile is private.
 */
export function PrivacyRestrictedView({
  onAddFriend,
  isLoading = false,
  testID,
}: PrivacyRestrictedViewProps) {
  const theme = useTheme();

  return (
    <View style={styles.container} testID={testID}>
      <Icon
        source="lock"
        size={48}
        color={theme.colors.onSurfaceVariant}
      />
      <Text
        variant="titleMedium"
        style={[styles.title, { color: theme.colors.onSurface }]}
      >
        This profile is private
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
      >
        Add as a friend to view their activity
      </Text>
      {onAddFriend && (
        <Button
          mode="contained"
          icon="account-plus"
          onPress={onAddFriend}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          accessibilityLabel="Add friend to view profile"
        >
          Add Friend
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
  },
});
