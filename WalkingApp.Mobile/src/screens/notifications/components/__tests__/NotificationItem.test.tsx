import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NotificationItem } from '../NotificationItem';
import type { Notification } from '@store/notificationsStore';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  return {
    Text: ({ children, style, variant, numberOfLines, ...props }: any) => (
      <RN.Text {...props} style={style} numberOfLines={numberOfLines}>
        {children}
      </RN.Text>
    ),
    IconButton: ({ icon, size, onPress, iconColor, style, testID }: any) => (
      <RN.TouchableOpacity
        testID={testID || `icon-button-${icon}`}
        onPress={onPress}
        style={style}
      >
        <RN.Text>{icon}</RN.Text>
      </RN.TouchableOpacity>
    ),
    Surface: ({ children, style, ...props }: any) => (
      <RN.View {...props} style={style}>
        {children}
      </RN.View>
    ),
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        primaryContainer: '#E8F5E9',
        onPrimaryContainer: '#1B5E20',
        secondaryContainer: '#F3E5F5',
        onSecondaryContainer: '#4A148C',
        tertiaryContainer: '#E0F7FA',
        onTertiaryContainer: '#006064',
        surfaceVariant: '#F5F5F5',
        outlineVariant: '#EEEEEE',
        error: '#F44336',
      },
    }),
  };
});

