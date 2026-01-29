import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  testID?: string;
}

/**
 * A small card displaying a statistic with a title and value.
 * Used for weekly average, weekly total, etc.
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  testID,
}) => {
  const theme = useTheme();

  const formattedValue =
    typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      testID={testID}
      accessibilityLabel={`${title}: ${formattedValue}${subtitle ? ` ${subtitle}` : ''}`}
      accessibilityRole="text"
    >
      <Card.Content style={styles.content}>
        <Text
          variant="labelMedium"
          style={[styles.title, { color: theme.colors.onSurfaceVariant }]}
        >
          {title}
        </Text>
        <Text
          variant="headlineSmall"
          style={[styles.value, { color: theme.colors.onSurface }]}
        >
          {formattedValue}
        </Text>
        {subtitle && (
          <Text
            variant="bodySmall"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            {subtitle}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    elevation: 2,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: {
    marginBottom: 4,
    textAlign: 'center',
  },
  value: {
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 2,
    textAlign: 'center',
  },
});
