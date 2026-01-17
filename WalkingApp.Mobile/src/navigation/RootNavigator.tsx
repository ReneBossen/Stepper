import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import { useAuthStore } from '@store/authStore';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      checkOnboardingStatus();
    } else {
      setIsCheckingOnboarding(false);
      setNeedsOnboarding(false);
    }
  }, [isAuthenticated]);

  const checkOnboardingStatus = async () => {
    setIsCheckingOnboarding(true);
    try {
      const value = await AsyncStorage.getItem('@onboarding_completed');
      setNeedsOnboarding(value !== 'true');
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      setNeedsOnboarding(false);
    } finally {
      setIsCheckingOnboarding(false);
    }
  };

  if (isCheckingOnboarding && isAuthenticated) {
    return null; // or a loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : needsOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <Stack.Screen name="Main" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
}
