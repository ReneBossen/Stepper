import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import EditProfileScreen from '../EditProfileScreen';
import { useUserStore, UserProfile } from '@store/userStore';
import * as ImagePicker from 'expo-image-picker';

// Mock dependencies
jest.mock('@store/userStore');
jest.mock('expo-image-picker');

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  const Appbar = {
    Header: ({ children, elevated }: any) => (
      <RN.View testID="appbar-header">{children}</RN.View>
    ),
    Content: ({ title }: any) => (
      <RN.Text testID="appbar-title">{title}</RN.Text>
    ),
    Action: ({ icon, onPress, accessibilityLabel, disabled }: any) => (
      <RN.TouchableOpacity
        testID={`appbar-action-${icon}`}
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
      >
        <RN.Text>{icon}</RN.Text>
      </RN.TouchableOpacity>
    ),
  };

  const Avatar = {
    Image: ({ size, source, style }: any) => (
      <RN.View testID="avatar-image" style={style}>
        <RN.Text>{source?.uri}</RN.Text>
      </RN.View>
    ),
    Text: ({ size, label, style, labelStyle }: any) => (
      <RN.View testID="avatar-text" style={style}>
        <RN.Text style={labelStyle}>{label}</RN.Text>
      </RN.View>
    ),
  };

  const TextInput = ({ label, value, onChangeText, error, maxLength, testID, accessibilityLabel }: any) => (
    <RN.View testID={testID}>
      <RN.Text>{label}</RN.Text>
      <RN.TextInput
        testID={`${testID}-input`}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        accessibilityLabel={accessibilityLabel}
      />
      {error && <RN.View testID={`${testID}-error`} />}
    </RN.View>
  );
  TextInput.Affix = ({ text }: any) => (
    <RN.Text testID="input-affix">{text}</RN.Text>
  );

  const List = {
    Item: ({ title, description, onPress, testID, accessibilityLabel }: any) => (
      <RN.TouchableOpacity
        testID={testID}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
      >
        <RN.Text testID={`${testID}-title`}>{title}</RN.Text>
        <RN.Text testID={`${testID}-description`}>{description}</RN.Text>
      </RN.TouchableOpacity>
    ),
    Icon: () => null,
  };

  const Menu = ({ visible, onDismiss, anchor, children }: any) => (
    <RN.View testID="menu">
      {anchor}
      {visible && <RN.View testID="menu-content">{children}</RN.View>}
    </RN.View>
  );
  Menu.Item = ({ onPress, title, leadingIcon }: any) => (
    <RN.TouchableOpacity
      testID={`menu-item-${title.toLowerCase().replace(/\s/g, '-')}`}
      onPress={onPress}
    >
      <RN.Text>{title}</RN.Text>
    </RN.TouchableOpacity>
  );

  return {
    Appbar,
    Avatar,
    TextInput,
    List,
    Menu,
    Text: ({ children, variant, style }: any) => (
      <RN.Text style={style} testID={`text-${variant}`}>
        {children}
      </RN.Text>
    ),
    Button: ({ children, mode, onPress, loading, disabled, testID, accessibilityLabel }: any) => (
      <RN.TouchableOpacity
        testID={testID || 'button'}
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityLabel={accessibilityLabel}
      >
        <RN.Text>{children}</RN.Text>
        {loading && <RN.View testID="button-loading" />}
      </RN.TouchableOpacity>
    ),
    HelperText: ({ children, type, visible }: any) =>
      visible ? (
        <RN.Text testID={`helper-text-${type}`}>{children}</RN.Text>
      ) : null,
    Divider: () => <RN.View testID="divider" />,
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        primaryContainer: '#E8F5E9',
        onPrimaryContainer: '#1B5E20',
      },
    }),
  };
});

const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;
const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;

