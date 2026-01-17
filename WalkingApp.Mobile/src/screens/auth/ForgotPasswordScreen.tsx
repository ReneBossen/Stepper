import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import { AuthStackScreenProps } from '@navigation/types';
import { useAppTheme } from '@hooks/useAppTheme';
import AuthLayout from './components/AuthLayout';
import AuthErrorMessage from './components/AuthErrorMessage';
import { useForgotPassword } from './hooks/useForgotPassword';

type Props = AuthStackScreenProps<'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const {
    email,
    setEmail,
    isLoading,
    emailSent,
    error,
    handleResetPassword,
    handleResendEmail,
  } = useForgotPassword();

  if (emailSent) {
    return (
      <AuthLayout title="Check Your Email" subtitle="">
        <Surface
          style={[styles.successCard, { backgroundColor: theme.colors.primaryContainer }]}
          elevation={1}
        >
          <Text variant="displaySmall" style={styles.successIcon}>
            ✉️
          </Text>
          <Text variant="bodyLarge" style={styles.successText}>
            We've sent a password reset link to:
          </Text>
          <Text variant="titleMedium" style={[styles.successEmail, { color: theme.colors.primary }]}>
            {email}
          </Text>
          <Text variant="bodyMedium" style={styles.successText}>
            Click the link in the email to reset your password
          </Text>
        </Surface>

        <Button
          mode="contained"
          onPress={() => navigation.navigate('Login')}
          style={styles.button}
        >
          Back to Login
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium">Didn't receive the email? </Text>
          <TouchableOpacity onPress={handleResendEmail} disabled={isLoading}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.primary, fontWeight: '600' }}
            >
              Resend Link
            </Text>
          </TouchableOpacity>
        </View>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot Password?" subtitle="Enter your email to reset">
      <View>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          mode="outlined"
          style={styles.input}
          disabled={isLoading}
          left={<TextInput.Icon icon="email" />}
        />

        <AuthErrorMessage error={error} />

        <Button
          mode="contained"
          onPress={handleResetPassword}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        >
          Send Reset Link
        </Button>

        <Surface
          style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant }]}
          elevation={0}
        >
          <Text variant="bodyMedium" style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
            ℹ️  We'll send you a link to reset your password
          </Text>
        </Surface>

        <View style={styles.footer}>
          <Text variant="bodyMedium">Remember it? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
          >
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.primary, fontWeight: '600' }}
            >
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  input: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 16,
  },
  infoCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  successCard: {
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  successText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  successEmail: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
  },
});
