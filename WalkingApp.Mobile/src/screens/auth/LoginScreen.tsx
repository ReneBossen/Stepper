import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Divider } from 'react-native-paper';
import { AuthStackScreenProps } from '@navigation/types';
import { useAppTheme } from '@hooks/useAppTheme';
import AuthLayout from './components/AuthLayout';
import AuthErrorMessage from './components/AuthErrorMessage';
import { useLogin } from './hooks/useLogin';

type Props = AuthStackScreenProps<'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { paperTheme } = useAppTheme();
  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    togglePasswordVisibility,
    isLoading,
    error,
    handleLogin,
  } = useLogin();

  return (
    <AuthLayout title="Welcome Back!" subtitle="Sign in to continue">
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

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="password"
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

        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          disabled={isLoading}
          style={styles.forgotPassword}
        >
          <Text
            variant="bodyMedium"
            style={{ color: paperTheme.colors.primary }}
          >
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <AuthErrorMessage error={error} />

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        >
          Sign In
        </Button>

        <View style={styles.dividerContainer}>
          <Divider style={styles.divider} />
          <Text variant="bodyMedium" style={styles.dividerText}>
            OR
          </Text>
          <Divider style={styles.divider} />
        </View>

        <Button
          mode="outlined"
          icon="google"
          onPress={() => {
            // Future: OAuth implementation
          }}
          disabled={true}
          style={styles.button}
        >
          Continue with Google
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium">Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            disabled={isLoading}
          >
            <Text
              variant="bodyMedium"
              style={{ color: paperTheme.colors.primary, fontWeight: '600' }}
            >
              Sign Up
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  button: {
    marginBottom: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
  },
  dividerText: {
    marginHorizontal: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
});
