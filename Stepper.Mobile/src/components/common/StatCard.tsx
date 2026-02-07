import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

interface StatCardProps {
  /** The label/title for the statistic */
  title: string;
  /** The value to display (formatted with toLocaleString if number) */
  value: string | number;
  /** Optional subtitle below value (only shown in elevated variant) */
  subtitle?: string;
  /** Visual variant */
  variant?: 'elevated' | 'flat';
  /** Optional press handler (makes the card interactive) */
  onPress?: () => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * A unified card displaying a statistic with a title and value.
 *
 * Variants:
 * - `elevated` (default): surface background, elevation 2, headlineSmall value, title on top
 * - `flat`: surfaceVariant background, no elevation, headlineMedium value, title (label) below value
 */
export function StatCard({
  title,
  value,
  subtitle,
  variant = 'elevated',
  onPress,
  testID,
}: StatCardProps) {
  const theme = useTheme();

  const formattedValue =
    typeof value === 'number' ? value.toLocaleString() : value;

  const isElevated = variant === 'elevated';

  const accessibilityLabel = subtitle
    ? `${title}: ${formattedValue} ${subtitle}`
    : `${title}: ${formattedValue}`;

  const isInteractive = !!onPress;
  const usesPressableWrapper = isInteractive || !isElevated;

  const card = (
    <Card
      style={[
        styles.card,
        isElevated
          ? { backgroundColor: theme.colors.surface, elevation: 2 }
          : { backgroundColor: theme.colors.surfaceVariant, borderRadius: 12 },
      ]}
      {...(!usesPressableWrapper && {
        testID,
        accessibilityLabel,
        accessibilityRole: 'text' as const,
      })}
    >
      <Card.Content
        style={[
          styles.content,
          isElevated ? styles.contentElevated : styles.contentFlat,
        ]}
      >
        {isElevated && (
          <Text
            variant="labelMedium"
            style={[styles.title, { color: theme.colors.onSurfaceVariant }]}
          >
            {title}
          </Text>
        )}

        <Text
          variant={isElevated ? 'headlineSmall' : 'headlineMedium'}
          style={[
            styles.value,
            {
              color: isElevated
                ? theme.colors.onSurface
                : theme.colors.onSurfaceVariant,
            },
          ]}
        >
          {formattedValue}
        </Text>

        {isElevated && subtitle && (
          <Text
            variant="bodySmall"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            {subtitle}
          </Text>
        )}

        {!isElevated && (
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {title}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  if (usesPressableWrapper) {
    return (
      <Pressable
        onPress={onPress}
        style={styles.pressable}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        {...(isInteractive && { accessibilityRole: 'button' as const })}
      >
        {card}
      </Pressable>
    );
  }

  return card;
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  card: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
  },
  contentElevated: {
    paddingVertical: 16,
  },
  contentFlat: {
    paddingVertical: 12,
    paddingHorizontal: 8,
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
