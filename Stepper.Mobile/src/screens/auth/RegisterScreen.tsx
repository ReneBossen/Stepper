import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthStackScreenProps } from '@navigation/types';
import { useAppTheme } from '@hooks/useAppTheme';
import AuthLayout from './components/AuthLayout';
import AuthErrorMessage from './components/AuthErrorMessage';
import PasswordStrengthIndicator from './components/PasswordStrengthIndicator';
import { useRegister } from './hooks/useRegister';
import {
  LegalModal,
  TERMS_OF_SERVICE_CONTENT,
  PRIVACY_POLICY_CONTENT,
} from '@screens/legal';

type Props = AuthStackScreenProps<'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { paperTheme } = useAppTheme();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
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
    fieldErrors,
    clearFieldError,
    resetForm,
    registrationSuccess,
    handleRegister,
  } = useRegister();

  // Reset form state when screen comes into focus to fix keyboard issues
  useFocusEffect(
    useCallback(() => {
      // Screen focused - no action needed on focus
      return () => {
        // Cleanup when leaving screen - reset form for clean state on return
        resetForm();
      };
    }, [resetForm])
  );

  // Handlers that clear field errors when user types
  const handleDisplayNameChange = useCallback((text: string) => {
    setDisplayName(text);
    clearFieldError('displayName');
  }, [setDisplayName, clearFieldError]);

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    clearFieldError('email');
  }, [setEmail, clearFieldError]);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
    clearFieldError('password');
  }, [setPassword, clearFieldError]);

  const handleConfirmPasswordChange = useCallback((text: string) => {
    setConfirmPassword(text);
    clearFieldError('confirmPassword');
  }, [setConfirmPassword, clearFieldError]);

  const handleTermsToggle = useCallback(() => {
    setAgreedToTerms(!agreedToTerms);
    clearFieldError('terms');
  }, [agreedToTerms, setAgreedToTerms, clearFieldError]);

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
          onChangeText={handleDisplayNameChange}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          autoCorrect={false}
          mode="outlined"
          style={styles.input}
          disabled={isLoading}
          error={!!fieldErrors.displayName}
          left={<TextInput.Icon icon="account" />}
        />

        <TextInput
          label="Email"
          value={email}
          onChangeText={handleEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          autoCorrect={false}
          mode="outlined"
          style={styles.input}
          disabled={isLoading}
          error={!!fieldErrors.email}
          left={<TextInput.Icon icon="email" />}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={handlePasswordChange}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="password-new"
          textContentType="newPassword"
          mode="outlined"
          style={styles.input}
          disabled={isLoading}
          error={!!fieldErrors.password}
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
          onChangeText={handleConfirmPasswordChange}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          autoComplete="password-new"
          textContentType="newPassword"
          mode="outlined"
          style={styles.input}
          disabled={isLoading}
          error={!!fieldErrors.confirmPassword}
          left={<TextInput.Icon icon="lock-check" />}
          right={
            <TextInput.Icon
              icon={showConfirmPassword ? 'eye-off' : 'eye'}
              onPress={toggleConfirmPasswordVisibility}
            />
          }
        />

        <View
          style={[
            styles.checkboxContainer,
            fieldErrors.terms && styles.checkboxContainerError,
            fieldErrors.terms && { borderColor: paperTheme.colors.error },
          ]}
        >
          <TouchableOpacity
            onPress={handleTermsToggle}
            disabled={isLoading}
            style={[
              styles.customCheckbox,
              { borderColor: fieldErrors.terms ? paperTheme.colors.error : paperTheme.colors.outline },
              agreedToTerms && { backgroundColor: paperTheme.colors.primary, borderColor: paperTheme.colors.primary },
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreedToTerms }}
            accessibilityLabel="Agree to terms and privacy policy"
            testID="terms-checkbox"
          >
            {agreedToTerms && (
              <MaterialCommunityIcons name="check" size={18} color={paperTheme.colors.onPrimary} />
            )}
          </TouchableOpacity>
          <Text variant="bodyMedium" style={styles.checkboxText}>
            I agree to the{' '}
            <Text
              style={{ color: paperTheme.colors.primary }}
              onPress={() => setShowTermsModal(true)}
              accessibilityRole="link"
              accessibilityLabel="View Terms of Service"
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={{ color: paperTheme.colors.primary }}
              onPress={() => setShowPrivacyModal(true)}
              accessibilityRole="link"
              accessibilityLabel="View Privacy Policy"
            >
              Privacy Policy
            </Text>
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

        <LegalModal
          visible={showTermsModal}
          onDismiss={() => setShowTermsModal(false)}
          title="Terms of Service"
          content={TERMS_OF_SERVICE_CONTENT}
        />

        <LegalModal
          visible={showPrivacyModal}
          onDismiss={() => setShowPrivacyModal(false)}
          title="Privacy Policy"
          content={PRIVACY_POLICY_CONTENT}
        />
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
    borderRadius: 8,
    padding: 4,
    marginHorizontal: -4,
  },
  checkboxContainerError: {
    borderWidth: 1,
  },
  customCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
