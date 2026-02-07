import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityFeedItem } from '../ActivityFeedItem';
import type { ActivityItem } from '@store/activityStore';

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
    Icon: ({ source, size, color, ...props }: any) => (
      <RN.View testID={props.testID || `icon-${source}`} />
    ),
    useTheme: () => ({
      colors: {
        onSurface: '#000',
        onSurfaceVariant: '#666',
        outlineVariant: '#E0E0E0',
      },
    }),
  };
});

describe('ActivityFeedItem', () => {
  const mockItem: ActivityItem = {
    id: '1',
    type: 'friend_achievement',
    userId: 'user-123',
    userName: 'John Doe',
    avatarUrl: 'https://example.com/avatar.jpg',
    message: 'John hit 15,000 steps!',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  };

  it('should render message', () => {
    const { getByText } = render(<ActivityFeedItem item={mockItem} />);

    expect(getByText('John hit 15,000 steps!')).toBeTruthy();
  });

  it('should render relative time', () => {
    const { getByText } = render(<ActivityFeedItem item={mockItem} />);

    expect(getByText('2 hours ago')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ActivityFeedItem item={mockItem} onPress={onPress} />
    );

    fireEvent.press(getByText('John hit 15,000 steps!'));

    expect(onPress).toHaveBeenCalledWith(mockItem);
  });

  it('should display correct icon for friend_achievement', () => {
    const { getByTestId } = render(<ActivityFeedItem item={mockItem} />);

    expect(getByTestId('icon-party-popper')).toBeTruthy();
  });

  it('should display correct icon for milestone', () => {
    const milestoneItem: ActivityItem = {
      ...mockItem,
      type: 'milestone',
    };

    const { getByTestId } = render(<ActivityFeedItem item={milestoneItem} />);

    expect(getByTestId('icon-target')).toBeTruthy();
  });

  it('should display correct icon for group_join', () => {
    const groupItem: ActivityItem = {
      ...mockItem,
      type: 'group_join',
    };

    const { getByTestId } = render(<ActivityFeedItem item={groupItem} />);

    expect(getByTestId('icon-account-group')).toBeTruthy();
  });

  it('should display correct icon for streak', () => {
    const streakItem: ActivityItem = {
      ...mockItem,
      type: 'streak',
    };

    const { getByTestId } = render(<ActivityFeedItem item={streakItem} />);

    expect(getByTestId('icon-fire')).toBeTruthy();
  });

  it('should show "Just now" for very recent activity', () => {
    const recentItem: ActivityItem = {
      ...mockItem,
      timestamp: new Date().toISOString(),
    };

    const { getByText } = render(<ActivityFeedItem item={recentItem} />);

    expect(getByText('Just now')).toBeTruthy();
  });

  it('should show minutes for activity within the hour', () => {
    const minutesAgoItem: ActivityItem = {
      ...mockItem,
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    };

    const { getByText } = render(<ActivityFeedItem item={minutesAgoItem} />);

    expect(getByText('30 minutes ago')).toBeTruthy();
  });

  it('should show "Yesterday" for activity from yesterday', () => {
    const yesterdayItem: ActivityItem = {
      ...mockItem,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    };

    const { getByText } = render(<ActivityFeedItem item={yesterdayItem} />);

    expect(getByText('Yesterday')).toBeTruthy();
  });

  it('should show days ago for activity within a week', () => {
    const daysAgoItem: ActivityItem = {
      ...mockItem,
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const { getByText } = render(<ActivityFeedItem item={daysAgoItem} />);

    expect(getByText('3 days ago')).toBeTruthy();
  });

  it('should show date for activity older than a week', () => {
    const oldItem: ActivityItem = {
      ...mockItem,
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const { getByText } = render(<ActivityFeedItem item={oldItem} />);

    // Should show formatted date
    const dateText = new Date(oldItem.timestamp).toLocaleDateString();
    expect(getByText(dateText)).toBeTruthy();
  });

  it('should show initials when avatarUrl is missing', () => {
    const noAvatarItem: ActivityItem = {
      ...mockItem,
      avatarUrl: undefined,
    };

    const { getByText } = render(<ActivityFeedItem item={noAvatarItem} />);

    // Should show initials "JD" for "John Doe"
    expect(getByText('JD')).toBeTruthy();
  });

  it('should show "1 minute ago" for singular minute', () => {
    const oneMinuteAgoItem: ActivityItem = {
      ...mockItem,
      timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    };

    const { getByText } = render(<ActivityFeedItem item={oneMinuteAgoItem} />);

    expect(getByText('1 minute ago')).toBeTruthy();
  });

  it('should show "1 hour ago" for singular hour', () => {
    const oneHourAgoItem: ActivityItem = {
      ...mockItem,
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    };

    const { getByText } = render(<ActivityFeedItem item={oneHourAgoItem} />);

    expect(getByText('1 hour ago')).toBeTruthy();
  });

  it('should render without onPress', () => {
    const { getByText } = render(<ActivityFeedItem item={mockItem} />);

    expect(getByText('John hit 15,000 steps!')).toBeTruthy();
  });
});
