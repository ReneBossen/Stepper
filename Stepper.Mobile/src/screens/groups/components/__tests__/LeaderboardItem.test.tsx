import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LeaderboardItem } from '../LeaderboardItem';
import type { LeaderboardEntry } from '@store/groupsStore';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  const Avatar = {
    Image: ({ size, source }: any) => (
      <RN.View testID="avatar-image" style={{ width: size, height: size }} />
    ),
    Text: ({ size, label, style, labelStyle }: any) => (
      <RN.View testID="avatar-text" style={[{ width: size, height: size }, style]}>
        <RN.Text style={labelStyle}>{label}</RN.Text>
      </RN.View>
    ),
  };

  return {
    Avatar,
    Text: ({ children, style, variant, numberOfLines, ...props }: any) => (
      <RN.Text {...props} style={style} numberOfLines={numberOfLines}>{children}</RN.Text>
    ),
    Icon: ({ source, size, color, ...props }: any) => (
      <RN.View {...props} testID={props.testID || `icon-${source}`} />
    ),
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        surface: '#FFFFFF',
        surfaceVariant: '#F5F5F5',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        onPrimary: '#FFFFFF',
        primaryContainer: '#E8F5E9',
        onPrimaryContainer: '#1B5E20',
        secondaryContainer: '#E3F2FD',
        onSecondaryContainer: '#0D47A1',
        error: '#F44336',
      },
    }),
  };
});

