import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StepsStackParamList } from '../types';

import StepsHistoryScreen from '@screens/steps/StepsHistoryScreen';

const Stack = createNativeStackNavigator<StepsStackParamList>();

export default function StepsStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="StepsHistory"
        component={StepsHistoryScreen}
        options={{ title: 'Steps History' }}
      />
    </Stack.Navigator>
  );
}
