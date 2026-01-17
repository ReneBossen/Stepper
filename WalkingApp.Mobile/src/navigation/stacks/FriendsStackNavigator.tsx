import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FriendsStackParamList } from '../types';

import FriendsListScreen from '@screens/friends/FriendsListScreen';
import FriendDiscoveryScreen from '@screens/friends/FriendDiscoveryScreen';
import UserProfileScreen from '@screens/friends/UserProfileScreen';

const Stack = createNativeStackNavigator<FriendsStackParamList>();

export default function FriendsStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="FriendsList"
        component={FriendsListScreen}
        options={{ title: 'Friends' }}
      />
      <Stack.Screen
        name="FriendDiscovery"
        component={FriendDiscoveryScreen}
        options={{ title: 'Discover Friends' }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: 'User Profile' }}
      />
    </Stack.Navigator>
  );
}
