import React, { useRef, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { track } from '@services/analytics';
import { TabParamList } from './types';
import { TAB_ROUTES } from './routes';

import HomeStackNavigator from './stacks/HomeStackNavigator';
import StepsStackNavigator from './stacks/StepsStackNavigator';
import FriendsStackNavigator from './stacks/FriendsStackNavigator';
import GroupsStackNavigator from './stacks/GroupsStackNavigator';
import SettingsStackNavigator from './stacks/SettingsStackNavigator';

const Tab = createBottomTabNavigator<TabParamList>();

// Map tab names to readable tab names for analytics
const TAB_NAME_MAP: Record<string, string> = {
  HomeTab: 'home',
  StepsTab: 'steps',
  FriendsTab: 'friends',
  GroupsTab: 'groups',
  SettingsTab: 'settings',
};

export default function TabNavigator() {
  const previousTabRef = useRef<string | undefined>(undefined);

  const handleTabPress = useCallback((tabName: string) => {
    // Only track if this is a different tab
    if (previousTabRef.current && previousTabRef.current !== tabName) {
      const fromTab = TAB_NAME_MAP[previousTabRef.current] || previousTabRef.current;
      const toTab = TAB_NAME_MAP[tabName] || tabName;
      track('tab_switched', { from_tab: fromTab, to_tab: toTab });
    }
    previousTabRef.current = tabName;
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#757575',
      }}
      screenListeners={{
        tabPress: (e) => {
          const routeName = e.target?.split('-')[0];
          if (routeName) {
            handleTabPress(routeName);
          }
        },
      }}
    >
      <Tab.Screen
        name={TAB_ROUTES.HomeTab}
        component={HomeStackNavigator}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.StepsTab}
        component={StepsStackNavigator}
        options={{
          title: 'Steps',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="walk" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.FriendsTab}
        component={FriendsStackNavigator}
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.GroupsTab}
        component={GroupsStackNavigator}
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.SettingsTab}
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
