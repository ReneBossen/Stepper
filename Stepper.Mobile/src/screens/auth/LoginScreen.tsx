import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Divider } from 'react-native-paper';
import { AuthStackScreenProps } from '@navigation/types';
import { useAppTheme } from '@hooks/useAppTheme';
import { signInWithGoogleOAuth, supabase } from '@services/supabase';
import { tokenStorage } from '@services/tokenStorage';
import { useAuthStore } from '@store/authStore';
import { getErrorMessage } from '@utils/errorUtils';
import * as WebBrowser from 'expo-web-browser';
import AuthLayout from './components/AuthLayout';
import AuthErrorMessage from './components/AuthErrorMessage';
import { useLogin } from './hooks/useLogin';

WebBrowser.maybeCompleteAuthSession();

// OAuth configuration constants
const OAUTH_REDIRECT_SCHEME = 'stepper://';
const TOKEN_PARAM_ACCESS = 'access_token';
const TOKEN_PARAM_REFRESH = 'refresh_token';

type Props = AuthStackScreenProps<'Login'>;

/**
 * Default OAuth token expiration in seconds.
 * This matches Supabase's default JWT expiry of 1 hour.
 * Note: If Supabase configuration changes, this value should be updated.
 * The actual expiry is validated server-side; this is used for local token management.
 */
const DEFAULT_EXPIRES_IN = 3600;

export default function LoginScreen({ navigation }: Props) {
  const { paperTheme } = useAppTheme();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const setUser = useAuthStore((state) => state.setUser);
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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setGoogleError(null);

    try {
      const { url } = await signInWithGoogleOAuth();

      if (url) {
        // Open browser for OAuth
        const result = await WebBrowser.openAuthSessionAsync(
          url,
          OAUTH_REDIRECT_SCHEME
        );

        if (result.type === 'success' && result.url) {
          const redirectUrl = result.url;

          // Security: Validate URL prefix (defense in depth)
          if (!redirectUrl.startsWith(OAUTH_REDIRECT_SCHEME)) {
            setGoogleError('Invalid redirect URL received');
            return;
          }

          // Extract tokens from URL fragment
          // Supabase redirects with tokens in URL fragment (after #)
          // Format: stepper://#access_token=...&refresh_token=...
          const hashIndex = redirectUrl.indexOf('#');

          if (hashIndex !== -1) {
            const fragment = redirectUrl.substring(hashIndex + 1);
            const params = new URLSearchParams(fragment);

            const accessToken = params.get(TOKEN_PARAM_ACCESS);
            const refreshToken = params.get(TOKEN_PARAM_REFRESH);

            if (accessToken && refreshToken) {
              // Create session - Supabase validates tokens before creating session
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (sessionError) {
                throw sessionError;
              }

              // Security: Verify session was created successfully
              if (!sessionData.session || !sessionData.user) {
                throw new Error('Failed to create session after OAuth');
              }

              // Store tokens in tokenStorage for the new auth system
              // Get expires_in from URL params or use default (1 hour)
              const expiresInParam = params.get('expires_in');
              const expiresIn = expiresInParam ? parseInt(expiresInParam, 10) : DEFAULT_EXPIRES_IN;

              // Store tokens with 'oauth' type - these cannot be refreshed via backend
              await tokenStorage.setTokens(accessToken, refreshToken, expiresIn, 'oauth');

              // Build user info object
              const userInfo = {
                id: sessionData.user.id,
                email: sessionData.user.email ?? '',
                displayName: sessionData.user.user_metadata?.full_name ??
                             sessionData.user.user_metadata?.name ??
                             sessionData.user.email?.split('@')[0] ?? 'User',
              };

              // Store user info for session restore (OAuth tokens can't refresh to get user info)
              await tokenStorage.setUserInfo(userInfo);

              // Update auth store with user info
              setUser(userInfo);
            } else {
              setGoogleError('Failed to extract authentication tokens');
            }
          } else {
            setGoogleError('Invalid redirect URL format');
          }
        } else if (result.type === 'cancel') {
          setGoogleError('Sign in was cancelled');
        }
      }
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Failed to sign in with Google');
      console.error('Google sign-in error:', errorMessage);
      setGoogleError(errorMessage);
    } finally {
      setIsGoogleLoading(false);
    }
  };

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
          disabled={isLoading || isGoogleLoading}
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
          disabled={isLoading || isGoogleLoading}
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
          disabled={isLoading || isGoogleLoading}
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
          disabled={isLoading || isGoogleLoading}
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

        <AuthErrorMessage error={googleError} />

        <Button
          mode="outlined"
          icon="google"
          onPress={handleGoogleSignIn}
          loading={isGoogleLoading}
          disabled={isLoading || isGoogleLoading}
          style={styles.button}
        >
          Continue with Google
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium">Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            disabled={isLoading || isGoogleLoading}
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
