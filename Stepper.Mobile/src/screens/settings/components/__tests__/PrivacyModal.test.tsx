import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PrivacyModal } from '../PrivacyModal';

// Mock @services/api/userPreferencesApi for PrivacyLevel type
jest.mock('@services/api/userPreferencesApi', () => ({
  PrivacyLevel: {},
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  const RN = require('react-native');

  // Store callback reference
  let valueChangeCallback: ((value: string) => void) | null = null;

  const RadioButton = {
    Group: ({ onValueChange, value, children }: any) => {
      valueChangeCallback = onValueChange;
      return React.createElement(RN.View, { testID: 'radio-group', value }, children);
    },
    Item: ({ label, value, testID, accessibilityLabel }: any) => {
      return React.createElement(
        RN.TouchableOpacity,
        {
          testID,
          accessibilityLabel,
          onPress: () => valueChangeCallback?.(value),
        },
        React.createElement(RN.Text, { testID: `${testID}-label` }, label)
      );
    },
  };

  return {
    Modal: ({ visible, onDismiss, children, contentContainerStyle }: any) =>
      visible
        ? React.createElement(RN.View, { testID: 'modal', style: contentContainerStyle }, children)
        : null,
    Portal: ({ children }: any) =>
      React.createElement(RN.View, { testID: 'portal' }, children),
    Text: ({ children, variant, style }: any) =>
      React.createElement(RN.Text, { style, testID: `text-${variant}` }, children),
    Button: ({ children, onPress, loading, disabled, testID, accessibilityLabel }: any) =>
      React.createElement(
        RN.TouchableOpacity,
        { testID, onPress, disabled: disabled || loading, accessibilityLabel },
        React.createElement(RN.Text, null, children),
        loading ? React.createElement(RN.View, { testID: `${testID}-loading` }) : null
      ),
    RadioButton,
    IconButton: ({ icon, onPress, testID }: any) =>
      React.createElement(
        RN.TouchableOpacity,
        { testID, onPress },
        React.createElement(RN.Text, null, icon)
      ),
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        primaryContainer: '#E8F5E9',
      },
    }),
  };
});

