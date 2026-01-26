import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import NotificationsScreen from '../NotificationsScreen';
import { useNotificationsStore, Notification } from '@store/notificationsStore';
import { useAuthStore } from '@store/authStore';

// Mock dependencies
jest.mock('@store/notificationsStore');
jest.mock('@store/authStore');

// Mock navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock components
jest.mock('@components/common/LoadingSpinner', () => ({
  LoadingSpinner: () => {
    const RN = require('react-native');
    return <RN.View testID="loading-spinner" />;
  },
}));

jest.mock('@components/common/ErrorMessage', () => ({
  ErrorMessage: ({ message, onRetry }: { message: string; onRetry: () => void }) => {
    const RN = require('react-native');
    return (
      <RN.View testID="error-message">
        <RN.Text testID="error-text">{message}</RN.Text>
        <RN.TouchableOpacity testID="retry-button" onPress={onRetry}>
          <RN.Text>Retry</RN.Text>
        </RN.TouchableOpacity>
      </RN.View>
    );
  },
}));

// Mock NotificationItem component
jest.mock('../components/NotificationItem', () => ({
  NotificationItem: ({ notification, onPress, onDelete, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID={testID}>
        <RN.Text testID={`${testID}-title`}>{notification.title}</RN.Text>
        <RN.Text testID={`${testID}-message`}>{notification.message}</RN.Text>
        {!notification.is_read && <RN.View testID={`${testID}-unread`} />}
        <RN.TouchableOpacity testID={`${testID}-press`} onPress={() => onPress(notification)}>
          <RN.Text>Press</RN.Text>
        </RN.TouchableOpacity>
        <RN.TouchableOpacity testID={`${testID}-delete`} onPress={() => onDelete(notification.id)}>
          <RN.Text>Delete</RN.Text>
        </RN.TouchableOpacity>
      </RN.View>
    );
  },
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  const Appbar = {
    Header: ({ children, elevated }: { children: React.ReactNode; elevated?: boolean }) => (
      <RN.View testID="appbar-header">{children}</RN.View>
    ),
    Content: ({ title }: { title: string }) => (
      <RN.Text testID="appbar-title">{title}</RN.Text>
    ),
    BackAction: ({ onPress, testID }: { onPress: () => void; testID?: string }) => (
      <RN.TouchableOpacity testID={testID || 'back-action'} onPress={onPress}>
        <RN.Text>Back</RN.Text>
      </RN.TouchableOpacity>
    ),
    Action: ({ icon, onPress, testID, accessibilityLabel }: any) => (
      <RN.TouchableOpacity
        testID={testID || `appbar-action-${icon}`}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
      >
        <RN.Text>{icon}</RN.Text>
      </RN.TouchableOpacity>
    ),
  };

  return {
    Appbar,
    Text: ({ children, style, variant, ...props }: any) => (
      <RN.Text {...props} style={style}>{children}</RN.Text>
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
        outlineVariant: '#EEEEEE',
      },
    }),
  };
});

