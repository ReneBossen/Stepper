import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ChangePasswordModal } from '../ChangePasswordModal';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  const RN = require('react-native');

  return {
    Modal: ({ visible, children, contentContainerStyle }: any) =>
      visible ? (
        <RN.View testID="modal-container" style={contentContainerStyle}>
          {children}
        </RN.View>
      ) : null,
    Portal: ({ children }: any) => children,
    Text: ({ children, variant, style }: any) => (
      <RN.Text style={style} testID={`text-${variant}`}>
        {children}
      </RN.Text>
    ),
    Button: ({ children, onPress, loading, disabled, testID, accessibilityLabel }: any) => (
      <RN.TouchableOpacity
        testID={testID}
        onPress={onPress}
        disabled={loading || disabled}
        accessibilityLabel={accessibilityLabel}
      >
        <RN.Text>{loading ? 'Loading...' : children}</RN.Text>
        {disabled && <RN.View testID={`${testID}-disabled`} />}
      </RN.TouchableOpacity>
    ),
    TextInput: ({ label, value, onChangeText, onBlur, secureTextEntry, error, testID, accessibilityLabel, right }: any) => (
      <RN.View>
        <RN.Text>{label}</RN.Text>
        <RN.TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          secureTextEntry={secureTextEntry}
          accessibilityLabel={accessibilityLabel}
        />
        {error && <RN.View testID={`${testID}-error-indicator`} />}
        {right}
      </RN.View>
    ),
    IconButton: ({ icon, onPress, testID }: any) => (
      <RN.TouchableOpacity testID={testID} onPress={onPress}>
        <RN.Text>{icon}</RN.Text>
      </RN.TouchableOpacity>
    ),
    HelperText: ({ children, visible, testID }: any) =>
      visible ? (
        <RN.Text testID={testID}>{children}</RN.Text>
      ) : null,
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
      },
    }),
  };
});

// Add TextInput.Icon mock
const mockTextInputIcon = ({ icon, onPress, accessibilityLabel }: any) => {
  const RN = require('react-native');
  return (
    <RN.TouchableOpacity onPress={onPress} accessibilityLabel={accessibilityLabel}>
      <RN.Text>{icon}</RN.Text>
    </RN.TouchableOpacity>
  );
};

// Override the TextInput component to include Icon
jest.mock('react-native-paper', () => {
  const React = require('react');
  const RN = require('react-native');

  const TextInputComponent = ({ label, value, onChangeText, onBlur, secureTextEntry, error, testID, accessibilityLabel, right }: any) => (
    <RN.View>
      <RN.Text>{label}</RN.Text>
      <RN.TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        secureTextEntry={secureTextEntry}
        accessibilityLabel={accessibilityLabel}
      />
      {error && <RN.View testID={`${testID}-error-indicator`} />}
      {right}
    </RN.View>
  );

  TextInputComponent.Icon = ({ icon, onPress, accessibilityLabel }: any) => (
    <RN.TouchableOpacity onPress={onPress} accessibilityLabel={accessibilityLabel} testID={`icon-${icon}`}>
      <RN.Text>{icon}</RN.Text>
    </RN.TouchableOpacity>
  );

  return {
    Modal: ({ visible, children, contentContainerStyle }: any) =>
      visible ? (
        <RN.View testID="modal-container" style={contentContainerStyle}>
          {children}
        </RN.View>
      ) : null,
    Portal: ({ children }: any) => children,
    Text: ({ children, variant, style }: any) => (
      <RN.Text style={style} testID={`text-${variant}`}>
        {children}
      </RN.Text>
    ),
    Button: ({ children, onPress, loading, disabled, testID, accessibilityLabel }: any) => (
      <RN.TouchableOpacity
        testID={testID}
        onPress={onPress}
        disabled={loading || disabled}
        accessibilityLabel={accessibilityLabel}
      >
        <RN.Text>{loading ? 'Loading...' : children}</RN.Text>
        {disabled && <RN.View testID={`${testID}-disabled`} />}
      </RN.TouchableOpacity>
    ),
    TextInput: TextInputComponent,
    IconButton: ({ icon, onPress, testID }: any) => (
      <RN.TouchableOpacity testID={testID} onPress={onPress}>
        <RN.Text>{icon}</RN.Text>
      </RN.TouchableOpacity>
    ),
    HelperText: ({ children, visible, testID }: any) =>
      visible ? (
        <RN.Text testID={testID}>{children}</RN.Text>
      ) : null,
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
      },
    }),
  };
});

