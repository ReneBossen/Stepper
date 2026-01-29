import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Checkbox, Surface } from 'react-native-paper';
import { AuthStackScreenProps } from '@navigation/types';
import { useAppTheme } from '@hooks/useAppTheme';
import AuthLayout from './components/AuthLayout';
import AuthErrorMessage from './components/AuthErrorMessage';
import PasswordStrengthIndicator from './components/PasswordStrengthIndicator';
import { useRegister } from './hooks/useRegister';

type Props = AuthStackScreenProps<'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { paperTheme } = useAppTheme();
  const {
    displayName,
    setDisplayName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    agreedToTerms,
    setAgreedToTerms,
    showPassword,
    showConfirmPassword,
    togglePasswordVisibility,
    toggleConfirmPasswordVisibility,
    isLoading,
    error,
    registrationSuccess,
    handleRegister,
  } = useRegister();

  if (registrationSuccess) {
    return (
      <AuthLayout title="Check Your Email" subtitle="">
        <Surface style={[styles.successCard, { backgroundColor: paperTheme.colors.primaryContainer }]} elevation={1}>
          <Text variant="displaySmall" style={styles.successIcon}>
            ✉️
          </Text>
          <Text variant="bodyLarge" style={styles.successText}>
            We've sent a verification email to:
          </Text>
          <Text variant="titleMedium" style={[styles.successEmail, { color: paperTheme.colors.primary }]}>
            {email}
          </Text>
          <Text variant="bodyMedium" style={styles.successText}>
            Click the link in the email to verify your account and complete registration.
          </Text>
        </Surface>

        <Button
          mode="contained"
          onPress={() => navigation.navigate('Login')}
          style={styles.button}
        >
          Back to Login
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create Account" subtitle="Join the walking community">
      <View>
        <TextInput
          label="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoComplete="name"
          autoCorrect={false}
          mode="outlined"
          style={styles.input}
          disabled={isLoading}
          left={<TextInput.Icon icon="account" />}
        />

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

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="password-new"
          mode="outlined"
          style={styles.input}
          disabled={isLoading}
          left={<TextInput.Icon icon="lock" />}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={togglePasswordVisibility}
            />
          }
        />

        <PasswordStrengthIndicator password={password} />

        <TextInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          autoComplete="password-new"
          mode="outlined"
          style={styles.input}
          disabled={isLoading}
          left={<TextInput.Icon icon="lock-check" />}
          right={
            <TextInput.Icon
              icon={showConfirmPassword ? 'eye-off' : 'eye'}
              onPress={toggleConfirmPasswordVisibility}
            />
          }
        />

        <View style={styles.checkboxContainer}>
          <Checkbox
            status={agreedToTerms ? 'checked' : 'unchecked'}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            disabled={isLoading}
          />
          <Text variant="bodyMedium" style={styles.checkboxText}>
            I agree to the{' '}
            <Text style={{ color: paperTheme.colors.primary }}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={{ color: paperTheme.colors.primary }}>Privacy Policy</Text>
          </Text>
        </View>

        <AuthErrorMessage error={error} />

        <Button
          mode="contained"
          onPress={handleRegister}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        >
          Sign Up
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium">Already have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
          >
            <Text
              variant="bodyMedium"
              style={{ color: paperTheme.colors.primary, fontWeight: '600' }}
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxText: {
    flex: 1,
    marginLeft: 8,
  },
  button: {
    marginBottom: 16,
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
