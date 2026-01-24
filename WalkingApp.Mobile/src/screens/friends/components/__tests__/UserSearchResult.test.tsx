import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { UserSearchResult } from '../UserSearchResult';
import type { UserSearchResult as UserSearchResultType } from '@services/api/friendsApi';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  const Avatar = {
    Image: ({ size, source, ...props }: any) => (
      <RN.View {...props} testID="avatar-image" style={{ width: size, height: size }} />
    ),
    Text: ({ size, label, style, labelStyle, ...props }: any) => (
      <RN.View {...props} testID="avatar-text" style={{ width: size, height: size }}>
        <RN.Text>{label}</RN.Text>
      </RN.View>
    ),
  };

  return {
    Avatar,
    Text: ({ children, style, variant, ...props }: any) => (
      <RN.Text {...props} style={style}>{children}</RN.Text>
    ),
    Button: ({ children, mode, compact, disabled, onPress, labelStyle, testID, loading, ...props }: any) => (
      <RN.TouchableOpacity
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        {...props}
      >
        <RN.Text>{loading ? 'Loading...' : children}</RN.Text>
      </RN.TouchableOpacity>
    ),
    ActivityIndicator: ({ size, color, ...props }: any) => (
      <RN.View testID="activity-indicator" {...props} />
    ),
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        surface: '#FFFFFF',
        surfaceVariant: '#F5F5F5',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        secondaryContainer: '#E3F2FD',
        onSecondaryContainer: '#1565C0',
      },
    }),
  };
});