describe('PrivacyModal', () => {
  const mockOnDismiss = jest.fn();
  const mockOnSave = jest.fn();

  const defaultProps = {
    visible: true,
    settingType: 'activity_visibility' as const,
    currentValue: 'partial' as const,
    onDismiss: mockOnDismiss,
    onSave: mockOnSave,
    isSaving: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when visible is true', () => {
      const { getByTestId } = render(<PrivacyModal {...defaultProps} />);
      expect(getByTestId('modal')).toBeTruthy();
    });

    it('should not render when visible is false', () => {
      const { queryByTestId } = render(
        <PrivacyModal {...defaultProps} visible={false} />
      );
      expect(queryByTestId('modal')).toBeNull();
    });

    it('should display close button', () => {
      const { getByTestId } = render(<PrivacyModal {...defaultProps} />);
      expect(getByTestId('privacy-modal-close')).toBeTruthy();
    });

    it('should display save button', () => {
      const { getByTestId } = render(<PrivacyModal {...defaultProps} />);
      expect(getByTestId('privacy-save-button')).toBeTruthy();
    });
  });

  describe('activity visibility settings', () => {
    it('should display correct title for activity_visibility', () => {
      const { getByText } = render(<PrivacyModal {...defaultProps} />);
      expect(getByText('Activity Visibility')).toBeTruthy();
    });

    it('should display correct description for activity_visibility', () => {
      const { getByText } = render(<PrivacyModal {...defaultProps} />);
      expect(getByText('Who can see your step activity')).toBeTruthy();
    });

    it('should display public option for activity_visibility', () => {
      const { getByTestId, getByText } = render(<PrivacyModal {...defaultProps} />);
      expect(getByTestId('privacy-activity_visibility-public-radio')).toBeTruthy();
      expect(getByText('Anyone can see your activity')).toBeTruthy();
    });

    it('should display partial option for activity_visibility', () => {
      const { getByTestId, getByText } = render(<PrivacyModal {...defaultProps} />);
      expect(getByTestId('privacy-activity_visibility-partial-radio')).toBeTruthy();
      expect(getByText('Only friends can see your activity')).toBeTruthy();
    });

    it('should display private option for activity_visibility', () => {
      const { getByTestId, getByText } = render(<PrivacyModal {...defaultProps} />);
      expect(getByTestId('privacy-activity_visibility-private-radio')).toBeTruthy();
      expect(getByText('Nobody can see your activity')).toBeTruthy();
    });
  });

  describe('find_me settings', () => {
    const findMeProps = {
      ...defaultProps,
      settingType: 'find_me' as const,
      currentValue: 'public' as const,
    };

    it('should display correct title for find_me', () => {
      const { getByText } = render(<PrivacyModal {...findMeProps} />);
      expect(getByText('Who Can Find Me')).toBeTruthy();
    });

    it('should display correct description for find_me', () => {
      const { getByText } = render(<PrivacyModal {...findMeProps} />);
      expect(getByText('Who can find you in search')).toBeTruthy();
    });

    it('should display public option for find_me', () => {
      const { getByTestId, getByText } = render(<PrivacyModal {...findMeProps} />);
      expect(getByTestId('privacy-find_me-public-radio')).toBeTruthy();
      expect(getByText('Anyone can find you')).toBeTruthy();
    });

    it('should display partial option for find_me', () => {
      const { getByTestId, getByText } = render(<PrivacyModal {...findMeProps} />);
      expect(getByTestId('privacy-find_me-partial-radio')).toBeTruthy();
      expect(getByText('Only friends of friends can find you')).toBeTruthy();
    });

    it('should display private option for find_me', () => {
      const { getByTestId, getByText } = render(<PrivacyModal {...findMeProps} />);
      expect(getByTestId('privacy-find_me-private-radio')).toBeTruthy();
      expect(getByText('You will not appear in search results')).toBeTruthy();
    });
  });

  describe('profile_visibility settings', () => {
    const profileProps = {
      ...defaultProps,
      settingType: 'profile_visibility' as const,
      currentValue: 'public' as const,
    };

    it('should display correct title for profile_visibility', () => {
      const { getByText } = render(<PrivacyModal {...profileProps} />);
      expect(getByText('Profile Visibility')).toBeTruthy();
    });

    it('should display correct description for profile_visibility', () => {
      const { getByText } = render(<PrivacyModal {...profileProps} />);
      expect(getByText('Who can see your profile')).toBeTruthy();
    });

    it('should display public option for profile_visibility', () => {
      const { getByTestId, getByText } = render(<PrivacyModal {...profileProps} />);
      expect(getByTestId('privacy-profile_visibility-public-radio')).toBeTruthy();
      expect(getByText('Anyone can see your profile')).toBeTruthy();
    });

    it('should display partial option for profile_visibility', () => {
      const { getByTestId, getByText } = render(<PrivacyModal {...profileProps} />);
      expect(getByTestId('privacy-profile_visibility-partial-radio')).toBeTruthy();
      expect(getByText('Only friends can see your profile')).toBeTruthy();
    });

    it('should display private option for profile_visibility', () => {
      const { getByTestId, getByText } = render(<PrivacyModal {...profileProps} />);
      expect(getByTestId('privacy-profile_visibility-private-radio')).toBeTruthy();
      expect(getByText('Nobody can see your profile')).toBeTruthy();
    });
  });

  describe('save functionality', () => {
    it('should call onSave with partial when partial is current and save is pressed', () => {
      const { getByTestId } = render(<PrivacyModal {...defaultProps} currentValue="partial" />);
      fireEvent.press(getByTestId('privacy-save-button'));
      expect(mockOnSave).toHaveBeenCalledWith('partial');
    });

    it('should call onSave with public when public is current and save is pressed', () => {
      const { getByTestId } = render(<PrivacyModal {...defaultProps} currentValue="public" />);
      fireEvent.press(getByTestId('privacy-save-button'));
      expect(mockOnSave).toHaveBeenCalledWith('public');
    });

    it('should call onSave with private when private is current and save is pressed', () => {
      const { getByTestId } = render(<PrivacyModal {...defaultProps} currentValue="private" />);
      fireEvent.press(getByTestId('privacy-save-button'));
      expect(mockOnSave).toHaveBeenCalledWith('private');
    });

    it('should show loading indicator when isSaving is true', () => {
      const { getByTestId } = render(
        <PrivacyModal {...defaultProps} isSaving={true} />
      );
      expect(getByTestId('privacy-save-button-loading')).toBeTruthy();
    });

    it('should disable save button when isSaving is true', () => {
      const { getByTestId } = render(
        <PrivacyModal {...defaultProps} isSaving={true} />
      );
      expect(getByTestId('privacy-save-button').props.disabled).toBe(true);
    });
  });

  describe('dismiss functionality', () => {
    it('should call onDismiss when close button is pressed', () => {
      const { getByTestId } = render(<PrivacyModal {...defaultProps} />);
      fireEvent.press(getByTestId('privacy-modal-close'));
      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('should not call onSave when close button is pressed', () => {
      const { getByTestId } = render(<PrivacyModal {...defaultProps} />);
      fireEvent.press(getByTestId('privacy-modal-close'));
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('radio button interaction', () => {
    it('should render radio group', () => {
      const { getByTestId } = render(<PrivacyModal {...defaultProps} />);
      expect(getByTestId('radio-group')).toBeTruthy();
    });

    it('should have clickable public option', () => {
      const { getByTestId } = render(<PrivacyModal {...defaultProps} />);
      const publicRadio = getByTestId('privacy-activity_visibility-public-radio');
      expect(publicRadio.props.onPress).toBeDefined();
    });

    it('should have clickable partial option', () => {
      const { getByTestId } = render(<PrivacyModal {...defaultProps} />);
      const partialRadio = getByTestId('privacy-activity_visibility-partial-radio');
      expect(partialRadio.props.onPress).toBeDefined();
    });

    it('should have clickable private option', () => {
      const { getByTestId } = render(<PrivacyModal {...defaultProps} />);
      const privateRadio = getByTestId('privacy-activity_visibility-private-radio');
      expect(privateRadio.props.onPress).toBeDefined();
    });
  });
});
