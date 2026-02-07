import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GroupCard } from '../GroupCard';
import type { GroupWithLeaderboard, LeaderboardEntry } from '@store/groupsStore';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  const Card = ({ children, style, mode }: any) => (
    <RN.View testID="card" style={style}>{children}</RN.View>
  );
  Card.Content = ({ children }: any) => (
    <RN.View testID="card-content">{children}</RN.View>
  );

  return {
    Card,
    Text: ({ children, style, variant, numberOfLines, ...props }: any) => (
      <RN.Text {...props} style={style} numberOfLines={numberOfLines}>{children}</RN.Text>
    ),
    Chip: ({ children, compact, textStyle, style }: any) => (
      <RN.View testID="chip" style={style}>
        <RN.Text style={textStyle}>{children}</RN.Text>
      </RN.View>
    ),
    Icon: ({ source, size, color, ...props }: any) => (
      <RN.View testID={props.testID || `icon-${source}`} />
    ),
    Avatar: {
      Image: ({ size, source }: any) => (
        <RN.View testID="avatar-image" style={{ width: size, height: size }} />
      ),
      Text: ({ size, label, style, labelStyle }: any) => (
        <RN.View testID="avatar-text" style={[{ width: size, height: size }, style]}>
          <RN.Text style={labelStyle}>{label}</RN.Text>
        </RN.View>
      ),
    },
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
      },
    }),
  };
});

