import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileSetupScreen from '../ProfileSetupScreen';
import { useUserStore } from '@store/userStore';

// Mock dependencies
jest.mock('@store/userStore');

jest.mock('react-native-paper', () => {
  const RN = jest.requireActual('react-native');
  return {
    Text: ({ children, ...props }: any) => <RN.Text {...props}>{children}</RN.Text>,
    TextInput: ({ value, onChangeText, label, testID, ...props }: any) => (
      <RN.View>
        <RN.Text>{label}</RN.Text>
        <RN.TextInput
          value={value}
          onChangeText={onChangeText}
          testID={testID || 'text-input'}
          {...props}
        />
      </RN.View>
    ),
    Button: ({ children, onPress, disabled, loading, testID, mode }: any) => (
      <RN.TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        testID={testID || `button-${mode}`}
      >
        <RN.Text>{loading ? 'Loading...' : children}</RN.Text>
      </RN.TouchableOpacity>
    ),
    HelperText: ({ children, type }: any) => (
      <RN.Text testID={`helper-text-${type}`}>{children}</RN.Text>
    ),
    useTheme: () => ({
      colors: {
        onBackground: '#000000',
      },
    }),
  };
});

jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  return {
    ...actualRN,
    KeyboardAvoidingView: ({ children }: any) => {
      const React = require('react');
      return React.createElement(actualRN.View, {}, children);
    },
    ScrollView: ({ children, ...props }: any) => {
      const React = require('react');
      return React.createElement(actualRN.View, props, children);
    },
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios),
    },
  };
});

jest.mock('../components/OnboardingLayout', () => {
  const RN = jest.requireActual('react-native');
  return ({ children }: any) => <RN.View testID="onboarding-layout">{children}</RN.View>;
});

jest.mock('../components/ProfilePhotoUploader', () => {
  const RN = jest.requireActual('react-native');
  return ({ onImageSelected, isUploading, avatarUrl }: any) => (
    <RN.View testID="profile-photo-uploader">
      <RN.Text>{isUploading ? 'Uploading...' : 'Upload Photo'}</RN.Text>
      {avatarUrl && <RN.Text>{avatarUrl}</RN.Text>}
      <RN.TouchableOpacity
        onPress={() => onImageSelected('file:///test/photo.jpg')}
        testID="upload-photo-button"
      >
        <RN.Text>Select Photo</RN.Text>
      </RN.TouchableOpacity>
    </RN.View>
  );
});

const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;

