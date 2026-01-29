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
jest.mock('@screens/home/HomeScreen', () => ({
  __esModule: true,
  default: () => <View testID="home-screen" />,
}));

import HomeStackNavigator from '../../stacks/HomeStackNavigator';

describe('HomeStackNavigator', () => {
  it('HomeStackNavigator_WhenRendered_DisplaysHomeScreen', () => {
    const { getByTestId } = render(<HomeStackNavigator />);
    expect(getByTestId('home-screen')).toBeTruthy();
  });
});
