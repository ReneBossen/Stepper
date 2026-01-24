import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import NotificationSettingsScreen from '../NotificationSettingsScreen';
import { useUserStore, UserProfile } from '@store/userStore';

// Mock dependencies
jest.mock('@store/userStore');

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  const RN = require('react-native');

  const Appbar = {
    Header: ({ children, elevated }: any) => (
      <RN.View testID="appbar-header">{children}</RN.View>
    ),
    Content: ({ title }: any) => (
      <RN.Text testID="appbar-title">{title}</RN.Text>
    ),
    BackAction: ({ onPress, accessibilityLabel }: any) => (
      <RN.TouchableOpacity
        testID="appbar-back"
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
      >
        <RN.Text>Back</RN.Text>
      </RN.TouchableOpacity>
    ),
  };

  // Create a proper React component for Switch
  const MockSwitch = (props: any) => {
    const { value, onValueChange, disabled, testID, accessibilityLabel } = props;
    return React.createElement(
      RN.View,
      {
        testID,
        accessibilityLabel,
        value,
        disabled,
      },
      React.createElement(
        RN.TouchableOpacity,
        {
          onPress: () => !disabled && onValueChange && onValueChange(!value),
          testID: `${testID}-trigger`,
        },
        React.createElement(RN.Text, null, value ? 'on' : 'off')
      )
    );
  };

  return {
    Appbar,
    Text: ({ children, variant, style }: any) => (
      <RN.Text style={style} testID={`text-${variant}`}>
        {children}
      </RN.Text>
    ),
    Divider: () => <RN.View testID="divider" />,
    Switch: MockSwitch,
    Snackbar: ({ visible, children, onDismiss }: any) =>
      visible ? (
        <RN.View testID="snackbar">
          <RN.Text testID="snackbar-message">{children}</RN.Text>
        </RN.View>
      ) : null,
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        onSurfaceDisabled: '#999999',
        errorContainer: '#FFEBEE',
        onErrorContainer: '#B71C1C',
      },
    }),
  };
});

const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;

