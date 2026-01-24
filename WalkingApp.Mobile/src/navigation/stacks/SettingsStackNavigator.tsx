import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../types';

import SettingsScreen from '@screens/settings/SettingsScreen';
import ProfileScreen from '@screens/settings/ProfileScreen';
import EditProfileScreen from '@screens/settings/EditProfileScreen';
import NotificationSettingsScreen from '@screens/settings/NotificationSettingsScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
