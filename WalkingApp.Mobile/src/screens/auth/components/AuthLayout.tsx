import React from 'react';
import {
  View,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@hooks/useAppTheme';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { paperTheme } = useAppTheme();

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Text style={[styles.logo, { color: paperTheme.colors.primary }]}>
            🚶
          </Text>
          <Text variant="headlineMedium" style={styles.title}>
            {title}
          </Text>
          <Text
            variant="bodyLarge"
            style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}
          >
            {subtitle}
          </Text>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logo: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
  },
});
