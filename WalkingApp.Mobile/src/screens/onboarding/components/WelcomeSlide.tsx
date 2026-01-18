import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface WelcomeSlideProps {
  emoji: string;
  title: string;
  description: string;
}

export default function WelcomeSlide({ emoji, title, description }: WelcomeSlideProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  // Calculate responsive maxWidth (90% of screen width, max 500px)
  const contentMaxWidth = Math.min(width * 0.9, 500);

  return (
    <View style={[styles.container, { width }]}>
      <View style={[styles.content, { maxWidth: contentMaxWidth }]}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.onBackground }]}>
          {title}
        </Text>
        <Text
          variant="bodyLarge"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 100,
    marginBottom: 32,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
    lineHeight: 28,
  },
});
