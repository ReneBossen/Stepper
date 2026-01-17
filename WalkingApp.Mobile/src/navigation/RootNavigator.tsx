import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
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
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" testID="loading-indicator" />
      </View>
    );
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
