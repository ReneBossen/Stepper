import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

interface StatCardProps {
  value: number;
  label: string;
  onPress?: () => void;
  testID?: string;
}

/**
 * Displays a single statistic card (e.g., Friends: 124).
 */
export function StatCard({ value, label, onPress, testID }: StatCardProps) {
  const theme = useTheme();

  const content = (
    <Card style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Card.Content style={styles.content}>
        <Text
          variant="headlineMedium"
          style={[styles.value, { color: theme.colors.onSurfaceVariant }]}
        >
          {value.toLocaleString()}
        </Text>
        <Text
          variant="labelMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {label}
        </Text>
      </Card.Content>
    </Card>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={styles.pressable}
        testID={testID}
        accessibilityLabel={`${value} ${label}`}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={styles.pressable}
      testID={testID}
      accessibilityLabel={`${value} ${label}`}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  card: {
    borderRadius: 12,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  value: {
    fontWeight: '700',
  },
});
