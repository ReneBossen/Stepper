import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FriendActionButton, FriendStatus } from '../FriendActionButton';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  return {
    Button: ({
      children,
      mode,
      icon,
      onPress,
      loading,
      disabled,
      style,
      textColor,
      accessibilityLabel,
      testID,
    }: any) => (
      <RN.TouchableOpacity
        testID={testID || `button-${mode}`}
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
    Text: ({ children, variant, style }: any) => (
      <RN.Text style={style} testID={`text-${variant}`}>
        {children}
      </RN.Text>
    ),
    useTheme: () => ({
      colors: {
        onSurfaceVariant: '#666666',
        error: '#F44336',
      },
    }),
  };
});

describe('FriendActionButton', () => {
  const mockCallbacks = {
    onAddFriend: jest.fn(),
    onAcceptRequest: jest.fn(),
    onDeclineRequest: jest.fn(),
    onRemoveFriend: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('status: none', () => {
    it('should render Add Friend button', () => {
      const { getByText } = render(
        <FriendActionButton
          status="none"
          {...mockCallbacks}
          testID="friend-action"
        />
      );
      expect(getByText('Add Friend')).toBeTruthy();
    });

    it('should call onAddFriend when pressed', () => {
      const { getByTestId } = render(
        <FriendActionButton
          status="none"
          {...mockCallbacks}
          testID="friend-action"
        />
      );

      fireEvent.press(getByTestId('friend-action'));
      expect(mockCallbacks.onAddFriend).toHaveBeenCalledTimes(1);
    });

    it('should have proper accessibility label', () => {
      const { getByLabelText } = render(
        <FriendActionButton
          status="none"
          {...mockCallbacks}
          testID="friend-action"
        />
      );
      expect(getByLabelText('Add friend')).toBeTruthy();
    });

    it('should show loading state', () => {
      const { getByTestId } = render(
        <FriendActionButton
          status="none"
          isLoading={true}
          {...mockCallbacks}
          testID="friend-action"
        />
      );
      expect(getByTestId('button-loading')).toBeTruthy();
    });

    it('should be disabled when loading', () => {
      const { getByTestId } = render(
        <FriendActionButton
          status="none"
          isLoading={true}
          {...mockCallbacks}
          testID="friend-action"
        />
      );

      fireEvent.press(getByTestId('friend-action'));
      expect(mockCallbacks.onAddFriend).not.toHaveBeenCalled();
    });
  });

  describe('status: pending_sent', () => {
    it('should render Friend Request Sent button', () => {
      const { getByText } = render(
        <FriendActionButton
          status="pending_sent"
          {...mockCallbacks}
          testID="friend-action"
        />
      );
      expect(getByText('Friend Request Sent')).toBeTruthy();
    });

    it('should be disabled', () => {
      const { getByTestId } = render(
        <FriendActionButton
          status="pending_sent"
          {...mockCallbacks}
          testID="friend-action"
        />
      );

      const button = getByTestId('friend-action');
      expect(button.props.disabled).toBe(true);
    });

    it('should have proper accessibility label', () => {
      const { getByLabelText } = render(
        <FriendActionButton
          status="pending_sent"
          {...mockCallbacks}
          testID="friend-action"
        />
      );
      expect(getByLabelText('Friend request sent')).toBeTruthy();
    });
  });

  describe('status: pending_received', () => {
    it('should render Accept and Decline buttons', () => {
      const { getByText } = render(
        <FriendActionButton
          status="pending_received"
          {...mockCallbacks}
          testID="friend-action"
        />
      );
      expect(getByText('Accept')).toBeTruthy();
      expect(getByText('Decline')).toBeTruthy();
    });

    it('should call onAcceptRequest when Accept is pressed', () => {
      const { getByLabelText } = render(
        <FriendActionButton
          status="pending_received"
          {...mockCallbacks}
          testID="friend-action"
        />
      );

      fireEvent.press(getByLabelText('Accept friend request'));
      expect(mockCallbacks.onAcceptRequest).toHaveBeenCalledTimes(1);
    });

    it('should call onDeclineRequest when Decline is pressed', () => {
      const { getByLabelText } = render(
        <FriendActionButton
          status="pending_received"
          {...mockCallbacks}
          testID="friend-action"
        />
      );

      fireEvent.press(getByLabelText('Decline friend request'));
      expect(mockCallbacks.onDeclineRequest).toHaveBeenCalledTimes(1);
    });

    it('should disable both buttons when loading', () => {
      const { getByLabelText } = render(
        <FriendActionButton
          status="pending_received"
          isLoading={true}
          {...mockCallbacks}
          testID="friend-action"
        />
      );

      fireEvent.press(getByLabelText('Accept friend request'));
      fireEvent.press(getByLabelText('Decline friend request'));

      expect(mockCallbacks.onAcceptRequest).not.toHaveBeenCalled();
      expect(mockCallbacks.onDeclineRequest).not.toHaveBeenCalled();
    });
  });

  describe('status: accepted', () => {
    it('should render Remove Friend button', () => {
      const { getByText } = render(
        <FriendActionButton
          status="accepted"
          {...mockCallbacks}
          testID="friend-action"
        />
      );
      expect(getByText('Remove Friend')).toBeTruthy();
    });

    it('should call onRemoveFriend when pressed', () => {
      const { getByLabelText } = render(
        <FriendActionButton
          status="accepted"
          {...mockCallbacks}
          testID="friend-action"
        />
      );

      fireEvent.press(getByLabelText('Remove friend'));
      expect(mockCallbacks.onRemoveFriend).toHaveBeenCalledTimes(1);
    });

    it('should have proper accessibility label', () => {
      const { getByLabelText } = render(
        <FriendActionButton
          status="accepted"
          {...mockCallbacks}
          testID="friend-action"
        />
      );
      expect(getByLabelText('Remove friend')).toBeTruthy();
    });

    it('should show loading state', () => {
      const { getByTestId } = render(
        <FriendActionButton
          status="accepted"
          isLoading={true}
          {...mockCallbacks}
          testID="friend-action"
        />
      );
      expect(getByTestId('button-loading')).toBeTruthy();
    });

    it('should display friends since date when provided', () => {
      const { getByText } = render(
        <FriendActionButton
          status="accepted"
          friendsSince="2025-02-15T10:30:00Z"
          {...mockCallbacks}
          testID="friend-action"
        />
      );
      expect(getByText('Friends since Feb 2025')).toBeTruthy();
    });

    it('should not display friends since when not provided', () => {
      const { queryByText } = render(
        <FriendActionButton
          status="accepted"
          {...mockCallbacks}
          testID="friend-action"
        />
      );
      expect(queryByText(/Friends since/)).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle unknown status gracefully', () => {
      const { queryByTestId } = render(
        <FriendActionButton
          status={'unknown' as FriendStatus}
          {...mockCallbacks}
          testID="friend-action"
        />
      );
      // Should render null for unknown status
      expect(queryByTestId('friend-action')).toBeNull();
    });

    it('should handle missing callbacks without crashing', () => {
      const { getByText } = render(
        <FriendActionButton status="none" testID="friend-action" />
      );
      expect(getByText('Add Friend')).toBeTruthy();
    });
  });
});
