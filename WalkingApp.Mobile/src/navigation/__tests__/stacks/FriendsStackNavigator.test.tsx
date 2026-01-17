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
jest.mock('@screens/friends/FriendsListScreen', () => ({
  __esModule: true,
  default: () => <View testID="friends-list-screen" />,
}));

jest.mock('@screens/friends/FriendDiscoveryScreen', () => ({
  __esModule: true,
  default: () => <View testID="friend-discovery-screen" />,
}));

jest.mock('@screens/friends/UserProfileScreen', () => ({
  __esModule: true,
  default: () => <View testID="user-profile-screen" />,
}));

import FriendsStackNavigator from '../../stacks/FriendsStackNavigator';

describe('FriendsStackNavigator', () => {
  it('FriendsStackNavigator_WhenRendered_DisplaysFriendsListScreen', () => {
    const { getByTestId } = render(<FriendsStackNavigator />);
    expect(getByTestId('friends-list-screen')).toBeTruthy();
  });

  it('FriendsStackNavigator_WhenRendered_DisplaysFriendDiscoveryScreen', () => {
    const { getByTestId } = render(<FriendsStackNavigator />);
    expect(getByTestId('friend-discovery-screen')).toBeTruthy();
  });

  it('FriendsStackNavigator_WhenRendered_DisplaysUserProfileScreen', () => {
    const { getByTestId } = render(<FriendsStackNavigator />);
    expect(getByTestId('user-profile-screen')).toBeTruthy();
  });
});
