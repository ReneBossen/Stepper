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
jest.mock('@screens/settings/SettingsScreen', () => ({
  __esModule: true,
  default: () => <View testID="settings-screen" />,
}));

jest.mock('@screens/settings/ProfileScreen', () => ({
  __esModule: true,
  default: () => <View testID="profile-screen" />,
}));

jest.mock('@screens/settings/EditProfileScreen', () => ({
  __esModule: true,
  default: () => <View testID="edit-profile-screen" />,
}));

import SettingsStackNavigator from '../../stacks/SettingsStackNavigator';

describe('SettingsStackNavigator', () => {
  it('SettingsStackNavigator_WhenRendered_DisplaysSettingsScreen', () => {
    const { getByTestId } = render(<SettingsStackNavigator />);
    expect(getByTestId('settings-screen')).toBeTruthy();
  });

  it('SettingsStackNavigator_WhenRendered_DisplaysProfileScreen', () => {
    const { getByTestId } = render(<SettingsStackNavigator />);
    expect(getByTestId('profile-screen')).toBeTruthy();
  });

  it('SettingsStackNavigator_WhenRendered_DisplaysEditProfileScreen', () => {
    const { getByTestId } = render(<SettingsStackNavigator />);
    expect(getByTestId('edit-profile-screen')).toBeTruthy();
  });
});
