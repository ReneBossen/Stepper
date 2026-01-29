import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';

import WelcomeCarouselScreen from '@screens/onboarding/WelcomeCarouselScreen';
import PermissionsScreen from '@screens/onboarding/PermissionsScreen';
import ProfileSetupScreen from '@screens/onboarding/ProfileSetupScreen';
import PreferencesSetupScreen from '@screens/onboarding/PreferencesSetupScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
      initialRouteName="WelcomeCarousel"
    >
      <Stack.Screen name="WelcomeCarousel" component={WelcomeCarouselScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="PreferencesSetup" component={PreferencesSetupScreen} />
    </Stack.Navigator>
  );
}
