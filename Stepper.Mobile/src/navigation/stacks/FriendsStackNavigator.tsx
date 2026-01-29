import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FriendsStackParamList } from '../types';

import FriendsListScreen from '@screens/friends/FriendsListScreen';
import FriendRequestsScreen from '@screens/friends/FriendRequestsScreen';
import FriendDiscoveryScreen from '@screens/friends/FriendDiscoveryScreen';
import QRScannerScreen from '@screens/friends/QRScannerScreen';
import UserProfileScreen from '@screens/friends/UserProfileScreen';

const Stack = createNativeStackNavigator<FriendsStackParamList>();

export default function FriendsStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="FriendsList"
        component={FriendsListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FriendRequests"
        component={FriendRequestsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FriendDiscovery"
        component={FriendDiscoveryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
