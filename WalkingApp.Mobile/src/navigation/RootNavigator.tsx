import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import OnboardingScreen from '@screens/onboarding/OnboardingScreen';
import { useAuthStore } from '@store/authStore';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    // Check onboarding status when authenticated
    const session = useAuthStore.getState().session;
    // Only show onboarding if explicitly set to false
    // Treat undefined/missing as already completed (backward compatibility)
    if (session?.user?.user_metadata?.onboarding_completed === false) {
      setNeedsOnboarding(true);
    } else {
      setNeedsOnboarding(false);
    }
  }, [isAuthenticated]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : needsOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
}