describe('ChangePasswordModal', () => {
  const mockOnDismiss = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should not render when not visible', () => {
      const { queryByTestId } = render(
        <ChangePasswordModal
          visible={false}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      expect(queryByTestId('modal-container')).toBeNull();
    });

    it('should render when visible', () => {
      const { getByTestId } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      expect(getByTestId('modal-container')).toBeTruthy();
    });

    it('should display title', () => {
      const { getAllByText } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      // Both title and button have "Change Password" text
      expect(getAllByText('Change Password').length).toBeGreaterThanOrEqual(1);
    });

    it('should display new password input', () => {
      const { getByTestId } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      expect(getByTestId('change-password-new-input')).toBeTruthy();
    });

    it('should display confirm password input', () => {
      const { getByTestId } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      expect(getByTestId('change-password-confirm-input')).toBeTruthy();
    });

    it('should display save button', () => {
      const { getByTestId } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      expect(getByTestId('change-password-save-button')).toBeTruthy();
    });

    it('should display close button', () => {
      const { getByTestId } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      expect(getByTestId('change-password-modal-close')).toBeTruthy();
    });
  });

  describe('close button', () => {
    it('should call onDismiss when close button is pressed', () => {
      const { getByTestId } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      fireEvent.press(getByTestId('change-password-modal-close'));
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  describe('password validation', () => {
    it('should show error when password is too short', () => {
      const { getByTestId, getByText } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      const newPasswordInput = getByTestId('change-password-new-input');
      fireEvent.changeText(newPasswordInput, 'short');
      fireEvent(newPasswordInput, 'blur');

      expect(getByText('Password must be at least 8 characters')).toBeTruthy();
    });

    it('should show error when password has no letters', () => {
      const { getByTestId, getByText } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      const newPasswordInput = getByTestId('change-password-new-input');
      fireEvent.changeText(newPasswordInput, '12345678');
      fireEvent(newPasswordInput, 'blur');

      expect(getByText('Password must contain at least one letter')).toBeTruthy();
    });

    it('should show error when password has no numbers', () => {
      const { getByTestId, getByText } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      const newPasswordInput = getByTestId('change-password-new-input');
      fireEvent.changeText(newPasswordInput, 'abcdefgh');
      fireEvent(newPasswordInput, 'blur');

      expect(getByText('Password must contain at least one number')).toBeTruthy();
    });

    it('should show error when passwords do not match', () => {
      const { getByTestId, getByText } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      const newPasswordInput = getByTestId('change-password-new-input');
      const confirmPasswordInput = getByTestId('change-password-confirm-input');

      fireEvent.changeText(newPasswordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password456');
      fireEvent(confirmPasswordInput, 'blur');

      expect(getByText('Passwords do not match')).toBeTruthy();
    });
  });

  describe('save button state', () => {
    it('should be disabled when fields are empty', () => {
      const { getByTestId } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      expect(getByTestId('change-password-save-button-disabled')).toBeTruthy();
    });

    it('should be disabled when password is invalid', () => {
      const { getByTestId } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      const newPasswordInput = getByTestId('change-password-new-input');
      const confirmPasswordInput = getByTestId('change-password-confirm-input');

      fireEvent.changeText(newPasswordInput, 'short');
      fireEvent.changeText(confirmPasswordInput, 'short');

      expect(getByTestId('change-password-save-button-disabled')).toBeTruthy();
    });

    it('should be disabled when passwords do not match', () => {
      const { getByTestId } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      const newPasswordInput = getByTestId('change-password-new-input');
      const confirmPasswordInput = getByTestId('change-password-confirm-input');

      fireEvent.changeText(newPasswordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password456');

      expect(getByTestId('change-password-save-button-disabled')).toBeTruthy();
    });

    it('should be enabled when password is valid and matches', () => {
      const { getByTestId, queryByTestId } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      const newPasswordInput = getByTestId('change-password-new-input');
      const confirmPasswordInput = getByTestId('change-password-confirm-input');

      fireEvent.changeText(newPasswordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      expect(queryByTestId('change-password-save-button-disabled')).toBeNull();
    });
  });

  describe('save action', () => {
    it('should call onSave with new password when save is pressed', async () => {
      const { getByTestId } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      const newPasswordInput = getByTestId('change-password-new-input');
      const confirmPasswordInput = getByTestId('change-password-confirm-input');
      const saveButton = getByTestId('change-password-save-button');

      fireEvent.changeText(newPasswordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('password123');
      });
    });
  });

  describe('loading state', () => {
    it('should show loading when isSaving is true', () => {
      const { getByText } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
          isSaving={true}
        />
      );

      expect(getByText('Loading...')).toBeTruthy();
    });

    it('should disable save button when isSaving is true', () => {
      const { getByTestId } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
          isSaving={true}
        />
      );

      expect(getByTestId('change-password-save-button-disabled')).toBeTruthy();
    });
  });

  describe('state reset', () => {
    it('should reset fields when modal is closed and reopened', async () => {
      const { getByTestId, rerender } = render(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      const newPasswordInput = getByTestId('change-password-new-input');
      fireEvent.changeText(newPasswordInput, 'password123');

      // Close modal
      rerender(
        <ChangePasswordModal
          visible={false}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      // Reopen modal
      rerender(
        <ChangePasswordModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      const newInput = getByTestId('change-password-new-input');
      expect(newInput.props.value).toBe('');
    });
  });
});
