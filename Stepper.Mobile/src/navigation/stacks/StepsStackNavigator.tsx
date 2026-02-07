import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StepsStackParamList } from '../types';
import { STEPS_ROUTES } from '../routes';

import StepsHistoryScreen from '@screens/steps/StepsHistoryScreen';

const Stack = createNativeStackNavigator<StepsStackParamList>();

export default function StepsStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name={STEPS_ROUTES.StepsHistory}
        component={StepsHistoryScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