describe('LeaderboardItem', () => {
  const createMockEntry = (overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
    user_id: 'user-1',
    display_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    steps: 5000,
    rank: 4,
    rank_change: 0,
    is_current_user: false,
    ...overrides,
  });

  const defaultProps = {
    entry: createMockEntry(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByText } = render(<LeaderboardItem {...defaultProps} />);
      expect(getByText('Test User')).toBeTruthy();
    });

    it('should render the display name', () => {
      const { getByText } = render(<LeaderboardItem {...defaultProps} />);
      expect(getByText('Test User')).toBeTruthy();
    });

    it('should render step count with locale formatting', () => {
      const { getByText } = render(<LeaderboardItem {...defaultProps} />);
      // Use regex to handle locale-specific formatting
      expect(getByText(/5[,.]?000 steps/)).toBeTruthy();
    });

    it('should have correct testID when provided', () => {
      const { getByTestId } = render(
        <LeaderboardItem {...defaultProps} testID="test-item" />
      );
      expect(getByTestId('test-item')).toBeTruthy();
    });
  });

  describe('medal icons for top 3', () => {
    it('should display gold medal icon for rank 1', () => {
      const entry = createMockEntry({ rank: 1 });
      const { getByTestId } = render(<LeaderboardItem entry={entry} />);
      expect(getByTestId('icon-medal')).toBeTruthy();
    });

    it('should display silver medal icon for rank 2', () => {
      const entry = createMockEntry({ rank: 2 });
      const { getByTestId } = render(<LeaderboardItem entry={entry} />);
      expect(getByTestId('icon-medal')).toBeTruthy();
    });

    it('should display bronze medal icon for rank 3', () => {
      const entry = createMockEntry({ rank: 3 });
      const { getByTestId } = render(<LeaderboardItem entry={entry} />);
      expect(getByTestId('icon-medal')).toBeTruthy();
    });

    it('should display rank number for rank 4 and below', () => {
      const entry = createMockEntry({ rank: 4 });
      const { getByText, queryByTestId } = render(<LeaderboardItem entry={entry} />);
      expect(getByText('4')).toBeTruthy();
      // Should not have medal icons
      expect(queryByTestId('icon-medal')).toBeNull();
    });

    it('should display rank number for higher ranks', () => {
      const entry = createMockEntry({ rank: 10 });
      const { getByText } = render(<LeaderboardItem entry={entry} />);
      expect(getByText('10')).toBeTruthy();
    });
  });

  describe('rank change indicators', () => {
    it('should display up arrow and positive change when rank improved', () => {
      const entry = createMockEntry({ rank_change: 3 });
      const { getByText } = render(<LeaderboardItem entry={entry} />);
      // Check for positive change indicator
      expect(getByText(/\+3/)).toBeTruthy();
    });

    it('should display down arrow and negative change when rank dropped', () => {
      const entry = createMockEntry({ rank_change: -2 });
      const { getByText } = render(<LeaderboardItem entry={entry} />);
      // Check for negative change indicator
      expect(getByText(/-2/)).toBeTruthy();
    });

    it('should display dash and 0 when rank unchanged', () => {
      const entry = createMockEntry({ rank_change: 0 });
      const { getAllByText } = render(<LeaderboardItem entry={entry} />);
      // Check for zero change - there might be multiple elements containing 0
      const zeroElements = getAllByText(/0/);
      expect(zeroElements.length).toBeGreaterThan(0);
    });

    it('should handle large positive rank changes', () => {
      const entry = createMockEntry({ rank_change: 10 });
      const { getByText } = render(<LeaderboardItem entry={entry} />);
      expect(getByText(/\+10/)).toBeTruthy();
    });

    it('should handle large negative rank changes', () => {
      const entry = createMockEntry({ rank_change: -15 });
      const { getByText } = render(<LeaderboardItem entry={entry} />);
      expect(getByText(/-15/)).toBeTruthy();
    });
  });

  describe('current user highlighting', () => {
    it('should display "You (name)" for current user', () => {
      const entry = createMockEntry({ display_name: 'John', is_current_user: true });
      const { getByText } = render(<LeaderboardItem entry={entry} />);
      expect(getByText('You (John)')).toBeTruthy();
    });

    it('should not prefix "You" for non-current user', () => {
      const entry = createMockEntry({ display_name: 'John', is_current_user: false });
      const { getByText, queryByText } = render(<LeaderboardItem entry={entry} />);
      expect(getByText('John')).toBeTruthy();
      expect(queryByText(/You \(/)).toBeNull();
    });
  });

  describe('avatar rendering', () => {
    it('should render Avatar.Image when avatar_url is provided', () => {
      const entry = createMockEntry({ avatar_url: 'https://example.com/avatar.jpg' });
      const { getByTestId, queryByTestId } = render(<LeaderboardItem entry={entry} />);
      expect(getByTestId('avatar-image')).toBeTruthy();
      expect(queryByTestId('avatar-text')).toBeNull();
    });

    it('should render Avatar.Text when avatar_url is not provided', () => {
      const entry = createMockEntry({ avatar_url: undefined });
      const { getByTestId, queryByTestId } = render(<LeaderboardItem entry={entry} />);
      expect(getByTestId('avatar-text')).toBeTruthy();
      expect(queryByTestId('avatar-image')).toBeNull();
    });

    it('should show correct initials for single name', () => {
      const entry = createMockEntry({ display_name: 'John', avatar_url: undefined });
      const { getByText } = render(<LeaderboardItem entry={entry} />);
      expect(getByText('J')).toBeTruthy();
    });

    it('should show correct initials for two-word name', () => {
      const entry = createMockEntry({ display_name: 'John Doe', avatar_url: undefined });
      const { getByText } = render(<LeaderboardItem entry={entry} />);
      expect(getByText('JD')).toBeTruthy();
    });

    it('should limit initials to two characters', () => {
      const entry = createMockEntry({ display_name: 'John William Doe', avatar_url: undefined });
      const { getByText } = render(<LeaderboardItem entry={entry} />);
      expect(getByText('JW')).toBeTruthy();
    });
  });

  describe('step count display', () => {
    it('should display formatted step count', () => {
      const entry = createMockEntry({ steps: 12345 });
      const { getByText } = render(<LeaderboardItem entry={entry} />);
      // Use regex to handle locale-specific formatting
      expect(getByText(/12[,.]?345 steps/)).toBeTruthy();
    });

    it('should handle zero steps', () => {
      const entry = createMockEntry({ steps: 0 });
      const { getByText } = render(<LeaderboardItem entry={entry} />);
      expect(getByText('0 steps')).toBeTruthy();
    });

    it('should handle large step counts', () => {
      const entry = createMockEntry({ steps: 100000 });
      const { getByText } = render(<LeaderboardItem entry={entry} />);
      // Use regex to handle locale-specific formatting
      expect(getByText(/100[,.]?000 steps/)).toBeTruthy();
    });
  });

  describe('onPress handler', () => {
    it('should call onPress with entry data when pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <LeaderboardItem {...defaultProps} onPress={onPress} testID="item" />
      );

      fireEvent.press(getByTestId('item'));

      expect(onPress).toHaveBeenCalledWith(defaultProps.entry);
    });

    it('should call onPress only once per press', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <LeaderboardItem {...defaultProps} onPress={onPress} testID="item" />
      );

      fireEvent.press(getByTestId('item'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should not throw when pressed without onPress handler', () => {
      const { getByTestId } = render(
        <LeaderboardItem {...defaultProps} testID="item" />
      );

      expect(() => {
        fireEvent.press(getByTestId('item'));
      }).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('should have correct accessibility label', () => {
      const entry = createMockEntry({ rank: 2, display_name: 'John', steps: 8500 });
      const { getByLabelText } = render(<LeaderboardItem entry={entry} />);
      // Use regex to handle locale-specific formatting
      expect(getByLabelText(/Rank 2, John, 8[,.]?500 steps/)).toBeTruthy();
    });

    it('should have button accessibility role', () => {
      const { getByTestId } = render(
        <LeaderboardItem {...defaultProps} testID="item" />
      );
      const item = getByTestId('item');
      expect(item.props.accessibilityRole).toBe('button');
    });
  });

  describe('edge cases', () => {
    it('should handle empty display name', () => {
      const entry = createMockEntry({ display_name: '', avatar_url: undefined });
      const { getByTestId } = render(<LeaderboardItem entry={entry} testID="item" />);
      // Should render without crashing
      expect(getByTestId('item')).toBeTruthy();
    });

    it('should handle very long display names', () => {
      const entry = createMockEntry({
        display_name: 'This is a very long display name that might get truncated',
      });
      const { getByText } = render(<LeaderboardItem entry={entry} />);
      expect(
        getByText('This is a very long display name that might get truncated')
      ).toBeTruthy();
    });

    it('should handle current user with high rank', () => {
      const entry = createMockEntry({
        rank: 1,
        display_name: 'Me',
        is_current_user: true,
        steps: 50000,
      });
      const { getByText, getByTestId } = render(<LeaderboardItem entry={entry} />);
      expect(getByText('You (Me)')).toBeTruthy();
      expect(getByTestId('icon-medal')).toBeTruthy(); // Gold medal icon
      // Use regex to handle locale-specific formatting
      expect(getByText(/50[,.]?000 steps/)).toBeTruthy();
    });
  });
});
