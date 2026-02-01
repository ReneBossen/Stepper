import React, { useEffect, useState, useRef, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { AppState, AppStateStatus } from 'react-native';
import { ThemeProvider } from '@theme/ThemeProvider';
import { useAppTheme } from '@hooks/useAppTheme';
import RootNavigator from '@navigation/RootNavigator';
import { useAuthStore } from '@store/authStore';
import { useUserStore } from '@store/userStore';
import { useAnalyticsStore } from '@store/analyticsStore';
import { validateConfig } from '@config/supabase.config';
import { ErrorMessage } from '@components/common/ErrorMessage';
import * as SplashScreen from 'expo-splash-screen';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { navigationTheme } = useAppTheme();
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchCurrentUser = useUserStore((state) => state.fetchCurrentUser);
  const initializeAnalytics = useAnalyticsStore((state) => state.initialize);
  const trackEvent = useAnalyticsStore((state) => state.track);
  const flushAnalytics = useAnalyticsStore((state) => state.flush);
  const appState = useRef(AppState.currentState);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const routeNameRef = useRef<string | undefined>(undefined);

  // Handle navigation state change for screen tracking
  const onNavigationStateChange = useCallback(() => {
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

    if (currentRouteName && currentRouteName !== routeNameRef.current) {
      // Track screen viewed event
      trackEvent('screen_viewed', { screen_name: currentRouteName });
    }

    // Save the current route name for comparison on next state change
    routeNameRef.current = currentRouteName;
  }, [trackEvent]);

  useEffect(() => {
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

        // Initialize analytics
        await initializeAnalytics();

        // Track app opened event
        trackEvent('app_opened', {});

        // Restore session from stored tokens
        await restoreSession();

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
  }, [initializeAnalytics, trackEvent, restoreSession]);

  // Track session start/end based on app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        trackEvent('session_started', {});
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App is going to background
        trackEvent('session_ended', {});
        // Flush analytics to ensure events are sent
        flushAnalytics();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [trackEvent, flushAnalytics]);

  // Fetch user profile when authentication state changes to authenticated
  useEffect(() => {
    if (isAuthenticated && isReady) {
      fetchCurrentUser();
    }
  }, [isAuthenticated, isReady, fetchCurrentUser]);

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
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onReady={() => {
        routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
      }}
      onStateChange={onNavigationStateChange}
    >
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
