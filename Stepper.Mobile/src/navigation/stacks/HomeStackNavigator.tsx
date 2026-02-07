import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../types';
import { HOME_ROUTES } from '../routes';

import HomeScreen from '@screens/home/HomeScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name={HOME_ROUTES.Home}
        component={HomeScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
