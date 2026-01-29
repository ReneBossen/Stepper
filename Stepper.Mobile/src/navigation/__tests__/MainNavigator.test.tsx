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
    Group: jest.fn(({ children }) => <>{children}</>),
  }),
}));

// Mock TabNavigator
jest.mock('../TabNavigator', () => ({
  __esModule: true,
  default: () => <View testID="tab-navigator" />,
}));

// Mock screens
jest.mock('@screens/notifications/NotificationsScreen', () => ({
  __esModule: true,
  default: () => <View testID="notifications-screen" />,
}));

import MainNavigator from '../MainNavigator';

describe('MainNavigator', () => {
  it('MainNavigator_WhenRendered_DisplaysTabNavigator', () => {
    const { getByTestId } = render(<MainNavigator />);
    expect(getByTestId('tab-navigator')).toBeTruthy();
  });

  it('MainNavigator_WhenRendered_DisplaysNotificationsScreen', () => {
    const { getByTestId } = render(<MainNavigator />);
    expect(getByTestId('notifications-screen')).toBeTruthy();
  });
});