describe('GroupCard', () => {
  const createMockLeaderboardEntry = (overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
    user_id: 'user-1',
    display_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    steps: 5000,
    rank: 1,
    rank_change: 0,
    is_current_user: false,
    ...overrides,
  });

  const createMockGroup = (overrides: Partial<GroupWithLeaderboard> = {}): GroupWithLeaderboard => ({
    id: 'group-1',
    name: 'Test Group',
    description: 'A test group',
    competition_type: 'weekly',
    is_private: false,
    member_count: 5,
    max_members: 5,
    created_at: '2024-01-01T00:00:00Z',
    user_role: 'member',
    period_start: '2024-01-01',
    period_end: '2024-01-07',
    period_display: 'Jan 1 - Jan 7',
    leaderboard_preview: [
      createMockLeaderboardEntry({ rank: 1, display_name: 'Leader', steps: 10000, user_id: 'user-1' }),
      createMockLeaderboardEntry({ rank: 2, display_name: 'Second', steps: 8000, user_id: 'user-2' }),
      createMockLeaderboardEntry({ rank: 3, display_name: 'Third', steps: 6000, user_id: 'user-3' }),
    ],
    current_user_rank: 4,
    current_user_steps: 4500,
    ...overrides,
  });

  const defaultProps = {
    group: createMockGroup(),
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByText } = render(<GroupCard {...defaultProps} />);
      expect(getByText('Test Group')).toBeTruthy();
    });

    it('should render the group name', () => {
      const { getByText } = render(<GroupCard {...defaultProps} />);
      expect(getByText('Test Group')).toBeTruthy();
    });

    it('should render member count', () => {
      const { getByText } = render(<GroupCard {...defaultProps} />);
      expect(getByText('5 members')).toBeTruthy();
    });

    it('should render singular member text for 1 member', () => {
      const group = createMockGroup({ member_count: 1 });
      const { getByText } = render(<GroupCard {...defaultProps} group={group} />);
      expect(getByText('1 member')).toBeTruthy();
    });

    it('should render competition type chip', () => {
      const { getByText } = render(<GroupCard {...defaultProps} />);
      expect(getByText('Weekly')).toBeTruthy();
    });

    it('should have correct testID when provided', () => {
      const { getByTestId } = render(
        <GroupCard {...defaultProps} testID="test-group-card" />
      );
      expect(getByTestId('test-group-card')).toBeTruthy();
    });
  });

  describe('competition types', () => {
    it('should display Daily for daily competition', () => {
      const group = createMockGroup({ competition_type: 'daily' });
      const { getByText } = render(<GroupCard {...defaultProps} group={group} />);
      expect(getByText('Daily')).toBeTruthy();
    });

    it('should display Weekly for weekly competition', () => {
      const group = createMockGroup({ competition_type: 'weekly' });
      const { getByText } = render(<GroupCard {...defaultProps} group={group} />);
      expect(getByText('Weekly')).toBeTruthy();
    });

    it('should display Monthly for monthly competition', () => {
      const group = createMockGroup({ competition_type: 'monthly' });
      const { getByText } = render(<GroupCard {...defaultProps} group={group} />);
      expect(getByText('Monthly')).toBeTruthy();
    });
  });

  describe('leaderboard preview', () => {
    it('should render top 3 leaderboard entries', () => {
      const { getByText } = render(<GroupCard {...defaultProps} />);
      expect(getByText('Leader')).toBeTruthy();
      expect(getByText('Second')).toBeTruthy();
      expect(getByText('Third')).toBeTruthy();
    });

    it('should display ranks for leaderboard entries', () => {
      const { getByText } = render(<GroupCard {...defaultProps} />);
      expect(getByText('1.')).toBeTruthy();
      expect(getByText('2.')).toBeTruthy();
      expect(getByText('3.')).toBeTruthy();
    });

    it('should display step counts in parentheses', () => {
      const { getByText } = render(<GroupCard {...defaultProps} />);
      // Use regex to handle locale-specific formatting
      expect(getByText(/\(10[,.]?000\)/)).toBeTruthy();
      expect(getByText(/\(8[,.]?000\)/)).toBeTruthy();
      expect(getByText(/\(6[,.]?000\)/)).toBeTruthy();
    });

    it('should show "No activity yet" when leaderboard is empty', () => {
      const group = createMockGroup({ leaderboard_preview: [] });
      const { getByText } = render(<GroupCard {...defaultProps} group={group} />);
      expect(getByText('No activity yet')).toBeTruthy();
    });

    it('should display "You" for current user entries', () => {
      const group = createMockGroup({
        leaderboard_preview: [
          createMockLeaderboardEntry({ rank: 1, display_name: 'Current User', steps: 10000, is_current_user: true }),
          createMockLeaderboardEntry({ rank: 2, display_name: 'Other User', steps: 8000 }),
        ],
      });
      const { getByText } = render(<GroupCard {...defaultProps} group={group} />);
      expect(getByText('You')).toBeTruthy();
    });
  });

  describe('user rank badge', () => {
    it('should display user rank badge when current_user_rank is present', () => {
      const { getByText } = render(<GroupCard {...defaultProps} />);
      expect(getByText("You're #4")).toBeTruthy();
    });

    it('should display user steps in rank badge', () => {
      const { getByText } = render(<GroupCard {...defaultProps} />);
      // Use regex to handle locale-specific formatting
      expect(getByText(/4[,.]?500 steps/)).toBeTruthy();
    });

    it('should not display rank badge when current_user_rank is undefined', () => {
      const group = createMockGroup({ current_user_rank: undefined, current_user_steps: undefined });
      const { queryByText } = render(<GroupCard {...defaultProps} group={group} />);
      expect(queryByText(/You're #/)).toBeNull();
    });

    it('should handle 0 steps in rank badge', () => {
      const group = createMockGroup({ current_user_rank: 5, current_user_steps: 0 });
      const { getByText } = render(<GroupCard {...defaultProps} group={group} />);
      expect(getByText('0 steps')).toBeTruthy();
    });
  });

  describe('onPress handler', () => {
    it('should call onPress with group data when pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <GroupCard {...defaultProps} onPress={onPress} testID="group-card" />
      );

      fireEvent.press(getByTestId('group-card'));

      expect(onPress).toHaveBeenCalledWith(defaultProps.group);
    });

    it('should call onPress only once per press', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <GroupCard {...defaultProps} onPress={onPress} testID="group-card" />
      );

      fireEvent.press(getByTestId('group-card'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle large member counts', () => {
      const group = createMockGroup({ member_count: 10000 });
      const { getByText } = render(<GroupCard {...defaultProps} group={group} />);
      expect(getByText('10000 members')).toBeTruthy();
    });

    it('should handle very long group names', () => {
      const group = createMockGroup({ name: 'This is a very long group name that might get truncated' });
      const { getByText } = render(<GroupCard {...defaultProps} group={group} />);
      expect(getByText('This is a very long group name that might get truncated')).toBeTruthy();
    });

    it('should handle high step counts', () => {
      const group = createMockGroup({
        leaderboard_preview: [
          createMockLeaderboardEntry({ rank: 1, steps: 100000 }),
        ],
      });
      const { getByText } = render(<GroupCard {...defaultProps} group={group} />);
      // Use regex to handle locale-specific formatting
      expect(getByText(/\(100[,.]?000\)/)).toBeTruthy();
    });
  });
});