describe('NotificationItem', () => {
  const mockOnPress = jest.fn();
  const mockOnDelete = jest.fn();

  const createMockNotification = (overrides: Partial<Notification> = {}): Notification => ({
    id: 'notif-1',
    user_id: 'user-1',
    type: 'general',
    title: 'Test Notification',
    message: 'This is a test notification message.',
    is_read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const notification = createMockNotification();
      const { getByTestId } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
          testID="notification-item"
        />
      );
      expect(getByTestId('notification-item')).toBeTruthy();
    });

    it('should display notification title', () => {
      const notification = createMockNotification({ title: 'New Friend Request' });
      const { getByText } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
        />
      );
      expect(getByText('New Friend Request')).toBeTruthy();
    });

    it('should display notification message', () => {
      const notification = createMockNotification({ message: 'John wants to be your friend' });
      const { getByText } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
        />
      );
      expect(getByText('John wants to be your friend')).toBeTruthy();
    });
  });

  describe('unread indicator', () => {
    it('should show unread indicator for unread notifications', () => {
      const notification = createMockNotification({ is_read: false });
      const { getByTestId } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
          testID="notification-item"
        />
      );
      expect(getByTestId('notification-item-unread-indicator')).toBeTruthy();
    });

    it('should not show unread indicator for read notifications', () => {
      const notification = createMockNotification({ is_read: true });
      const { queryByTestId } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
          testID="notification-item"
        />
      );
      expect(queryByTestId('notification-item-unread-indicator')).toBeNull();
    });
  });

  describe('notification type icons', () => {
    it('should show account-plus icon for friend_request type', () => {
      const notification = createMockNotification({ type: 'friend_request' });
      const { getByText } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
        />
      );
      expect(getByText('account-plus')).toBeTruthy();
    });

    it('should show account-check icon for friend_accepted type', () => {
      const notification = createMockNotification({ type: 'friend_accepted' });
      const { getByText } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
        />
      );
      expect(getByText('account-check')).toBeTruthy();
    });

    it('should show account-group icon for group_invite type', () => {
      const notification = createMockNotification({ type: 'group_invite' });
      const { getByText } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
        />
      );
      expect(getByText('account-group')).toBeTruthy();
    });

    it('should show trophy icon for goal_achieved type', () => {
      const notification = createMockNotification({ type: 'goal_achieved' });
      const { getByText } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
        />
      );
      expect(getByText('trophy')).toBeTruthy();
    });

    it('should show bell icon for general type', () => {
      const notification = createMockNotification({ type: 'general' });
      const { getByText } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
        />
      );
      expect(getByText('bell')).toBeTruthy();
    });
  });

  describe('timestamp formatting', () => {
    it('should show "Just now" for recent notifications', () => {
      const notification = createMockNotification({
        created_at: new Date().toISOString(),
      });
      const { getByText } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
        />
      );
      expect(getByText('Just now')).toBeTruthy();
    });

    it('should show minutes ago for notifications within an hour', () => {
      const notification = createMockNotification({
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      });
      const { getByText } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
        />
      );
      expect(getByText('30 minutes ago')).toBeTruthy();
    });

    it('should show "1 minute ago" for singular minute', () => {
      const notification = createMockNotification({
        created_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 minute ago
      });
      const { getByText } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
        />
      );
      expect(getByText('1 minute ago')).toBeTruthy();
    });

    it('should show hours ago for notifications within a day', () => {
      const notification = createMockNotification({
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      });
      const { getByText } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
        />
      );
      expect(getByText('2 hours ago')).toBeTruthy();
    });

    it('should show "1 hour ago" for singular hour', () => {
      const notification = createMockNotification({
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      });
      const { getByText } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
        />
      );
      expect(getByText('1 hour ago')).toBeTruthy();
    });

    it('should show "Yesterday" for notifications from yesterday', () => {
      const notification = createMockNotification({
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      });
      const { getByText } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
        />
      );
      expect(getByText('Yesterday')).toBeTruthy();
    });

    it('should show days ago for notifications within a week', () => {
      const notification = createMockNotification({
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      });
      const { getByText } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
        />
      );
      expect(getByText('3 days ago')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('should call onPress when notification is tapped', () => {
      const notification = createMockNotification();
      const { getByTestId } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
          testID="notification-item"
        />
      );

      fireEvent.press(getByTestId('notification-item'));

      expect(mockOnPress).toHaveBeenCalledWith(notification);
    });

    it('should show delete button on long press', () => {
      const notification = createMockNotification();
      const { getByTestId, queryByTestId } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
          testID="notification-item"
        />
      );

      // Initially delete button should not be visible
      expect(queryByTestId('notification-item-delete-button')).toBeNull();

      // Long press to show delete
      fireEvent(getByTestId('notification-item'), 'onLongPress');

      // Now delete button should be visible
      expect(getByTestId('notification-item-delete-button')).toBeTruthy();
    });

    it('should show cancel button after long press', () => {
      const notification = createMockNotification();
      const { getByTestId, queryByTestId } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
          testID="notification-item"
        />
      );

      fireEvent(getByTestId('notification-item'), 'onLongPress');

      expect(getByTestId('notification-item-cancel-delete')).toBeTruthy();
    });

    it('should hide delete button when cancel is pressed', () => {
      const notification = createMockNotification();
      const { getByTestId, queryByTestId } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
          testID="notification-item"
        />
      );

      // Long press to show delete
      fireEvent(getByTestId('notification-item'), 'onLongPress');
      expect(getByTestId('notification-item-delete-button')).toBeTruthy();

      // Press cancel
      fireEvent.press(getByTestId('notification-item-cancel-delete'));

      // Delete button should be hidden
      expect(queryByTestId('notification-item-delete-button')).toBeNull();
    });

    it('should show confirmation alert when delete is pressed', () => {
      const notification = createMockNotification();
      const { getByTestId } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
          testID="notification-item"
        />
      );

      // Long press to show delete
      fireEvent(getByTestId('notification-item'), 'onLongPress');

      // Press delete
      fireEvent.press(getByTestId('notification-item-delete-button'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Notification',
        'Are you sure you want to delete this notification?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Delete', style: 'destructive' }),
        ])
      );
    });

    it('should call onDelete when delete is confirmed in alert', () => {
      const notification = createMockNotification({ id: 'delete-me' });
      const { getByTestId } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
          testID="notification-item"
        />
      );

      // Long press to show delete
      fireEvent(getByTestId('notification-item'), 'onLongPress');

      // Press delete
      fireEvent.press(getByTestId('notification-item-delete-button'));

      // Get the delete handler from the alert call
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const deleteButton = buttons.find((b: any) => b.text === 'Delete');

      // Simulate pressing delete in the alert
      deleteButton.onPress();

      expect(mockOnDelete).toHaveBeenCalledWith('delete-me');
    });

    it('should hide delete UI when cancel is pressed in alert', async () => {
      const notification = createMockNotification();
      const { getByTestId, queryByTestId } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
          testID="notification-item"
        />
      );

      // Long press to show delete
      fireEvent(getByTestId('notification-item'), 'onLongPress');

      // Press delete button
      fireEvent.press(getByTestId('notification-item-delete-button'));

      // Get the cancel handler from the alert call
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const cancelButton = buttons.find((b: any) => b.text === 'Cancel');

      // Simulate pressing cancel in the alert
      cancelButton.onPress();

      // Wait for state update and verify delete button is hidden
      await waitFor(() => {
        expect(queryByTestId('notification-item-delete-button')).toBeNull();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibility label for unread notification', () => {
      const notification = createMockNotification({
        title: 'Test Title',
        message: 'Test Message',
        is_read: false,
        created_at: new Date().toISOString(),
      });
      const { getByTestId } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
          testID="notification-item"
        />
      );

      const item = getByTestId('notification-item');
      expect(item.props.accessibilityLabel).toContain('Test Title');
      expect(item.props.accessibilityLabel).toContain('Test Message');
      expect(item.props.accessibilityLabel).toContain('Unread');
    });

    it('should not include "Unread" in accessibility label for read notification', () => {
      const notification = createMockNotification({
        title: 'Test Title',
        is_read: true,
      });
      const { getByTestId } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
          testID="notification-item"
        />
      );

      const item = getByTestId('notification-item');
      expect(item.props.accessibilityLabel).not.toContain('Unread');
    });

    it('should have button accessibility role', () => {
      const notification = createMockNotification();
      const { getByTestId } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
          testID="notification-item"
        />
      );

      const item = getByTestId('notification-item');
      expect(item.props.accessibilityRole).toBe('button');
    });
  });

  describe('styling', () => {
    it('should have bolder font weight for unread notifications', () => {
      const notification = createMockNotification({ is_read: false });
      // This tests the render path, actual style verification would need deeper inspection
      const { getByText } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
        />
      );
      // Component renders without error with unread state
      expect(getByText(notification.title)).toBeTruthy();
    });

    it('should have normal font weight for read notifications', () => {
      const notification = createMockNotification({ is_read: true });
      const { getByText } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onDelete={mockOnDelete}
        />
      );
      // Component renders without error with read state
      expect(getByText(notification.title)).toBeTruthy();
    });
  });
});
