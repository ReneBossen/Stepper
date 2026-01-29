import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { useAppTheme } from '@hooks/useAppTheme';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

const getPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;

  if (!password) {
    return { score: 0, label: '', color: '' };
  }

  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  // Determine strength level
  if (score <= 2) {
    return { score: 0.33, label: 'Weak', color: '#F44336' };
  } else if (score <= 4) {
    return { score: 0.66, label: 'Medium', color: '#FF9800' };
  } else {
    return { score: 1.0, label: 'Strong', color: '#4CAF50' };
  }
};

export default function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const theme = useAppTheme();
  const strength = getPasswordStrength(password);

  if (!password) return null;

  return (
    <View style={styles.container}>
      <ProgressBar
        progress={strength.score}
        color={strength.color}
        style={styles.progressBar}
      />
      <Text
        variant="bodySmall"
        style={[styles.label, { color: strength.color }]}
      >
        Password Strength: {strength.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  label: {
    fontWeight: '600',
  },
});
