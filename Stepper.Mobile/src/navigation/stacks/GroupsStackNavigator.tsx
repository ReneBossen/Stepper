import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GroupsStackParamList } from '../types';

import GroupsListScreen from '@screens/groups/GroupsListScreen';
import GroupDetailScreen from '@screens/groups/GroupDetailScreen';
import GroupManagementScreen from '@screens/groups/GroupManagementScreen';
import CreateGroupScreen from '@screens/groups/CreateGroupScreen';
import JoinGroupScreen from '@screens/groups/JoinGroupScreen';
import ManageMembersScreen from '@screens/groups/ManageMembersScreen';
import InviteMembersScreen from '@screens/groups/InviteMembersScreen';

const Stack = createNativeStackNavigator<GroupsStackParamList>();

export default function GroupsStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="GroupsList"
        component={GroupsListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GroupManagement"
        component={GroupManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="JoinGroup"
        component={JoinGroupScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ManageMembers"
        component={ManageMembersScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="InviteMembers"
        component={InviteMembersScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
