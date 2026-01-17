import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';

// Mock navigation
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: jest.fn(({ children }) => <>{children}</>),
    Screen: jest.fn(({ component: Component, name }) => {
      return Component ? <Component testID={`screen-${name}`} /> : null;
    }),
  }),
}));

// Mock screens
jest.mock('@screens/groups/GroupsListScreen', () => ({
  __esModule: true,
  default: () => <View testID="groups-list-screen" />,
}));

jest.mock('@screens/groups/GroupDetailScreen', () => ({
  __esModule: true,
  default: () => <View testID="group-detail-screen" />,
}));

jest.mock('@screens/groups/GroupManagementScreen', () => ({
  __esModule: true,
  default: () => <View testID="group-management-screen" />,
}));

jest.mock('@screens/groups/CreateGroupScreen', () => ({
  __esModule: true,
  default: () => <View testID="create-group-screen" />,
}));

jest.mock('@screens/groups/JoinGroupScreen', () => ({
  __esModule: true,
  default: () => <View testID="join-group-screen" />,
}));

import GroupsStackNavigator from '../../stacks/GroupsStackNavigator';

describe('GroupsStackNavigator', () => {
  it('GroupsStackNavigator_WhenRendered_DisplaysGroupsListScreen', () => {
    const { getByTestId } = render(<GroupsStackNavigator />);
    expect(getByTestId('groups-list-screen')).toBeTruthy();
  });

  it('GroupsStackNavigator_WhenRendered_DisplaysGroupDetailScreen', () => {
    const { getByTestId } = render(<GroupsStackNavigator />);
    expect(getByTestId('group-detail-screen')).toBeTruthy();
  });

  it('GroupsStackNavigator_WhenRendered_DisplaysGroupManagementScreen', () => {
    const { getByTestId } = render(<GroupsStackNavigator />);
    expect(getByTestId('group-management-screen')).toBeTruthy();
  });

  it('GroupsStackNavigator_WhenRendered_DisplaysCreateGroupScreen', () => {
    const { getByTestId } = render(<GroupsStackNavigator />);
    expect(getByTestId('create-group-screen')).toBeTruthy();
  });

  it('GroupsStackNavigator_WhenRendered_DisplaysJoinGroupScreen', () => {
    const { getByTestId } = render(<GroupsStackNavigator />);
    expect(getByTestId('join-group-screen')).toBeTruthy();
  });
});
