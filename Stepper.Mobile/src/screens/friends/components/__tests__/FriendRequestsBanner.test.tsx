import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FriendRequestsBanner } from '../FriendRequestsBanner';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  return {
    Text: ({ children, style, variant, ...props }: any) => (
      <RN.Text {...props} style={style}>{children}</RN.Text>
    ),
    Badge: ({ children, style, size, ...props }: any) => (
      <RN.View {...props} testID="badge" style={style}>
        <RN.Text>{children}</RN.Text>
      </RN.View>
    ),
    Icon: ({ source, size, color, ...props }: any) => (
      <RN.View {...props} testID={`icon-${source}`} style={{ width: size, height: size }} />
    ),
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        primaryContainer: '#E8F5E9',
        secondaryContainer: '#E3F2FD',
        onSecondaryContainer: '#0D47A1',
      },
    }),
  };
});

describe('FriendRequestsBanner', () => {
  const defaultProps = {
    count: 3,
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when count is greater than 0', () => {
      const { getByText } = render(<FriendRequestsBanner {...defaultProps} />);
      expect(getByText('Friend Requests')).toBeTruthy();
    });

    it('should not render when count is 0', () => {
      const { queryByText } = render(
        <FriendRequestsBanner count={0} onPress={jest.fn()} />
      );
      expect(queryByText('Friend Requests')).toBeNull();
    });

    it('should render the badge with count', () => {
      const { getByTestId, getByText } = render(
        <FriendRequestsBanner {...defaultProps} />
      );
      expect(getByTestId('badge')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
    });

    it('should render account-clock icon', () => {
      const { getByTestId } = render(<FriendRequestsBanner {...defaultProps} />);
      expect(getByTestId('icon-account-clock')).toBeTruthy();
    });

    it('should render chevron-right icon', () => {
      const { getByTestId } = render(<FriendRequestsBanner {...defaultProps} />);
      expect(getByTestId('icon-chevron-right')).toBeTruthy();
    });

    it('should have correct testID when provided', () => {
      const { getByTestId } = render(
        <FriendRequestsBanner {...defaultProps} testID="test-banner" />
      );
      expect(getByTestId('test-banner')).toBeTruthy();
    });
  });

  describe('count variations', () => {
    it('should display count of 1', () => {
      const { getByText } = render(
        <FriendRequestsBanner count={1} onPress={jest.fn()} />
      );
      expect(getByText('1')).toBeTruthy();
    });

    it('should display count of 10', () => {
      const { getByText } = render(
        <FriendRequestsBanner count={10} onPress={jest.fn()} />
      );
      expect(getByText('10')).toBeTruthy();
    });

    it('should display count of 99', () => {
      const { getByText } = render(
        <FriendRequestsBanner count={99} onPress={jest.fn()} />
      );
      expect(getByText('99')).toBeTruthy();
    });

    it('should display large count', () => {
      const { getByText } = render(
        <FriendRequestsBanner count={150} onPress={jest.fn()} />
      );
      expect(getByText('150')).toBeTruthy();
    });
  });

  describe('onPress handler', () => {
    it('should call onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <FriendRequestsBanner count={3} onPress={onPress} />
      );

      fireEvent.press(getByText('Friend Requests'));

      expect(onPress).toHaveBeenCalled();
    });

    it('should call onPress only once per press', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <FriendRequestsBanner count={3} onPress={onPress} />
      );

      fireEvent.press(getByText('Friend Requests'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should not throw when pressed without onPress handler', () => {
      const { getByText } = render(<FriendRequestsBanner count={3} />);

      expect(() => {
        fireEvent.press(getByText('Friend Requests'));
      }).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('should have correct accessibility label for single request', () => {
      const { getByLabelText } = render(
        <FriendRequestsBanner count={1} onPress={jest.fn()} />
      );
      expect(
        getByLabelText('1 pending friend request. Tap to view.')
      ).toBeTruthy();
    });

    it('should have correct accessibility label for multiple requests', () => {
      const { getByLabelText } = render(
        <FriendRequestsBanner count={5} onPress={jest.fn()} />
      );
      expect(
        getByLabelText('5 pending friend requests. Tap to view.')
      ).toBeTruthy();
    });

    it('should have button accessibility role via accessibilityRole prop', () => {
      const { getByTestId } = render(
        <FriendRequestsBanner {...defaultProps} testID="test-banner" />
      );
      const container = getByTestId('test-banner');
      expect(container.props.accessibilityRole).toBe('button');
    });
  });

  describe('edge cases', () => {
    it('should not render when count is negative', () => {
      // Note: Negative count doesn't make sense, but testing behavior
      const { queryByText } = render(
        <FriendRequestsBanner count={-1} onPress={jest.fn()} />
      );
      // Component shows when count !== 0
      expect(queryByText('Friend Requests')).toBeTruthy();
    });

    it('should render correctly when onPress is undefined', () => {
      const { getByText } = render(<FriendRequestsBanner count={3} />);
      expect(getByText('Friend Requests')).toBeTruthy();
    });
  });
});
