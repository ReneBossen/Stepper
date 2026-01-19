import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FriendListItem } from '../FriendListItem';
import type { Friend } from '@store/friendsStore';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  const Avatar = {
    Image: ({ size, source, ...props }: any) => (
      <RN.View {...props} testID="avatar-image" style={{ width: size, height: size }} />
    ),
    Text: ({ size, label, ...props }: any) => (
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
    ProgressBar: ({ progress, color, style, ...props }: any) => (
      <RN.View
        {...props}
        testID="progress-bar"
        accessibilityValue={{ now: progress * 100, min: 0, max: 100 }}
        style={style}
      />
    ),
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        secondary: '#2196F3',
        surface: '#FFFFFF',
        surfaceVariant: '#F5F5F5',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        primaryContainer: '#E8F5E9',
        onPrimaryContainer: '#1B5E20',
      },
    }),
  };
});

describe('FriendListItem', () => {
  const createMockFriend = (overrides: Partial<Friend> = {}): Friend => ({
    id: 'friendship-1',
    user_id: 'user-1',
    display_name: 'John Doe',
    username: 'johndoe',
    avatar_url: 'https://example.com/avatar.jpg',
    today_steps: 8500,
    status: 'accepted',
    ...overrides,
  });

  const defaultProps = {
    friend: createMockFriend(),
    dailyGoal: 10000,
  };

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByText } = render(<FriendListItem {...defaultProps} />);
      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should render the friend display name', () => {
      const { getByText } = render(<FriendListItem {...defaultProps} />);
      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should render today steps with locale formatting', () => {
      const { getByText } = render(<FriendListItem {...defaultProps} />);
      expect(getByText(`${(8500).toLocaleString()} steps today`)).toBeTruthy();
    });

    it('should render progress bar', () => {
      const { getByTestId } = render(<FriendListItem {...defaultProps} />);
      expect(getByTestId('progress-bar')).toBeTruthy();
    });

    it('should render percentage', () => {
      const { getByText } = render(<FriendListItem {...defaultProps} />);
      // 8500 / 10000 = 85%
      expect(getByText('85%')).toBeTruthy();
    });

    it('should have correct testID when provided', () => {
      const { getByTestId } = render(
        <FriendListItem {...defaultProps} testID="test-friend-item" />
      );
      expect(getByTestId('test-friend-item')).toBeTruthy();
    });
  });

  describe('avatar rendering', () => {
    it('should render Avatar.Image when avatar_url is provided', () => {
      const { getByTestId, queryByTestId } = render(
        <FriendListItem {...defaultProps} />
      );
      expect(getByTestId('avatar-image')).toBeTruthy();
      expect(queryByTestId('avatar-text')).toBeNull();
    });

    it('should render Avatar.Text when avatar_url is not provided', () => {
      const friend = createMockFriend({ avatar_url: undefined });
      const { getByTestId, queryByTestId } = render(
        <FriendListItem friend={friend} dailyGoal={10000} />
      );
      expect(getByTestId('avatar-text')).toBeTruthy();
      expect(queryByTestId('avatar-image')).toBeNull();
    });

    it('should show correct initials for single name', () => {
      const friend = createMockFriend({ display_name: 'John', avatar_url: undefined });
      const { getByText } = render(
        <FriendListItem friend={friend} dailyGoal={10000} />
      );
      expect(getByText('J')).toBeTruthy();
    });

    it('should show correct initials for two-word name', () => {
      const friend = createMockFriend({ display_name: 'John Doe', avatar_url: undefined });
      const { getByText } = render(
        <FriendListItem friend={friend} dailyGoal={10000} />
      );
      expect(getByText('JD')).toBeTruthy();
    });

    it('should limit initials to two characters', () => {
      const friend = createMockFriend({
        display_name: 'John William Doe',
        avatar_url: undefined,
      });
      const { getByText } = render(
        <FriendListItem friend={friend} dailyGoal={10000} />
      );
      // Should show "JW" (first two initials)
      expect(getByText('JW')).toBeTruthy();
    });
  });

  describe('steps display', () => {
    it('should display "No activity today" when steps are 0', () => {
      const friend = createMockFriend({ today_steps: 0 });
      const { getByText } = render(
        <FriendListItem friend={friend} dailyGoal={10000} />
      );
      expect(getByText('No activity today')).toBeTruthy();
    });

    it('should display "No activity today" when steps are undefined', () => {
      const friend = createMockFriend({ today_steps: undefined });
      const { getByText } = render(
        <FriendListItem friend={friend} dailyGoal={10000} />
      );
      expect(getByText('No activity today')).toBeTruthy();
    });

    it('should format large step counts with locale string', () => {
      const friend = createMockFriend({ today_steps: 15000 });
      const { getByText } = render(
        <FriendListItem friend={friend} dailyGoal={10000} />
      );
      expect(getByText(`${(15000).toLocaleString()} steps today`)).toBeTruthy();
    });
  });

  describe('progress calculation', () => {
    it('should calculate correct percentage for partial goal', () => {
      const friend = createMockFriend({ today_steps: 5000 });
      const { getByText } = render(
        <FriendListItem friend={friend} dailyGoal={10000} />
      );
      expect(getByText('50%')).toBeTruthy();
    });

    it('should show 100% when goal is exactly met', () => {
      const friend = createMockFriend({ today_steps: 10000 });
      const { getByText } = render(
        <FriendListItem friend={friend} dailyGoal={10000} />
      );
      expect(getByText('100%')).toBeTruthy();
    });

    it('should show percentage above 100% when goal is exceeded', () => {
      const friend = createMockFriend({ today_steps: 15000 });
      const { getByText } = render(
        <FriendListItem friend={friend} dailyGoal={10000} />
      );
      expect(getByText('150%')).toBeTruthy();
    });

    it('should show 0% when steps are 0', () => {
      const friend = createMockFriend({ today_steps: 0 });
      const { getByText } = render(
        <FriendListItem friend={friend} dailyGoal={10000} />
      );
      expect(getByText('0%')).toBeTruthy();
    });

    it('should use default daily goal when not provided', () => {
      const friend = createMockFriend({ today_steps: 5000 });
      const { getByText } = render(<FriendListItem friend={friend} />);
      // Default goal is 10000, so 5000/10000 = 50%
      expect(getByText('50%')).toBeTruthy();
    });

    it('should handle different daily goals', () => {
      const friend = createMockFriend({ today_steps: 4000 });
      const { getByText } = render(
        <FriendListItem friend={friend} dailyGoal={8000} />
      );
      // 4000 / 8000 = 50%
      expect(getByText('50%')).toBeTruthy();
    });
  });

  describe('onPress handler', () => {
    it('should call onPress when pressed with friend data', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <FriendListItem {...defaultProps} onPress={onPress} />
      );

      fireEvent.press(getByText('John Doe'));

      expect(onPress).toHaveBeenCalledWith(defaultProps.friend);
    });

    it('should call onPress only once per press', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <FriendListItem {...defaultProps} onPress={onPress} />
      );

      fireEvent.press(getByText('John Doe'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should not throw when pressed without onPress handler', () => {
      const { getByText } = render(<FriendListItem {...defaultProps} />);

      expect(() => {
        fireEvent.press(getByText('John Doe'));
      }).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('should have correct accessibility label', () => {
      const { getByLabelText } = render(<FriendListItem {...defaultProps} />);
      // Match accessibility label format: "name, X steps today, Y% of goal"
      // toLocaleString format may vary by locale, so we use a more flexible regex
      expect(
        getByLabelText(/John Doe.*steps today.*85% of goal/)
      ).toBeTruthy();
    });

    it('should have button accessibility role via accessibilityRole prop', () => {
      const { getByTestId } = render(
        <FriendListItem {...defaultProps} testID="test-item" />
      );
      const container = getByTestId('test-item');
      expect(container.props.accessibilityRole).toBe('button');
    });

    it('should include step count in accessibility label', () => {
      const friend = createMockFriend({ today_steps: 12345 });
      const { getByLabelText } = render(
        <FriendListItem friend={friend} dailyGoal={10000} />
      );
      // Match accessibility label with steps and percentage
      expect(getByLabelText(/steps today.*123% of goal/)).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle very large step counts', () => {
      const friend = createMockFriend({ today_steps: 100000 });
      const { getByText } = render(
        <FriendListItem friend={friend} dailyGoal={10000} />
      );
      expect(getByText(`${(100000).toLocaleString()} steps today`)).toBeTruthy();
      expect(getByText('1000%')).toBeTruthy();
    });

    it('should handle small daily goal', () => {
      const friend = createMockFriend({ today_steps: 100 });
      const { getByText } = render(
        <FriendListItem friend={friend} dailyGoal={100} />
      );
      expect(getByText('100%')).toBeTruthy();
    });

    it('should handle empty display name', () => {
      const friend = createMockFriend({ display_name: '', avatar_url: undefined });
      const { getByTestId } = render(
        <FriendListItem friend={friend} dailyGoal={10000} />
      );
      // Should render without crashing
      expect(getByTestId('avatar-text')).toBeTruthy();
    });
  });
});
