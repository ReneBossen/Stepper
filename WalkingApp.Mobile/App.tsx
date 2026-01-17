import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from '@theme/ThemeProvider';
import { useAppTheme } from '@hooks/useAppTheme';
import RootNavigator from '@navigation/RootNavigator';
import { supabase } from '@services/supabase';
import { useAuthStore } from '@store/authStore';
import { useUserStore } from '@store/userStore';
import { validateConfig } from '@config/supabase.config';
import { ErrorMessage } from '@components/common/ErrorMessage';
import * as SplashScreen from 'expo-splash-screen';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { navigationTheme } = useAppTheme();
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const setSession = useAuthStore((state) => state.setSession);
  const fetchCurrentUser = useUserStore((state) => state.fetchCurrentUser);

  useEffect(() => {
    let subscription: any = null;

    async function prepare() {
      try {
        // Validate configuration
        if (!validateConfig()) {
          const error = 'Invalid app configuration. Please check your environment variables.';
          if (__DEV__) {
            console.error(error);
          }
          setInitError(error);
          setIsReady(true);
          await SplashScreen.hideAsync();
          return;
        }

        // Check initial session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        // Fetch user profile if authenticated
        if (session) {
          await fetchCurrentUser();
        }

        // Setup auth state listener
        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          setSession(session);

          if (event === 'SIGNED_IN' && session) {
            await fetchCurrentUser();
          }
        });

        subscription = authSubscription;

        setIsReady(true);
        await SplashScreen.hideAsync();
      } catch (error) {
        if (__DEV__) {
          console.error('App initialization error:', error);
        }
        setInitError('Failed to initialize app. Please try restarting.');
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();

    // Cleanup function returned directly from useEffect
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  if (!isReady) {
    return null;
  }

  if (initError) {
    return (
      <ErrorMessage
        message={initError}
        onRetry={() => {
          setInitError(null);
          setIsReady(false);
          // Force re-mount by changing key would be ideal, but retry via reload is simpler
          if (typeof window !== 'undefined' && window.location) {
            window.location.reload();
          }
        }}
      />
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
