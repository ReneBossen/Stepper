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
jest.mock('@screens/auth/LoginScreen', () => ({
  __esModule: true,
  default: () => <View testID="login-screen" />,
}));

jest.mock('@screens/auth/RegisterScreen', () => ({
  __esModule: true,
  default: () => <View testID="register-screen" />,
}));

jest.mock('@screens/auth/ForgotPasswordScreen', () => ({
  __esModule: true,
  default: () => <View testID="forgot-password-screen" />,
}));

import AuthNavigator from '../AuthNavigator';

describe('AuthNavigator', () => {
  it('AuthNavigator_WhenRendered_DisplaysLoginScreen', () => {
    const { getByTestId } = render(<AuthNavigator />);
    expect(getByTestId('login-screen')).toBeTruthy();
  });

  it('AuthNavigator_WhenRendered_DisplaysRegisterScreen', () => {
    const { getByTestId } = render(<AuthNavigator />);
    expect(getByTestId('register-screen')).toBeTruthy();
  });

  it('AuthNavigator_WhenRendered_DisplaysForgotPasswordScreen', () => {
    const { getByTestId } = render(<AuthNavigator />);
    expect(getByTestId('forgot-password-screen')).toBeTruthy();
  });
});