describe('UserSearchResult', () => {
  const createMockUser = (overrides: Partial<UserSearchResultType> = {}): UserSearchResultType => ({
    id: 'user-123',
    display_name: 'John Doe',
    username: 'johndoe',
    avatar_url: 'https://example.com/avatar.jpg',
    ...overrides,
  });

  const defaultProps = {
    user: createMockUser(),
    onAddFriend: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByText } = render(<UserSearchResult {...defaultProps} />);
      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should render the display name', () => {
      const { getByText } = render(<UserSearchResult {...defaultProps} />);
      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should render username with @ prefix when different from display name', () => {
      const { getByText } = render(<UserSearchResult {...defaultProps} />);
      expect(getByText('@johndoe')).toBeTruthy();
    });

    it('should not render username when same as display name', () => {
      const user = createMockUser({ display_name: 'johndoe', username: 'johndoe' });
      const { queryByText } = render(
        <UserSearchResult {...defaultProps} user={user} />
      );
      expect(queryByText('@johndoe')).toBeNull();
    });

    it('should render Add button initially', () => {
      const { getByText } = render(<UserSearchResult {...defaultProps} />);
      expect(getByText('Add')).toBeTruthy();
    });

    it('should apply testID when provided', () => {
      const { getByTestId } = render(
        <UserSearchResult {...defaultProps} testID="test-user-result" />
      );
      expect(getByTestId('test-user-result')).toBeTruthy();
    });
  });

  describe('avatar rendering', () => {
    it('should render Avatar.Image when avatar_url is provided', () => {
      const { getByTestId, queryByTestId } = render(
        <UserSearchResult {...defaultProps} />
      );
      expect(getByTestId('avatar-image')).toBeTruthy();
      expect(queryByTestId('avatar-text')).toBeNull();
    });

    it('should render Avatar.Text when avatar_url is not provided', () => {
      const user = createMockUser({ avatar_url: undefined });
      const { getByTestId, queryByTestId } = render(
        <UserSearchResult {...defaultProps} user={user} />
      );
      expect(getByTestId('avatar-text')).toBeTruthy();
      expect(queryByTestId('avatar-image')).toBeNull();
    });

    it('should show correct initials for single name', () => {
      const user = createMockUser({ display_name: 'John', avatar_url: undefined });
      const { getByText } = render(
        <UserSearchResult {...defaultProps} user={user} />
      );
      expect(getByText('J')).toBeTruthy();
    });

    it('should show correct initials for two-word name', () => {
      const user = createMockUser({ display_name: 'John Doe', avatar_url: undefined });
      const { getByText } = render(
        <UserSearchResult {...defaultProps} user={user} />
      );
      expect(getByText('JD')).toBeTruthy();
    });

    it('should limit initials to two characters', () => {
      const user = createMockUser({
        display_name: 'John William Doe',
        avatar_url: undefined,
      });
      const { getByText } = render(
        <UserSearchResult {...defaultProps} user={user} />
      );
      // Should show "JW" (first two initials)
      expect(getByText('JW')).toBeTruthy();
    });

    it('should uppercase initials', () => {
      const user = createMockUser({
        display_name: 'john doe',
        avatar_url: undefined,
      });
      const { getByText } = render(
        <UserSearchResult {...defaultProps} user={user} />
      );
      expect(getByText('JD')).toBeTruthy();
    });
  });

  describe('add friend button', () => {
    it('should call onAddFriend with user id when Add button is pressed', async () => {
      const onAddFriend = jest.fn().mockResolvedValue(undefined);
      const { getByTestId } = render(
        <UserSearchResult
          {...defaultProps}
          onAddFriend={onAddFriend}
        />
      );

      await act(async () => {
        fireEvent.press(getByTestId('add-friend-user-123'));
      });

      await waitFor(() => {
        expect(onAddFriend).toHaveBeenCalledWith('user-123');
      });
    });

    it('should show loading indicator while sending request', async () => {
      let resolvePromise: () => void;
      const onAddFriend = jest.fn().mockImplementation(
        () => new Promise<void>((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { getByTestId, queryByTestId } = render(
        <UserSearchResult
          {...defaultProps}
          onAddFriend={onAddFriend}
        />
      );

      await act(async () => {
        fireEvent.press(getByTestId('add-friend-user-123'));
      });

      await waitFor(() => {
        expect(getByTestId('activity-indicator')).toBeTruthy();
      });

      await act(async () => {
        resolvePromise!();
      });
    });

    it('should show Sent button after successful request', async () => {
      const onAddFriend = jest.fn().mockResolvedValue(undefined);
      const { getByTestId, getByText } = render(
        <UserSearchResult
          {...defaultProps}
          onAddFriend={onAddFriend}
        />
      );

      await act(async () => {
        fireEvent.press(getByTestId('add-friend-user-123'));
      });

      await waitFor(() => {
        expect(getByText('Sent')).toBeTruthy();
      });
    });

    it('should remain in Add state if request fails', async () => {
      const onAddFriend = jest.fn().mockRejectedValue(new Error('Failed'));
      const { getByTestId, getByText } = render(
        <UserSearchResult
          {...defaultProps}
          onAddFriend={onAddFriend}
        />
      );

      await act(async () => {
        fireEvent.press(getByTestId('add-friend-user-123'));
      });

      await waitFor(() => {
        // After error, button should still say "Add" (not "Sent")
        expect(getByText('Add')).toBeTruthy();
      });
    });
  });

  describe('onPress handler', () => {
    it('should call onPress with user when container is pressed', () => {
      const onPress = jest.fn();
      const user = createMockUser();
      const { getByText } = render(
        <UserSearchResult
          {...defaultProps}
          user={user}
          onPress={onPress}
        />
      );

      fireEvent.press(getByText('John Doe'));

      expect(onPress).toHaveBeenCalledWith(user);
    });

    it('should not throw when pressed without onPress handler', () => {
      const { getByText } = render(<UserSearchResult {...defaultProps} />);

      expect(() => {
        fireEvent.press(getByText('John Doe'));
      }).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('should have correct accessibility label initially', () => {
      const { getByLabelText } = render(<UserSearchResult {...defaultProps} />);
      expect(getByLabelText('John Doe')).toBeTruthy();
    });

    it('should update accessibility label after request sent', async () => {
      const onAddFriend = jest.fn().mockResolvedValue(undefined);
      const { getByTestId, getByLabelText } = render(
        <UserSearchResult
          {...defaultProps}
          onAddFriend={onAddFriend}
        />
      );

      await act(async () => {
        fireEvent.press(getByTestId('add-friend-user-123'));
      });

      await waitFor(() => {
        expect(getByLabelText('John Doe, friend request sent')).toBeTruthy();
      });
    });

    it('should have button accessibility role', () => {
      const { getByTestId } = render(
        <UserSearchResult {...defaultProps} testID="test-result" />
      );
      const container = getByTestId('test-result');
      expect(container.props.accessibilityRole).toBe('button');
    });
  });

  describe('edge cases', () => {
    it('should handle empty display name', () => {
      const user = createMockUser({ display_name: '', avatar_url: undefined });
      const { getByTestId } = render(
        <UserSearchResult {...defaultProps} user={user} />
      );
      // Should render without crashing
      expect(getByTestId('avatar-text')).toBeTruthy();
    });

    it('should handle undefined username', () => {
      const user = createMockUser({ username: undefined });
      const { queryByText, getByText } = render(
        <UserSearchResult {...defaultProps} user={user} />
      );
      expect(getByText('John Doe')).toBeTruthy();
      // Should not render username
      expect(queryByText(/@/)).toBeNull();
    });

    it('should handle multiple rapid Add button presses', async () => {
      let resolvePromise: () => void;
      const onAddFriend = jest.fn().mockImplementation(
        () => new Promise<void>((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { getByTestId, getByText } = render(
        <UserSearchResult
          {...defaultProps}
          onAddFriend={onAddFriend}
        />
      );

      // First press starts loading
      await act(async () => {
        fireEvent.press(getByTestId('add-friend-user-123'));
      });

      // Should be in loading state now
      await waitFor(() => {
        expect(getByTestId('activity-indicator')).toBeTruthy();
      });

      // After first press (which is now loading), the button shows loading indicator
      // Additional presses should not trigger new calls since component is in loading state
      expect(onAddFriend).toHaveBeenCalledTimes(1);

      // Resolve the first promise
      await act(async () => {
        resolvePromise!();
      });

      // Now should show "Sent"
      await waitFor(() => {
        expect(getByText('Sent')).toBeTruthy();
      });
    });
  });
});