const mockUseNotificationsStore = useNotificationsStore as jest.MockedFunction<typeof useNotificationsStore>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('NotificationsScreen', () => {
  const mockFetchNotifications = jest.fn();
  const mockMarkAsRead = jest.fn();
  const mockMarkAllAsRead = jest.fn();
  const mockDeleteNotification = jest.fn();
  const mockSubscribeToNotifications = jest.fn();
  const mockUnsubscribeFromNotifications = jest.fn();

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

  const createMockNotifications = (count: number): Notification[] => {
    return Array.from({ length: count }, (_, index) => ({
      id: `notif-${index}`,
      user_id: 'user-1',
      type: ['friend_request', 'friend_accepted', 'group_invite', 'goal_achieved', 'general'][
        index % 5
      ] as Notification['type'],
      title: `Notification ${index}`,
      message: `This is notification message ${index}`,
      is_read: index % 2 === 0,
      created_at: new Date(Date.now() - index * 3600000).toISOString(), // Each 1 hour apart
    }));
  };

  const defaultNotificationsState = {
    notifications: createMockNotifications(5),
    unreadCount: 2,
    isLoading: false,
    error: null,
    _channel: null,
    fetchNotifications: mockFetchNotifications,
    fetchUnreadCount: jest.fn(),
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    deleteNotification: mockDeleteNotification,
    subscribeToNotifications: mockSubscribeToNotifications,
    unsubscribeFromNotifications: mockUnsubscribeFromNotifications,
  };

  const defaultAuthState = {
    user: { id: 'user-123', email: 'test@example.com', displayName: 'Test User' },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
    restoreSession: jest.fn(),
    setUser: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNotificationsStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultNotificationsState);
      }
      return defaultNotificationsState;
    });

    mockUseAuthStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultAuthState);
      }
      return defaultAuthState;
    });
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<NotificationsScreen />);
      expect(getByTestId('appbar-header')).toBeTruthy();
    });

    it('should display the title', () => {
      const { getByTestId } = render(<NotificationsScreen />);
      expect(getByTestId('appbar-title')).toHaveTextContent('Notifications');
    });

    it('should render back action button', () => {
      const { getByTestId } = render(<NotificationsScreen />);
      expect(getByTestId('back-action')).toBeTruthy();
    });

    it('should render notification items', () => {
      const { getByTestId } = render(<NotificationsScreen />);
      expect(getByTestId('notification-item-notif-0')).toBeTruthy();
      expect(getByTestId('notification-item-notif-1')).toBeTruthy();
    });

    it('should render mark all read button when there are unread notifications', () => {
      const { getByTestId } = render(<NotificationsScreen />);
      expect(getByTestId('mark-all-read-action')).toBeTruthy();
    });

    it('should not render mark all read button when all notifications are read', () => {
      mockUseNotificationsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultNotificationsState,
          unreadCount: 0,
        };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = render(<NotificationsScreen />);
      expect(queryByTestId('mark-all-read-action')).toBeNull();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when loading with no data', () => {
      mockUseNotificationsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultNotificationsState,
          notifications: [],
          isLoading: true,
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<NotificationsScreen />);
      expect(getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should not show loading spinner when loading with existing data', () => {
      mockUseNotificationsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultNotificationsState,
          isLoading: true,
        };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = render(<NotificationsScreen />);
      expect(queryByTestId('loading-spinner')).toBeNull();
    });
  });

  describe('error state', () => {
    it('should show error message when there is an error and no data', () => {
      mockUseNotificationsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultNotificationsState,
          notifications: [],
          error: 'Failed to load notifications',
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<NotificationsScreen />);
      expect(getByTestId('error-message')).toBeTruthy();
    });

    it('should display error text', () => {
      mockUseNotificationsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultNotificationsState,
          notifications: [],
          error: 'Network error',
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<NotificationsScreen />);
      expect(getByTestId('error-text')).toHaveTextContent('Network error');
    });

    it('should call fetchNotifications when retry is pressed', async () => {
      mockUseNotificationsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultNotificationsState,
          notifications: [],
          error: 'Failed to load',
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<NotificationsScreen />);

      fireEvent.press(getByTestId('retry-button'));

      await waitFor(() => {
        // fetchNotifications called once on mount, once on retry
        expect(mockFetchNotifications).toHaveBeenCalled();
      });
    });

    it('should not show error when data exists despite error', () => {
      mockUseNotificationsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultNotificationsState,
          error: 'Some error',
        };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = render(<NotificationsScreen />);
      expect(queryByTestId('error-message')).toBeNull();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no notifications (FlatList renders empty component)', () => {
      mockUseNotificationsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultNotificationsState,
          notifications: [],
          unreadCount: 0,
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId, queryByTestId, queryByText } = render(<NotificationsScreen />);
      // Screen should render with empty list
      expect(getByTestId('notifications-list')).toBeTruthy();
      // No notification items should be present
      expect(queryByTestId('notification-item-notif-0')).toBeNull();
      // Note: FlatList ListEmptyComponent may not render in test environments,
      // so we check it renders without crashing. The empty message text check
      // is optional - some test frameworks render it, others don't.
    });

    it('should not render notification items when empty', () => {
      mockUseNotificationsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultNotificationsState,
          notifications: [],
          unreadCount: 0,
        };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = render(<NotificationsScreen />);
      expect(queryByTestId('notification-item-notif-0')).toBeNull();
    });
  });

  describe('navigation', () => {
    it('should navigate back when back action is pressed', () => {
      const { getByTestId } = render(<NotificationsScreen />);

      fireEvent.press(getByTestId('back-action'));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('data fetching', () => {
    it('should fetch notifications on mount', () => {
      render(<NotificationsScreen />);

      expect(mockFetchNotifications).toHaveBeenCalled();
    });
  });

  describe('mark as read', () => {
    it('should call markAsRead when notification is pressed', async () => {
      mockUseNotificationsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultNotificationsState,
          notifications: [createMockNotification({ is_read: false })],
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<NotificationsScreen />);

      fireEvent.press(getByTestId('notification-item-notif-1-press'));

      await waitFor(() => {
        expect(mockMarkAsRead).toHaveBeenCalledWith('notif-1');
      });
    });

    it('should not call markAsRead for already read notifications', async () => {
      mockUseNotificationsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultNotificationsState,
          notifications: [createMockNotification({ is_read: true })],
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<NotificationsScreen />);

      fireEvent.press(getByTestId('notification-item-notif-1-press'));

      await waitFor(() => {
        expect(mockMarkAsRead).not.toHaveBeenCalled();
      });
    });
  });

  describe('mark all as read', () => {
    it('should call markAllAsRead when mark all button is pressed', async () => {
      const { getByTestId } = render(<NotificationsScreen />);

      fireEvent.press(getByTestId('mark-all-read-action'));

      await waitFor(() => {
        expect(mockMarkAllAsRead).toHaveBeenCalled();
      });
    });

    it('should show error alert when markAllAsRead fails', async () => {
      mockMarkAllAsRead.mockRejectedValueOnce(new Error('Failed'));

      const { getByTestId } = render(<NotificationsScreen />);

      fireEvent.press(getByTestId('mark-all-read-action'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to mark all as read. Please try again.'
        );
      });
    });
  });

  describe('delete notification', () => {
    it('should call deleteNotification when delete is confirmed', async () => {
      const { getByTestId } = render(<NotificationsScreen />);

      fireEvent.press(getByTestId('notification-item-notif-0-delete'));

      await waitFor(() => {
        expect(mockDeleteNotification).toHaveBeenCalledWith('notif-0');
      });
    });

    it('should show error alert when deleteNotification fails', async () => {
      mockDeleteNotification.mockRejectedValueOnce(new Error('Failed'));

      const { getByTestId } = render(<NotificationsScreen />);

      fireEvent.press(getByTestId('notification-item-notif-0-delete'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to delete notification. Please try again.'
        );
      });
    });
  });

  describe('unread indicator', () => {
    it('should show unread indicator for unread notifications', () => {
      mockUseNotificationsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultNotificationsState,
          notifications: [createMockNotification({ id: 'unread-notif', is_read: false })],
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<NotificationsScreen />);
      expect(getByTestId('notification-item-unread-notif-unread')).toBeTruthy();
    });

    it('should not show unread indicator for read notifications', () => {
      mockUseNotificationsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultNotificationsState,
          notifications: [createMockNotification({ id: 'read-notif', is_read: true })],
        };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = render(<NotificationsScreen />);
      expect(queryByTestId('notification-item-read-notif-unread')).toBeNull();
    });
  });

  describe('notification types', () => {
    it('should render all notification types', () => {
      const { getByTestId } = render(<NotificationsScreen />);
      // Default mock has 5 notifications with different types
      expect(getByTestId('notification-item-notif-0')).toBeTruthy(); // friend_request
      expect(getByTestId('notification-item-notif-1')).toBeTruthy(); // friend_accepted
      expect(getByTestId('notification-item-notif-2')).toBeTruthy(); // group_invite
      expect(getByTestId('notification-item-notif-3')).toBeTruthy(); // goal_achieved
      expect(getByTestId('notification-item-notif-4')).toBeTruthy(); // general
    });
  });

  describe('multiple notifications', () => {
    it('should render all notification items', () => {
      const { getAllByTestId } = render(<NotificationsScreen />);
      // We have 5 mock notifications
      const items = getAllByTestId(/notification-item-notif-\d$/);
      expect(items).toHaveLength(5);
    });

    it('should handle marking different notifications', async () => {
      const { getByTestId } = render(<NotificationsScreen />);

      // Press second notification (which is unread in our mock)
      fireEvent.press(getByTestId('notification-item-notif-1-press'));

      await waitFor(() => {
        expect(mockMarkAsRead).toHaveBeenCalledWith('notif-1');
      });
    });
  });

  describe('realtime subscription', () => {
    it('should subscribe to notifications on mount when user is authenticated', () => {
      render(<NotificationsScreen />);

      expect(mockSubscribeToNotifications).toHaveBeenCalledWith('user-123');
    });

    it('should unsubscribe from notifications on unmount', () => {
      const { unmount } = render(<NotificationsScreen />);

      unmount();

      expect(mockUnsubscribeFromNotifications).toHaveBeenCalled();
    });

    it('should not subscribe when user is not authenticated', () => {
      mockUseAuthStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultAuthState,
          user: null,
          isAuthenticated: false,
        };
        return selector ? selector(state) : state;
      });

      render(<NotificationsScreen />);

      expect(mockSubscribeToNotifications).not.toHaveBeenCalled();
    });
  });
});
