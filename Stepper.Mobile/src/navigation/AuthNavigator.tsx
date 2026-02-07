import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { AUTH_ROUTES } from './routes';

import LoginScreen from '@screens/auth/LoginScreen';
import RegisterScreen from '@screens/auth/RegisterScreen';
import ForgotPasswordScreen from '@screens/auth/ForgotPasswordScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name={AUTH_ROUTES.Login} component={LoginScreen} />
      <Stack.Screen name={AUTH_ROUTES.Register} component={RegisterScreen} />
      <Stack.Screen name={AUTH_ROUTES.ForgotPassword} component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