describe('NotificationSettingsScreen', () => {
  const mockUpdatePreferences = jest.fn();

  const mockUser: UserProfile = {
    id: 'user-123',
    display_name: 'John Doe',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: '2025-01-15T10:00:00Z',
    onboarding_completed: true,
    preferences: {
      id: 'user-123',
      units: 'metric',
      daily_step_goal: 10000,
      notifications_enabled: true,
      privacy_find_me: 'public',
      privacy_show_steps: 'partial',
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-15T10:00:00Z',
    },
  };

  const defaultUserState = {
    currentUser: mockUser,
    updatePreferences: mockUpdatePreferences,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUpdatePreferences.mockResolvedValue(undefined);

    mockUseUserStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultUserState);
      }
      return defaultUserState;
    });
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('appbar-header')).toBeTruthy();
    });

    it('should display the title', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('appbar-title')).toHaveTextContent('Notification Settings');
    });

    it('should render back button', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('appbar-back')).toBeTruthy();
    });

    it('should navigate back when back button is pressed', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      fireEvent.press(getByTestId('appbar-back'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('notification categories', () => {
    it('should display Friend Activity section', () => {
      const { getByText } = render(<NotificationSettingsScreen />);
      expect(getByText('Friend Activity')).toBeTruthy();
    });

    it('should display Groups section', () => {
      const { getByText } = render(<NotificationSettingsScreen />);
      expect(getByText('Groups')).toBeTruthy();
    });

    it('should display Personal section', () => {
      const { getByText } = render(<NotificationSettingsScreen />);
      expect(getByText('Personal')).toBeTruthy();
    });
  });

  describe('friend activity toggles', () => {
    it('should display Friend Requests toggle', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('notif-friend-requests')).toBeTruthy();
    });

    it('should display Friend Accepted toggle', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('notif-friend-accepted')).toBeTruthy();
    });

    it('should display Friend Milestones toggle', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('notif-friend-milestones')).toBeTruthy();
    });

    it('should toggle friend requests notification', async () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      const toggle = getByTestId('notif-friend-requests');
      fireEvent(toggle, 'valueChange', false);

      await waitFor(() => {
        expect(getByTestId('snackbar-message')).toHaveTextContent('Preference updated');
      });
    });
  });

  describe('groups toggles', () => {
    it('should display Group Invites toggle', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('notif-group-invites')).toBeTruthy();
    });

    it('should display Leaderboard Updates toggle', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('notif-leaderboard-updates')).toBeTruthy();
    });

    it('should display Competition Reminders toggle', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('notif-competition-reminders')).toBeTruthy();
    });
  });

  describe('personal toggles', () => {
    it('should display Daily Goal Achieved toggle', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('notif-goal-achieved')).toBeTruthy();
    });

    it('should display Streak Reminders toggle', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('notif-streak-reminders')).toBeTruthy();
    });

    it('should display Weekly Summary toggle', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('notif-weekly-summary')).toBeTruthy();
    });
  });

  describe('warning banner when push disabled', () => {
    it('should not show warning banner when notifications are enabled', () => {
      const { queryByText } = render(<NotificationSettingsScreen />);
      expect(
        queryByText('Push notifications are disabled. Enable them in Settings to configure these preferences.')
      ).toBeNull();
    });

    it('should show warning banner when notifications are disabled', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          currentUser: {
            ...mockUser,
            preferences: { ...mockUser.preferences, notifications_enabled: false },
          },
        };
        return selector ? selector(state) : state;
      });

      const { getByText } = render(<NotificationSettingsScreen />);
      expect(
        getByText('Push notifications are disabled. Enable them in Settings to configure these preferences.')
      ).toBeTruthy();
    });

    it('should disable all toggles when notifications are disabled', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          currentUser: {
            ...mockUser,
            preferences: { ...mockUser.preferences, notifications_enabled: false },
          },
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('notif-friend-requests').props.disabled).toBe(true);
      expect(getByTestId('notif-group-invites').props.disabled).toBe(true);
      expect(getByTestId('notif-goal-achieved').props.disabled).toBe(true);
    });

    it('should show alert when toggle is pressed while notifications disabled', async () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          currentUser: {
            ...mockUser,
            preferences: { ...mockUser.preferences, notifications_enabled: false },
          },
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<NotificationSettingsScreen />);
      const toggle = getByTestId('notif-friend-requests');

      // Note: Since the switch is disabled, onValueChange may not fire normally
      // but if the handler is called somehow, it should show the alert
      fireEvent(toggle, 'valueChange', true);

      // The toggle handler checks masterEnabled before proceeding
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Notifications Disabled',
          'Please enable push notifications in the main Settings to configure notification preferences.',
          [{ text: 'OK' }]
        );
      });
    });
  });

  describe('toggle default values', () => {
    it('should have Friend Requests enabled by default', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('notif-friend-requests').props.value).toBe(true);
    });

    it('should have Friend Accepted enabled by default', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('notif-friend-accepted').props.value).toBe(true);
    });

    it('should have Leaderboard Updates disabled by default', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('notif-leaderboard-updates').props.value).toBe(false);
    });

    it('should have Goal Achieved enabled by default', () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      expect(getByTestId('notif-goal-achieved').props.value).toBe(true);
    });
  });

  describe('toggle state changes', () => {
    it('should update state when toggle is pressed', async () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      const toggle = getByTestId('notif-leaderboard-updates');

      expect(toggle.props.value).toBe(false);
      fireEvent(toggle, 'valueChange', true);

      await waitFor(() => {
        expect(getByTestId('notif-leaderboard-updates').props.value).toBe(true);
      });
    });

    it('should show snackbar when preference is updated', async () => {
      const { getByTestId } = render(<NotificationSettingsScreen />);
      const toggle = getByTestId('notif-weekly-summary');

      fireEvent(toggle, 'valueChange', false);

      await waitFor(() => {
        expect(getByTestId('snackbar-message')).toHaveTextContent('Preference updated');
      });
    });
  });

  describe('info note', () => {
    it('should display info note at the bottom', () => {
      const { getByText } = render(<NotificationSettingsScreen />);
      expect(
        getByText('Note: These preferences control which notifications you receive when push notifications are enabled.')
      ).toBeTruthy();
    });
  });
});
