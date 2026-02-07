import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import { ONBOARDING_ROUTES } from './routes';

import WelcomeCarouselScreen from '@screens/onboarding/WelcomeCarouselScreen';
import AnalyticsConsentScreen from '@screens/onboarding/AnalyticsConsentScreen';
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
      initialRouteName={ONBOARDING_ROUTES.WelcomeCarousel}
    >
      <Stack.Screen name={ONBOARDING_ROUTES.WelcomeCarousel} component={WelcomeCarouselScreen} />
      <Stack.Screen name={ONBOARDING_ROUTES.AnalyticsConsent} component={AnalyticsConsentScreen} />
      <Stack.Screen name={ONBOARDING_ROUTES.Permissions} component={PermissionsScreen} />
      <Stack.Screen name={ONBOARDING_ROUTES.ProfileSetup} component={ProfileSetupScreen} />
      <Stack.Screen name={ONBOARDING_ROUTES.PreferencesSetup} component={PreferencesSetupScreen} />
    </Stack.Navigator>
  );
}
