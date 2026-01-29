import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';

// Mock navigation
jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: jest.fn(({ children }) => <>{children}</>),
    Screen: jest.fn(({ component: Component, name }) => {
      return Component ? <Component testID={`tab-${name}`} /> : null;
    }),
  }),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: jest.fn(() => null),
}));

// Mock stack navigators
jest.mock('../stacks/HomeStackNavigator', () => ({
  __esModule: true,
  default: () => <View testID="home-stack" />,
}));

jest.mock('../stacks/StepsStackNavigator', () => ({
  __esModule: true,
  default: () => <View testID="steps-stack" />,
}));

jest.mock('../stacks/FriendsStackNavigator', () => ({
  __esModule: true,
  default: () => <View testID="friends-stack" />,
}));

jest.mock('../stacks/GroupsStackNavigator', () => ({
  __esModule: true,
  default: () => <View testID="groups-stack" />,
}));

jest.mock('../stacks/SettingsStackNavigator', () => ({
  __esModule: true,
  default: () => <View testID="settings-stack" />,
}));

import TabNavigator from '../TabNavigator';

describe('TabNavigator', () => {
  it('TabNavigator_WhenRendered_DisplaysHomeStack', () => {
    const { getByTestId } = render(<TabNavigator />);
    expect(getByTestId('home-stack')).toBeTruthy();
  });

  it('TabNavigator_WhenRendered_DisplaysStepsStack', () => {
    const { getByTestId } = render(<TabNavigator />);
    expect(getByTestId('steps-stack')).toBeTruthy();
  });

  it('TabNavigator_WhenRendered_DisplaysFriendsStack', () => {
    const { getByTestId } = render(<TabNavigator />);
    expect(getByTestId('friends-stack')).toBeTruthy();
  });

  it('TabNavigator_WhenRendered_DisplaysGroupsStack', () => {
    const { getByTestId } = render(<TabNavigator />);
    expect(getByTestId('groups-stack')).toBeTruthy();
  });

  it('TabNavigator_WhenRendered_DisplaysSettingsStack', () => {
    const { getByTestId } = render(<TabNavigator />);
    expect(getByTestId('settings-stack')).toBeTruthy();
  });
});
