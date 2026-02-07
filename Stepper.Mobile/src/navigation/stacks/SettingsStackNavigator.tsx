import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../types';
import { SETTINGS_ROUTES } from '../routes';

import SettingsScreen from '@screens/settings/SettingsScreen';
import ProfileScreen from '@screens/settings/ProfileScreen';
import EditProfileScreen from '@screens/settings/EditProfileScreen';
import NotificationSettingsScreen from '@screens/settings/NotificationSettingsScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name={SETTINGS_ROUTES.Settings}
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={SETTINGS_ROUTES.Profile}
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={SETTINGS_ROUTES.EditProfile}
        component={EditProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={SETTINGS_ROUTES.NotificationSettings}
        component={NotificationSettingsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
