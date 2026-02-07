import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import { useAuthStore } from '@store/authStore';
import { useUserStore } from '@store/userStore';
import { RootStackParamList } from './types';
import { ROOT_ROUTES } from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useUserStore((state) => state.currentUser);
  const fetchCurrentUser = useUserStore((state) => state.fetchCurrentUser);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    if (isAuthenticated && !currentUser) {
      // Fetch user profile when authenticated but not loaded yet
      fetchCurrentUser().finally(() => setIsLoadingUser(false));
    } else if (isAuthenticated && currentUser) {
      // Check onboarding status from user profile
      setNeedsOnboarding(!currentUser.onboarding_completed);
      setIsLoadingUser(false);
    } else {
      setIsLoadingUser(false);
    }
  }, [isAuthenticated, currentUser, fetchCurrentUser]);

  // Show loading state while fetching user profile
  if (isAuthenticated && isLoadingUser) {
    return null; // Or a loading spinner component
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name={ROOT_ROUTES.Auth} component={AuthNavigator} />
      ) : needsOnboarding ? (
        <Stack.Screen name={ROOT_ROUTES.Onboarding} component={OnboardingNavigator} />
      ) : (
        <Stack.Screen name={ROOT_ROUTES.Main} component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
}
