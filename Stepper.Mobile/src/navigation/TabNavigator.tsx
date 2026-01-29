import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TabParamList } from './types';

import HomeStackNavigator from './stacks/HomeStackNavigator';
import StepsStackNavigator from './stacks/StepsStackNavigator';
import FriendsStackNavigator from './stacks/FriendsStackNavigator';
import GroupsStackNavigator from './stacks/GroupsStackNavigator';
import SettingsStackNavigator from './stacks/SettingsStackNavigator';

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#757575',
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StepsTab"
        component={StepsStackNavigator}
        options={{
          title: 'Steps',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="walk" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="FriendsTab"
        component={FriendsStackNavigator}
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="GroupsTab"
        component={GroupsStackNavigator}
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
