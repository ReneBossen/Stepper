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
jest.mock('@screens/steps/StepsHistoryScreen', () => ({
  __esModule: true,
  default: () => <View testID="steps-history-screen" />,
}));

import StepsStackNavigator from '../../stacks/StepsStackNavigator';

describe('StepsStackNavigator', () => {
  it('StepsStackNavigator_WhenRendered_DisplaysStepsHistoryScreen', () => {
    const { getByTestId } = render(<StepsStackNavigator />);
    expect(getByTestId('steps-history-screen')).toBeTruthy();
  });
});
