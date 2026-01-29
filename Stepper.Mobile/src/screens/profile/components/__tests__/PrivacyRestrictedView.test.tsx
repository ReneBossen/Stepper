import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PrivacyRestrictedView } from '../PrivacyRestrictedView';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  return {
    Text: ({ children, variant, style }: any) => (
      <RN.Text style={style} testID={`text-${variant}`}>
        {children}
      </RN.Text>
    ),
    Icon: ({ source, size, color }: any) => (
      <RN.View testID={`icon-${source}`}>
        <RN.Text>{source}</RN.Text>
      </RN.View>
    ),
    Button: ({
      children,
      mode,
      icon,
      onPress,
      loading,
      disabled,
      style,
      accessibilityLabel,
    }: any) => (
      <RN.TouchableOpacity
        testID="add-friend-button"
        onPress={onPress}
        disabled={disabled || loading}
        style={style}
        accessibilityLabel={accessibilityLabel}
      >
        {icon && <RN.Text testID="button-icon">{icon}</RN.Text>}
        <RN.Text testID="button-text">{children}</RN.Text>
        {loading && <RN.View testID="button-loading" />}
      </RN.TouchableOpacity>
    ),
    useTheme: () => ({
      colors: {
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
      },
    }),
  };
});

describe('PrivacyRestrictedView', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(
        <PrivacyRestrictedView testID="privacy-restricted" />
      );
      expect(getByTestId('privacy-restricted')).toBeTruthy();
    });

    it('should display lock icon', () => {
      const { getByTestId } = render(
        <PrivacyRestrictedView testID="privacy-restricted" />
      );
      expect(getByTestId('icon-lock')).toBeTruthy();
    });

    it('should display title text', () => {
      const { getByText } = render(
        <PrivacyRestrictedView testID="privacy-restricted" />
      );
      expect(getByText('This profile is private')).toBeTruthy();
    });

    it('should display subtitle text', () => {
      const { getByText } = render(
        <PrivacyRestrictedView testID="privacy-restricted" />
      );
      expect(getByText('Add as a friend to view their activity')).toBeTruthy();
    });
  });

  describe('add friend button', () => {
    it('should display Add Friend button when onAddFriend is provided', () => {
      const mockOnAddFriend = jest.fn();
      const { getByText } = render(
        <PrivacyRestrictedView
          onAddFriend={mockOnAddFriend}
          testID="privacy-restricted"
        />
      );
      expect(getByText('Add Friend')).toBeTruthy();
    });

    it('should not display Add Friend button when onAddFriend is not provided', () => {
      const { queryByText } = render(
        <PrivacyRestrictedView testID="privacy-restricted" />
      );
      expect(queryByText('Add Friend')).toBeNull();
    });

    it('should call onAddFriend when button is pressed', () => {
      const mockOnAddFriend = jest.fn();
      const { getByTestId } = render(
        <PrivacyRestrictedView
          onAddFriend={mockOnAddFriend}
          testID="privacy-restricted"
        />
      );

      fireEvent.press(getByTestId('add-friend-button'));
      expect(mockOnAddFriend).toHaveBeenCalledTimes(1);
    });

    it('should have proper accessibility label', () => {
      const mockOnAddFriend = jest.fn();
      const { getByLabelText } = render(
        <PrivacyRestrictedView
          onAddFriend={mockOnAddFriend}
          testID="privacy-restricted"
        />
      );
      expect(getByLabelText('Add friend to view profile')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('should show loading indicator when isLoading is true', () => {
      const mockOnAddFriend = jest.fn();
      const { getByTestId } = render(
        <PrivacyRestrictedView
          onAddFriend={mockOnAddFriend}
          isLoading={true}
          testID="privacy-restricted"
        />
      );
      expect(getByTestId('button-loading')).toBeTruthy();
    });

    it('should disable button when loading', () => {
      const mockOnAddFriend = jest.fn();
      const { getByTestId } = render(
        <PrivacyRestrictedView
          onAddFriend={mockOnAddFriend}
          isLoading={true}
          testID="privacy-restricted"
        />
      );

      fireEvent.press(getByTestId('add-friend-button'));
      expect(mockOnAddFriend).not.toHaveBeenCalled();
    });

    it('should not show loading indicator when isLoading is false', () => {
      const mockOnAddFriend = jest.fn();
      const { queryByTestId } = render(
        <PrivacyRestrictedView
          onAddFriend={mockOnAddFriend}
          isLoading={false}
          testID="privacy-restricted"
        />
      );
      expect(queryByTestId('button-loading')).toBeNull();
    });
  });

  describe('without add friend button', () => {
    it('should still render privacy message without button', () => {
      const { getByText, queryByTestId } = render(
        <PrivacyRestrictedView testID="privacy-restricted" />
      );

      expect(getByText('This profile is private')).toBeTruthy();
      expect(getByText('Add as a friend to view their activity')).toBeTruthy();
      expect(queryByTestId('add-friend-button')).toBeNull();
    });
  });
});
