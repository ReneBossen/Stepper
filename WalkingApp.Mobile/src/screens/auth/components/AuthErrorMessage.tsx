import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useAppTheme } from '@hooks/useAppTheme';

interface AuthErrorMessageProps {
  error: string | null;
}

export default function AuthErrorMessage({ error }: AuthErrorMessageProps) {
  const theme = useAppTheme();

  if (!error) return null;

  return (
    <Surface
      style={[styles.container, { backgroundColor: theme.colors.errorContainer }]}
      elevation={0}
    >
      <Text
        variant="bodyMedium"
        style={[styles.text, { color: theme.colors.onErrorContainer }]}
      >
        {error}
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  text: {
    textAlign: 'center',
  },
});