describe('EditProfileScreen', () => {
  const mockUpdateProfile = jest.fn();
  const mockUpdatePreferences = jest.fn();
  const mockUploadAvatar = jest.fn();

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
    isLoading: false,
    updateProfile: mockUpdateProfile,
    updatePreferences: mockUpdatePreferences,
    uploadAvatar: mockUploadAvatar,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUpdateProfile.mockResolvedValue(mockUser);
    mockUpdatePreferences.mockResolvedValue(undefined);
    mockUploadAvatar.mockResolvedValue('https://example.com/new-avatar.jpg');

    mockUseUserStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultUserState);
      }
      return defaultUserState;
    });

    mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      status: ImagePicker.PermissionStatus.GRANTED,
      granted: true,
      expires: 'never',
      canAskAgain: true,
    });

    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://new-avatar.jpg', width: 200, height: 200 }],
    } as any);
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<EditProfileScreen />);
      expect(getByTestId('appbar-header')).toBeTruthy();
    });

    it('should display the title', () => {
      const { getByTestId } = render(<EditProfileScreen />);
      expect(getByTestId('appbar-title')).toHaveTextContent('Edit Profile');
    });

    it('should render close action button', () => {
      const { getByTestId } = render(<EditProfileScreen />);
      expect(getByTestId('appbar-action-close')).toBeTruthy();
    });

    it('should render save action button', () => {
      const { getByTestId } = render(<EditProfileScreen />);
      expect(getByTestId('appbar-action-check')).toBeTruthy();
    });

    it('should render nothing if no current user', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = { ...defaultUserState, currentUser: null };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = render(<EditProfileScreen />);
      expect(queryByTestId('appbar-header')).toBeNull();
    });
  });

  describe('form fields', () => {
    it('should display display name field with current value', () => {
      const { getByTestId } = render(<EditProfileScreen />);
      expect(getByTestId('input-display-name')).toBeTruthy();
      expect(getByTestId('input-display-name-input').props.value).toBe('John Doe');
    });
  });

  describe('validation', () => {
    it('should show error when display name is empty', async () => {
      const { getByTestId } = render(<EditProfileScreen />);

      fireEvent.changeText(getByTestId('input-display-name-input'), '');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(getByTestId('helper-text-error')).toHaveTextContent(
          'Display name is required'
        );
      });
    });

    it('should show error when display name exceeds max length', async () => {
      const { getByTestId } = render(<EditProfileScreen />);

      const longName = 'a'.repeat(51);
      fireEvent.changeText(getByTestId('input-display-name-input'), longName);
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(getByTestId('helper-text-error')).toHaveTextContent(
          'Display name must be at most 50 characters'
        );
      });
    });
  });

  describe('avatar change', () => {
    it('should display avatar image when avatar_url exists', () => {
      const { getByTestId } = render(<EditProfileScreen />);
      expect(getByTestId('avatar-image')).toBeTruthy();
    });

    it('should display avatar text when avatar_url does not exist', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultUserState,
          currentUser: { ...mockUser, avatar_url: undefined },
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<EditProfileScreen />);
      expect(getByTestId('avatar-text')).toBeTruthy();
    });

    it('should display Change Photo button', () => {
      const { getByText } = render(<EditProfileScreen />);
      expect(getByText('Change Photo')).toBeTruthy();
    });

    it('should request permission when changing photo', async () => {
      const { getByText } = render(<EditProfileScreen />);

      fireEvent.press(getByText('Change Photo'));

      await waitFor(() => {
        expect(
          mockImagePicker.requestMediaLibraryPermissionsAsync
        ).toHaveBeenCalled();
      });
    });

    it('should show alert when permission is denied', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: ImagePicker.PermissionStatus.DENIED,
        granted: false,
        expires: 'never',
        canAskAgain: true,
      });

      const { getByText } = render(<EditProfileScreen />);

      fireEvent.press(getByText('Change Photo'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Permission Required',
          expect.any(String),
          expect.any(Array)
        );
      });
    });

    it('should launch image picker when permission is granted', async () => {
      const { getByText } = render(<EditProfileScreen />);

      fireEvent.press(getByText('Change Photo'));

      await waitFor(() => {
        expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        );
      });
    });
  });

  describe('privacy settings', () => {
    it('should display profile visibility setting', () => {
      const { getByTestId } = render(<EditProfileScreen />);
      expect(getByTestId('privacy-profile')).toBeTruthy();
      expect(getByTestId('privacy-profile-title')).toHaveTextContent(
        'Profile Visibility'
      );
      expect(getByTestId('privacy-profile-description')).toHaveTextContent(
        'Public'
      );
    });

    it('should display activity visibility setting', () => {
      const { getByTestId } = render(<EditProfileScreen />);
      expect(getByTestId('privacy-activity')).toBeTruthy();
      expect(getByTestId('privacy-activity-title')).toHaveTextContent(
        'Activity Visibility'
      );
      expect(getByTestId('privacy-activity-description')).toHaveTextContent(
        'Friends Only'
      );
    });
  });

  describe('save functionality', () => {
    it('should call updateProfile when save is pressed', async () => {
      const { getByTestId } = render(<EditProfileScreen />);

      fireEvent.changeText(getByTestId('input-display-name-input'), 'Jane Doe');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            display_name: 'Jane Doe',
          })
        );
      });
    });

    it('should call updatePreferences when privacy settings change', async () => {
      const { getByTestId } = render(<EditProfileScreen />);

      // Open profile visibility menu
      fireEvent.press(getByTestId('privacy-profile'));

      // Select Private option
      await waitFor(() => {
        fireEvent.press(getByTestId('menu-item-private'));
      });

      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith(
          expect.objectContaining({
            privacy_find_me: 'private',
          })
        );
      });
    });

    it('should navigate back after successful save', async () => {
      const { getByTestId } = render(<EditProfileScreen />);

      fireEvent.changeText(getByTestId('input-display-name-input'), 'Jane Doe');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    it('should show error alert on save failure', async () => {
      mockUpdateProfile.mockRejectedValue(new Error('Update failed'));

      const { getByTestId } = render(<EditProfileScreen />);

      fireEvent.changeText(getByTestId('input-display-name-input'), 'Jane Doe');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Update failed');
      });
    });
  });

  describe('cancel functionality', () => {
    it('should navigate back when cancel is pressed without changes', () => {
      const { getByTestId } = render(<EditProfileScreen />);

      fireEvent.press(getByTestId('appbar-action-close'));

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('should show confirmation when cancel is pressed with changes', () => {
      const { getByTestId } = render(<EditProfileScreen />);

      fireEvent.changeText(getByTestId('input-display-name-input'), 'Jane Doe');
      fireEvent.press(getByTestId('appbar-action-close'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Discard Changes?',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Keep Editing' }),
          expect.objectContaining({ text: 'Discard' }),
        ])
      );
    });
  });

  describe('change detection', () => {
    it('should disable save button when no changes', () => {
      const { getByTestId } = render(<EditProfileScreen />);

      const saveButton = getByTestId('appbar-action-check');
      expect(saveButton.props.disabled).toBe(true);
    });

    it('should enable save button when display name changes', () => {
      const { getByTestId } = render(<EditProfileScreen />);

      fireEvent.changeText(getByTestId('input-display-name-input'), 'Jane Doe');

      const saveButton = getByTestId('appbar-action-check');
      expect(saveButton.props.disabled).toBe(false);
    });
  });
});
