import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';

// Mock expo-notifications before importing the component
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
}));

import * as Notifications from 'expo-notifications';
import SettingsScreen from '../SettingsScreen';
import { useUserStore, UserProfile, ThemePreference } from '@store/userStore';
import { useAuthStore } from '@store/authStore';

// Mock dependencies
jest.mock('@store/userStore');
jest.mock('@store/authStore');

// Mock authApi for change password
const mockChangePassword = jest.fn();
jest.mock('@services/api/authApi', () => ({
  authApi: {
    changePassword: (currentPassword: string, newPassword: string) => mockChangePassword(currentPassword, newPassword),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock Linking
jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock components - modals and dialogs
jest.mock('../components', () => ({
  UnitsModal: ({ visible, currentUnits, onDismiss, onSave, isSaving }: any) => {
    const RN = require('react-native');
    return visible ? (
      <RN.View testID="units-modal">
        <RN.Text testID="units-modal-current">{currentUnits}</RN.Text>
        <RN.TouchableOpacity testID="units-modal-save-metric" onPress={() => onSave('metric')}>
          <RN.Text>Save Metric</RN.Text>
        </RN.TouchableOpacity>
        <RN.TouchableOpacity testID="units-modal-save-imperial" onPress={() => onSave('imperial')}>
          <RN.Text>Save Imperial</RN.Text>
        </RN.TouchableOpacity>
        <RN.TouchableOpacity testID="units-modal-dismiss" onPress={onDismiss}>
          <RN.Text>Dismiss</RN.Text>
        </RN.TouchableOpacity>
        {isSaving && <RN.View testID="units-modal-saving" />}
      </RN.View>
    ) : null;
  },
  DailyGoalModal: ({ visible, currentGoal, onDismiss, onSave, isSaving }: any) => {
    const RN = require('react-native');
    return visible ? (
      <RN.View testID="daily-goal-modal">
        <RN.Text testID="daily-goal-modal-current">{currentGoal}</RN.Text>
        <RN.TouchableOpacity testID="daily-goal-modal-save" onPress={() => onSave(15000)}>
          <RN.Text>Save 15000</RN.Text>
        </RN.TouchableOpacity>
        <RN.TouchableOpacity testID="daily-goal-modal-dismiss" onPress={onDismiss}>
          <RN.Text>Dismiss</RN.Text>
        </RN.TouchableOpacity>
        {isSaving && <RN.View testID="daily-goal-modal-saving" />}
      </RN.View>
    ) : null;
  },
  ThemeModal: ({ visible, currentTheme, onDismiss, onSave }: any) => {
    const RN = require('react-native');
    return visible ? (
      <RN.View testID="theme-modal">
        <RN.Text testID="theme-modal-current">{currentTheme}</RN.Text>
        <RN.TouchableOpacity testID="theme-modal-save-light" onPress={() => onSave('light')}>
          <RN.Text>Save Light</RN.Text>
        </RN.TouchableOpacity>
        <RN.TouchableOpacity testID="theme-modal-save-dark" onPress={() => onSave('dark')}>
          <RN.Text>Save Dark</RN.Text>
        </RN.TouchableOpacity>
        <RN.TouchableOpacity testID="theme-modal-save-system" onPress={() => onSave('system')}>
          <RN.Text>Save System</RN.Text>
        </RN.TouchableOpacity>
        <RN.TouchableOpacity testID="theme-modal-dismiss" onPress={onDismiss}>
          <RN.Text>Dismiss</RN.Text>
        </RN.TouchableOpacity>
      </RN.View>
    ) : null;
  },
  PrivacyModal: ({ visible, settingType, currentValue, onDismiss, onSave, isSaving }: any) => {
    const RN = require('react-native');
    return visible ? (
      <RN.View testID="privacy-modal">
        <RN.Text testID="privacy-modal-type">{settingType}</RN.Text>
        <RN.Text testID="privacy-modal-current">{currentValue}</RN.Text>
        <RN.TouchableOpacity testID="privacy-modal-save-public" onPress={() => onSave('public')}>
          <RN.Text>Save Public</RN.Text>
        </RN.TouchableOpacity>
        <RN.TouchableOpacity testID="privacy-modal-save-private" onPress={() => onSave('private')}>
          <RN.Text>Save Private</RN.Text>
        </RN.TouchableOpacity>
        <RN.TouchableOpacity testID="privacy-modal-dismiss" onPress={onDismiss}>
          <RN.Text>Dismiss</RN.Text>
        </RN.TouchableOpacity>
        {isSaving && <RN.View testID="privacy-modal-saving" />}
      </RN.View>
    ) : null;
  },
  SignOutDialog: ({ visible, onDismiss, onConfirm, isLoading }: any) => {
    const RN = require('react-native');
    return visible ? (
      <RN.View testID="sign-out-dialog">
        <RN.TouchableOpacity testID="sign-out-confirm" onPress={onConfirm}>
          <RN.Text>Confirm Sign Out</RN.Text>
        </RN.TouchableOpacity>
        <RN.TouchableOpacity testID="sign-out-cancel" onPress={onDismiss}>
          <RN.Text>Cancel</RN.Text>
        </RN.TouchableOpacity>
        {isLoading && <RN.View testID="sign-out-loading" />}
      </RN.View>
    ) : null;
  },
  ChangePasswordModal: ({ visible, onDismiss, onSave, isSaving }: any) => {
    const RN = require('react-native');
    return visible ? (
      <RN.View testID="change-password-modal">
        <RN.TouchableOpacity testID="change-password-save" onPress={() => onSave('currentPassword123', 'newPassword123')}>
          <RN.Text>Save Password</RN.Text>
        </RN.TouchableOpacity>
        <RN.TouchableOpacity testID="change-password-cancel" onPress={onDismiss}>
          <RN.Text>Cancel</RN.Text>
        </RN.TouchableOpacity>
        {isSaving && <RN.View testID="change-password-saving" />}
      </RN.View>
    ) : null;
  },
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  const RN = require('react-native');

  const List = {
    Item: ({ title, description, onPress, testID, accessibilityLabel, titleStyle }: any) => (
      <RN.TouchableOpacity
        testID={testID}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
      >
        <RN.Text testID={`${testID}-title`} style={titleStyle}>{title}</RN.Text>
        {description && <RN.Text testID={`${testID}-description`}>{description}</RN.Text>}
      </RN.TouchableOpacity>
    ),
    Icon: () => null,
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

  const Appbar = {
    Header: ({ children }: any) => <RN.View testID="appbar-header">{children}</RN.View>,
    Content: ({ title }: any) => <RN.Text testID="appbar-title">{title}</RN.Text>,
    Action: ({ icon, onPress, accessibilityLabel }: any) => (
      <RN.TouchableOpacity testID={`appbar-action-${icon}`} onPress={onPress} accessibilityLabel={accessibilityLabel} />
    ),
  };

  return {
    Appbar,
    Text: ({ children, variant, style }: any) => (
      <RN.Text style={style} testID={`text-${variant}`}>
        {children}
      </RN.Text>
    ),
    List,
    Divider: () => <RN.View testID="divider" />,
    Switch: MockSwitch,
    Snackbar: ({ visible, children, onDismiss, testID }: any) =>
      visible ? (
        <RN.View testID={testID}>
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
        error: '#FF0000',
      },
    }),
  };
});

const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;

describe('SettingsScreen', () => {
  const mockUpdatePreferences = jest.fn();
  const mockSetThemePreference = jest.fn();
  const mockClearUser = jest.fn();
  const mockSignOut = jest.fn();

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
      notify_friend_requests: true,
      notify_friend_accepted: true,
      notify_friend_milestones: true,
      notify_group_invites: true,
      notify_leaderboard_updates: false,
      notify_competition_reminders: true,
      notify_goal_achieved: true,
      notify_streak_reminders: true,
      notify_weekly_summary: true,
      privacy_profile_visibility: 'public',
      privacy_find_me: 'public',
      privacy_show_steps: 'partial',
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-15T10:00:00Z',
    },
  };

  const defaultUserState = {
    currentUser: mockUser,
    themePreference: 'system' as ThemePreference,
    updatePreferences: mockUpdatePreferences,
    setThemePreference: mockSetThemePreference,
    clearUser: mockClearUser,
  };

  const defaultAuthState = {
    signOut: mockSignOut,
    user: {
      id: 'user-123',
      email: 'john@example.com',
      displayName: 'John Doe',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUpdatePreferences.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
    mockChangePassword.mockResolvedValue(undefined);

    mockUseUserStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultUserState);
      }
      return defaultUserState;
    });

    mockUseAuthStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultAuthState);
      }
      return defaultAuthState;
    });

    mockNotifications.getPermissionsAsync.mockResolvedValue({
      status: Notifications.PermissionStatus.GRANTED,
      granted: true,
      expires: 'never',
      canAskAgain: true,
    });

    mockNotifications.requestPermissionsAsync.mockResolvedValue({
      status: Notifications.PermissionStatus.GRANTED,
      granted: true,
      expires: 'never',
      canAskAgain: true,
    });
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-profile')).toBeTruthy();
    });

    it('should display Account section', () => {
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Account')).toBeTruthy();
    });

    it('should display Preferences section', () => {
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Preferences')).toBeTruthy();
    });

    it('should display Notifications section', () => {
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Notifications')).toBeTruthy();
    });

    it('should display Privacy section', () => {
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Privacy')).toBeTruthy();
    });

    it('should display About section', () => {
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('About')).toBeTruthy();
    });
  });

  describe('profile navigation', () => {
    it('should display profile item with user display name', () => {
      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-profile-description')).toHaveTextContent('John Doe');
    });

    it('should navigate to Profile when profile item is pressed', () => {
      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-profile'));
      expect(mockNavigate).toHaveBeenCalledWith('Profile');
    });
  });

  describe('units modal', () => {
    it('should display current units setting', () => {
      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-units-description')).toHaveTextContent('Metric (km)');
    });

    it('should open units modal when pressed', () => {
      const { getByTestId, queryByTestId } = render(<SettingsScreen />);
      expect(queryByTestId('units-modal')).toBeNull();
      fireEvent.press(getByTestId('settings-units'));
      expect(getByTestId('units-modal')).toBeTruthy();
    });

    it('should save units preference and show snackbar', async () => {
      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-units'));
      fireEvent.press(getByTestId('units-modal-save-imperial'));

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({ units: 'imperial' });
      });

      await waitFor(() => {
        expect(getByTestId('snackbar-message')).toHaveTextContent('Units preference saved');
      });
    });

    it('should show error alert when save fails', async () => {
      mockUpdatePreferences.mockRejectedValue(new Error('Save failed'));

      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-units'));
      fireEvent.press(getByTestId('units-modal-save-imperial'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Save failed');
      });
    });

    it('should dismiss units modal when dismiss is pressed', () => {
      const { getByTestId, queryByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-units'));
      expect(getByTestId('units-modal')).toBeTruthy();
      fireEvent.press(getByTestId('units-modal-dismiss'));
      expect(queryByTestId('units-modal')).toBeNull();
    });
  });

  describe('daily goal modal', () => {
    it('should display current daily goal', () => {
      const { getByTestId } = render(<SettingsScreen />);
      // Match any locale format for 10000 (e.g., 10,000 or 10.000)
      expect(getByTestId('settings-daily-goal-description')).toHaveTextContent(/10[,.]000 steps/);
    });

    it('should open daily goal modal when pressed', () => {
      const { getByTestId, queryByTestId } = render(<SettingsScreen />);
      expect(queryByTestId('daily-goal-modal')).toBeNull();
      fireEvent.press(getByTestId('settings-daily-goal'));
      expect(getByTestId('daily-goal-modal')).toBeTruthy();
    });

    it('should save daily goal preference and show snackbar', async () => {
      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-daily-goal'));
      fireEvent.press(getByTestId('daily-goal-modal-save'));

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({ daily_step_goal: 15000 });
      });

      await waitFor(() => {
        expect(getByTestId('snackbar-message')).toHaveTextContent('Daily step goal saved');
      });
    });

    it('should dismiss daily goal modal when dismiss is pressed', () => {
      const { getByTestId, queryByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-daily-goal'));
      expect(getByTestId('daily-goal-modal')).toBeTruthy();
      fireEvent.press(getByTestId('daily-goal-modal-dismiss'));
      expect(queryByTestId('daily-goal-modal')).toBeNull();
    });
  });

  describe('theme modal', () => {
    it('should display current theme setting', () => {
      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-theme-description')).toHaveTextContent('System Default');
    });

    it('should open theme modal when pressed', () => {
      const { getByTestId, queryByTestId } = render(<SettingsScreen />);
      expect(queryByTestId('theme-modal')).toBeNull();
      fireEvent.press(getByTestId('settings-theme'));
      expect(getByTestId('theme-modal')).toBeTruthy();
    });

    it('should save theme preference and show snackbar', async () => {
      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-theme'));
      fireEvent.press(getByTestId('theme-modal-save-dark'));

      await waitFor(() => {
        expect(mockSetThemePreference).toHaveBeenCalledWith('dark');
      });

      await waitFor(() => {
        expect(getByTestId('snackbar-message')).toHaveTextContent('Theme preference saved');
      });
    });

    it('should display Light when theme is light', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = { ...defaultUserState, themePreference: 'light' as ThemePreference };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-theme-description')).toHaveTextContent('Light');
    });

    it('should display Dark when theme is dark', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = { ...defaultUserState, themePreference: 'dark' as ThemePreference };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-theme-description')).toHaveTextContent('Dark');
    });
  });

  describe('push notifications toggle', () => {
    it('should display push notifications switch with correct initial value', () => {
      const { getByTestId } = render(<SettingsScreen />);
      const switchElement = getByTestId('settings-notifications-switch');
      expect(switchElement.props.value).toBe(true);
    });

    it('should disable notifications when toggle is pressed while enabled', async () => {
      const { getByTestId } = render(<SettingsScreen />);
      const switchElement = getByTestId('settings-notifications-switch');
      fireEvent(switchElement, 'valueChange', false);

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({ notifications_enabled: false });
      });
    });

    it('should request permission when enabling notifications', async () => {
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

      const { getByTestId } = render(<SettingsScreen />);
      const switchElement = getByTestId('settings-notifications-switch');
      fireEvent(switchElement, 'valueChange', true);

      await waitFor(() => {
        expect(mockNotifications.getPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('should show alert when permission is denied', async () => {
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

      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: Notifications.PermissionStatus.DENIED,
        granted: false,
        expires: 'never',
        canAskAgain: true,
      });

      mockNotifications.requestPermissionsAsync.mockResolvedValue({
        status: Notifications.PermissionStatus.DENIED,
        granted: false,
        expires: 'never',
        canAskAgain: true,
      });

      const { getByTestId } = render(<SettingsScreen />);
      const switchElement = getByTestId('settings-notifications-switch');
      fireEvent(switchElement, 'valueChange', true);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Permission Required',
          expect.any(String),
          expect.any(Array)
        );
      });
    });
  });

  describe('notification settings navigation', () => {
    it('should navigate to NotificationSettings when pressed', () => {
      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-notification-settings'));
      expect(mockNavigate).toHaveBeenCalledWith('NotificationSettings');
    });
  });

  describe('privacy modals', () => {
    it('should display activity visibility setting', () => {
      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-activity-visibility-description')).toHaveTextContent('Friends Only');
    });

    it('should display find me setting', () => {
      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-find-me-description')).toHaveTextContent('Everyone');
    });

    it('should open privacy modal for activity visibility', () => {
      const { getByTestId, queryByTestId } = render(<SettingsScreen />);
      expect(queryByTestId('privacy-modal')).toBeNull();
      fireEvent.press(getByTestId('settings-activity-visibility'));
      expect(getByTestId('privacy-modal')).toBeTruthy();
      expect(getByTestId('privacy-modal-type')).toHaveTextContent('activity_visibility');
    });

    it('should open privacy modal for find me', () => {
      const { getByTestId, queryByTestId } = render(<SettingsScreen />);
      expect(queryByTestId('privacy-modal')).toBeNull();
      fireEvent.press(getByTestId('settings-find-me'));
      expect(getByTestId('privacy-modal')).toBeTruthy();
      expect(getByTestId('privacy-modal-type')).toHaveTextContent('find_me');
    });

    it('should save activity visibility and show snackbar', async () => {
      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-activity-visibility'));
      fireEvent.press(getByTestId('privacy-modal-save-private'));

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({ privacy_show_steps: 'private' });
      });

      await waitFor(() => {
        expect(getByTestId('snackbar-message')).toHaveTextContent('Privacy setting saved');
      });
    });

    it('should save find me preference and show snackbar', async () => {
      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-find-me'));
      fireEvent.press(getByTestId('privacy-modal-save-private'));

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({ privacy_find_me: 'private' });
      });
    });
  });

  describe('external links', () => {
    it('should display Terms of Service item', () => {
      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-terms')).toBeTruthy();
    });

    it('should display Privacy Policy item', () => {
      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-privacy-policy')).toBeTruthy();
    });

    it('should open Terms of Service URL when pressed', () => {
      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-terms'));
      expect(Linking.openURL).toHaveBeenCalledWith('https://stepper.com/terms');
    });

    it('should open Privacy Policy URL when pressed', () => {
      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-privacy-policy'));
      expect(Linking.openURL).toHaveBeenCalledWith('https://stepper.com/privacy');
    });

    it('should show error alert when Terms URL fails to open', async () => {
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('Failed to open'));

      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-terms'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Unable to open Terms of Service');
      });
    });

    it('should show error alert when Privacy URL fails to open', async () => {
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('Failed to open'));

      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-privacy-policy'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Unable to open Privacy Policy');
      });
    });
  });

  describe('app version', () => {
    it('should display app version', () => {
      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-app-version-description')).toHaveTextContent('1.0.0');
    });
  });

  describe('sign out', () => {
    it('should display sign out item', () => {
      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-sign-out')).toBeTruthy();
    });

    it('should show sign out dialog when sign out is pressed', () => {
      const { getByTestId, queryByTestId } = render(<SettingsScreen />);
      expect(queryByTestId('sign-out-dialog')).toBeNull();
      fireEvent.press(getByTestId('settings-sign-out'));
      expect(getByTestId('sign-out-dialog')).toBeTruthy();
    });

    it('should dismiss dialog when cancel is pressed', () => {
      const { getByTestId, queryByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-sign-out'));
      expect(getByTestId('sign-out-dialog')).toBeTruthy();
      fireEvent.press(getByTestId('sign-out-cancel'));
      expect(queryByTestId('sign-out-dialog')).toBeNull();
    });

    it('should sign out when confirm is pressed', async () => {
      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-sign-out'));
      fireEvent.press(getByTestId('sign-out-confirm'));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockClearUser).toHaveBeenCalled();
      });
    });

    it('should show error alert when sign out fails', async () => {
      mockSignOut.mockRejectedValue(new Error('Sign out failed'));

      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-sign-out'));
      fireEvent.press(getByTestId('sign-out-confirm'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Sign out failed');
      });
    });
  });

  describe('imperial units display', () => {
    it('should display Imperial (miles) when units is imperial', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          currentUser: {
            ...mockUser,
            preferences: { ...mockUser.preferences, units: 'imperial' as const },
          },
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-units-description')).toHaveTextContent('Imperial (miles)');
    });
  });

  describe('privacy label mapping', () => {
    it('should display Nobody for private privacy setting', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          currentUser: {
            ...mockUser,
            preferences: { ...mockUser.preferences, privacy_show_steps: 'private' as const },
          },
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-activity-visibility-description')).toHaveTextContent('Nobody');
    });
  });

  describe('email display', () => {
    it('should display email item', () => {
      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-email')).toBeTruthy();
    });

    it('should display user email from auth store', () => {
      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-email-description')).toHaveTextContent('john@example.com');
    });

    it('should display Loading when user not available', () => {
      mockUseAuthStore.mockImplementation((selector?: any) => {
        const state = { signOut: mockSignOut, user: null };
        return selector ? selector(state) : state;
      });
      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-email-description')).toHaveTextContent('Loading...');
    });
  });

  describe('change password', () => {
    it('should display change password item', () => {
      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-change-password')).toBeTruthy();
    });

    it('should open change password modal when pressed', () => {
      const { getByTestId, queryByTestId } = render(<SettingsScreen />);
      expect(queryByTestId('change-password-modal')).toBeNull();
      fireEvent.press(getByTestId('settings-change-password'));
      expect(getByTestId('change-password-modal')).toBeTruthy();
    });

    it('should change password and show snackbar on success', async () => {
      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-change-password'));
      fireEvent.press(getByTestId('change-password-save'));

      await waitFor(() => {
        expect(mockChangePassword).toHaveBeenCalledWith('currentPassword123', 'newPassword123');
      });

      await waitFor(() => {
        expect(getByTestId('snackbar-message')).toHaveTextContent('Password changed successfully');
      });
    });

    it('should show error alert when password change fails', async () => {
      mockChangePassword.mockRejectedValue(new Error('Password change failed'));

      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-change-password'));
      fireEvent.press(getByTestId('change-password-save'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Password change failed');
      });
    });

    it('should dismiss change password modal when cancel is pressed', () => {
      const { getByTestId, queryByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-change-password'));
      expect(getByTestId('change-password-modal')).toBeTruthy();
      fireEvent.press(getByTestId('change-password-cancel'));
      expect(queryByTestId('change-password-modal')).toBeNull();
    });
  });

  describe('profile visibility', () => {
    it('should display profile visibility item', () => {
      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-profile-visibility')).toBeTruthy();
    });

    it('should display current profile visibility setting', () => {
      const { getByTestId } = render(<SettingsScreen />);
      expect(getByTestId('settings-profile-visibility-description')).toHaveTextContent('Everyone');
    });

    it('should open privacy modal for profile visibility', () => {
      const { getByTestId, queryByTestId } = render(<SettingsScreen />);
      expect(queryByTestId('privacy-modal')).toBeNull();
      fireEvent.press(getByTestId('settings-profile-visibility'));
      expect(getByTestId('privacy-modal')).toBeTruthy();
      expect(getByTestId('privacy-modal-type')).toHaveTextContent('profile_visibility');
    });

    it('should save profile visibility preference', async () => {
      const { getByTestId } = render(<SettingsScreen />);
      fireEvent.press(getByTestId('settings-profile-visibility'));
      fireEvent.press(getByTestId('privacy-modal-save-private'));

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({ privacy_profile_visibility: 'private' });
      });
    });
  });
});
