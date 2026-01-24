import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

interface JoinGroupCardProps {
  onPress: () => void;
  testID?: string;
}

/**
 * Card that prompts users to join a group.
 */
export function JoinGroupCard({ onPress, testID }: JoinGroupCardProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} testID={testID} accessibilityLabel="Join a group">
      <Card
        style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
        mode="outlined"
      >
        <Card.Content style={styles.content}>
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.primary, fontWeight: '600' }}
          >
            Join a Group
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
          >
            Find groups to compete with friends
          </Text>
        </Card.Content>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderStyle: 'dashed',
    borderWidth: 2,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});