describe('ProfileSetupScreen', () => {
  const mockNavigate = jest.fn();
  const mockNavigation = {
    navigate: mockNavigate,
    goBack: jest.fn(),
    setOptions: jest.fn(),
  } as any;

  const mockRoute = {} as any;

  const mockUpdateProfile = jest.fn();
  const mockUploadAvatar = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserStore.mockReturnValue({
      updateProfile: mockUpdateProfile,
      uploadAvatar: mockUploadAvatar,
      currentUser: null,
      isLoading: false,
      error: null,
      fetchCurrentUser: jest.fn(),
      updatePreferences: jest.fn(),
    });
    mockUpdateProfile.mockResolvedValue(undefined);
    mockUploadAvatar.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('ProfileSetupScreen_OnMount_RendersOnboardingLayout', () => {
      const { getByTestId } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByTestId('onboarding-layout')).toBeTruthy();
    });

    it('ProfileSetupScreen_OnMount_RendersTitle', () => {
      const { getByText } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Set Up Your Profile')).toBeTruthy();
    });

    it('ProfileSetupScreen_OnMount_RendersProfilePhotoUploader', () => {
      const { getByTestId } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByTestId('profile-photo-uploader')).toBeTruthy();
    });

    it('ProfileSetupScreen_OnMount_RendersDisplayNameInput', () => {
      const { getByText } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Display Name')).toBeTruthy();
    });

    it('ProfileSetupScreen_OnMount_RendersBioInput', () => {
      const { getByText } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Bio (Optional)')).toBeTruthy();
    });

    it('ProfileSetupScreen_OnMount_RendersContinueButton', () => {
      const { getByText } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Continue')).toBeTruthy();
    });

    it('ProfileSetupScreen_OnMount_RendersSkipButton', () => {
      const { getByText } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Skip for now')).toBeTruthy();
    });
  });

  describe('display name input', () => {
    it('ProfileSetupScreen_WhenDisplayNameChanged_UpdatesValue', () => {
      const { getAllByTestId } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const displayNameInput = getAllByTestId('text-input')[0];
      fireEvent.changeText(displayNameInput, 'John Doe');

      expect(displayNameInput.props.value).toBe('John Doe');
    });

    it('ProfileSetupScreen_WithDisplayName_ShowsCharacterCount', () => {
      const { getAllByTestId, getByText } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const displayNameInput = getAllByTestId('text-input')[0];
      fireEvent.changeText(displayNameInput, 'John');

      expect(getByText('4/50 characters')).toBeTruthy();
    });

    it('ProfileSetupScreen_WithEmptyDisplayName_ShowsZeroCount', () => {
      const { getByText } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('0/50 characters')).toBeTruthy();
    });
  });

  describe('bio input', () => {
    it('ProfileSetupScreen_WhenBioChanged_UpdatesValue', () => {
      const { getAllByTestId } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const bioInput = getAllByTestId('text-input')[1];
      fireEvent.changeText(bioInput, 'Test bio');

      expect(bioInput.props.value).toBe('Test bio');
    });

    it('ProfileSetupScreen_WithBio_ShowsCharacterCount', () => {
      const { getAllByTestId, getByText } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const bioInput = getAllByTestId('text-input')[1];
      fireEvent.changeText(bioInput, 'Test bio');

      expect(getByText('8/200 characters')).toBeTruthy();
    });

    it('ProfileSetupScreen_WithEmptyBio_ShowsZeroCount', () => {
      const { getByText } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('0/200 characters')).toBeTruthy();
    });
  });

  describe('validation', () => {
    it('ProfileSetupScreen_WithShortDisplayName_DisablesContinueButton', () => {
      const { getAllByTestId, getByTestId } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const displayNameInput = getAllByTestId('text-input')[0];
      fireEvent.changeText(displayNameInput, 'A');

      const continueButton = getByTestId('button-contained');
      expect(continueButton.props.disabled).toBe(true);
    });

    it('ProfileSetupScreen_WithValidDisplayName_EnablesContinueButton', () => {
      const { getAllByTestId, getByTestId } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const displayNameInput = getAllByTestId('text-input')[0];
      fireEvent.changeText(displayNameInput, 'John Doe');

      const continueButton = getByTestId('button-contained');
      expect(continueButton.props.disabled).toBe(false);
    });

    it('ProfileSetupScreen_WithTooLongDisplayName_DisablesContinueButton', () => {
      const { getAllByTestId, getByTestId } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const displayNameInput = getAllByTestId('text-input')[0];
      fireEvent.changeText(displayNameInput, 'A'.repeat(51));

      const continueButton = getByTestId('button-contained');
      expect(continueButton.props.disabled).toBe(true);
    });

    it('ProfileSetupScreen_WithMinimumLengthDisplayName_EnablesContinueButton', () => {
      const { getAllByTestId, getByTestId } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const displayNameInput = getAllByTestId('text-input')[0];
      fireEvent.changeText(displayNameInput, 'AB');

      const continueButton = getByTestId('button-contained');
      expect(continueButton.props.disabled).toBe(false);
    });

    it('ProfileSetupScreen_WithMaximumLengthDisplayName_EnablesContinueButton', () => {
      const { getAllByTestId, getByTestId } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const displayNameInput = getAllByTestId('text-input')[0];
      fireEvent.changeText(displayNameInput, 'A'.repeat(50));

      const continueButton = getByTestId('button-contained');
      expect(continueButton.props.disabled).toBe(false);
    });
  });

  describe('avatar upload', () => {
    it('ProfileSetupScreen_WhenPhotoSelected_CallsUploadAvatar', async () => {
      const { getByTestId } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('upload-photo-button'));

      await waitFor(() => {
        expect(mockUploadAvatar).toHaveBeenCalledWith('file:///test/photo.jpg');
      });
    });

    it('ProfileSetupScreen_WhileUploading_ShowsUploadingState', async () => {
      let resolveUpload: any;
      mockUploadAvatar.mockImplementation(
        () => new Promise((resolve) => (resolveUpload = resolve))
      );

      const { getByTestId, getByText } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('upload-photo-button'));

      await waitFor(() => {
        expect(getByText('Uploading...')).toBeTruthy();
      });

      resolveUpload();
    });

    it('ProfileSetupScreen_WithUploadError_ShowsErrorMessage', async () => {
      mockUploadAvatar.mockRejectedValue(new Error('Upload failed'));

      const { getByTestId, findByTestId } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('upload-photo-button'));

      const errorHelper = await findByTestId('helper-text-error');
      expect(errorHelper).toBeTruthy();
    });

    it('ProfileSetupScreen_WhileUploading_DisablesContinueButton', async () => {
      let resolveUpload: any;
      mockUploadAvatar.mockImplementation(
        () => new Promise((resolve) => (resolveUpload = resolve))
      );

      const { getAllByTestId, getByTestId } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const displayNameInput = getAllByTestId('text-input')[0];
      fireEvent.changeText(displayNameInput, 'John Doe');

      fireEvent.press(getByTestId('upload-photo-button'));

      await waitFor(() => {
        const continueButton = getByTestId('button-contained');
        expect(continueButton.props.disabled).toBe(true);
      });

      resolveUpload();
    });
  });

  describe('continue button', () => {
    it('ProfileSetupScreen_WhenContinuePressedWithValidData_CallsUpdateProfile', async () => {
      const { getAllByTestId, getByText } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const displayNameInput = getAllByTestId('text-input')[0];
      fireEvent.changeText(displayNameInput, 'John Doe');

      fireEvent.press(getByText('Continue'));

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          display_name: 'John Doe',
          bio: undefined,
        });
      });
    });

    it('ProfileSetupScreen_WhenContinuePressedWithBio_IncludesBio', async () => {
      const { getAllByTestId, getByText } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const displayNameInput = getAllByTestId('text-input')[0];
      const bioInput = getAllByTestId('text-input')[1];

      fireEvent.changeText(displayNameInput, 'John Doe');
      fireEvent.changeText(bioInput, 'Test bio');

      fireEvent.press(getByText('Continue'));

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          display_name: 'John Doe',
          bio: 'Test bio',
        });
      });
    });

    it('ProfileSetupScreen_AfterSuccessfulUpdate_NavigatesToPreferences', async () => {
      const { getAllByTestId, getByText } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const displayNameInput = getAllByTestId('text-input')[0];
      fireEvent.changeText(displayNameInput, 'John Doe');

      fireEvent.press(getByText('Continue'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('PreferencesSetup');
      });
    });

    it('ProfileSetupScreen_WithUpdateError_ShowsErrorMessage', async () => {
      mockUpdateProfile.mockRejectedValue(new Error('Update failed'));

      const { getAllByTestId, getByText, findByTestId } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const displayNameInput = getAllByTestId('text-input')[0];
      fireEvent.changeText(displayNameInput, 'John Doe');

      fireEvent.press(getByText('Continue'));

      const errorHelper = await findByTestId('helper-text-error');
      expect(errorHelper).toBeTruthy();
    });

    it('ProfileSetupScreen_WhileSaving_ShowsLoadingState', async () => {
      let resolveUpdate: any;
      mockUpdateProfile.mockImplementation(
        () => new Promise((resolve) => (resolveUpdate = resolve))
      );

      const { getAllByTestId, getByText } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const displayNameInput = getAllByTestId('text-input')[0];
      fireEvent.changeText(displayNameInput, 'John Doe');

      fireEvent.press(getByText('Continue'));

      await waitFor(() => {
        expect(getByText('Loading...')).toBeTruthy();
      });

      resolveUpdate();
    });

    it('ProfileSetupScreen_WhileSaving_DisablesButtons', async () => {
      let resolveUpdate: any;
      mockUpdateProfile.mockImplementation(
        () => new Promise((resolve) => (resolveUpdate = resolve))
      );

      const { getAllByTestId, getByText, getByTestId } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const displayNameInput = getAllByTestId('text-input')[0];
      fireEvent.changeText(displayNameInput, 'John Doe');

      fireEvent.press(getByText('Continue'));

      await waitFor(() => {
        const skipButton = getByTestId('button-text');
        expect(skipButton.props.disabled).toBe(true);
      });

      resolveUpdate();
    });
  });

  describe('skip button', () => {
    it('ProfileSetupScreen_WhenSkipPressed_NavigatesToPreferences', () => {
      const { getByText } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText('Skip for now'));

      expect(mockNavigate).toHaveBeenCalledWith('PreferencesSetup');
    });

    it('ProfileSetupScreen_WhenSkipPressed_DoesNotCallUpdateProfile', () => {
      const { getByText } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText('Skip for now'));

      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
  });

  describe('validation errors', () => {
    it('ProfileSetupScreen_WithTooShortName_ShowsErrorOnSubmit', async () => {
      const { getAllByTestId, getByText, findByTestId } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const displayNameInput = getAllByTestId('text-input')[0];
      fireEvent.changeText(displayNameInput, 'A');

      fireEvent.press(getByText('Continue'));

      const errorHelper = await findByTestId('helper-text-error');
      expect(errorHelper).toBeTruthy();
    });

    it('ProfileSetupScreen_WithTooLongName_ShowsErrorOnSubmit', async () => {
      const { getAllByTestId, getByText, findByTestId } = render(
        <ProfileSetupScreen navigation={mockNavigation} route={mockRoute} />
      );

      const displayNameInput = getAllByTestId('text-input')[0];
      fireEvent.changeText(displayNameInput, 'A'.repeat(51));

      fireEvent.press(getByText('Continue'));

      const errorHelper = await findByTestId('helper-text-error');
      expect(errorHelper).toBeTruthy();
    });
  });
});
