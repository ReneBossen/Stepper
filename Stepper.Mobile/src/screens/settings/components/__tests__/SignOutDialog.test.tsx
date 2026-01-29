import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SignOutDialog } from '../SignOutDialog';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  const Dialog = ({ visible, onDismiss, children, testID }: any) =>
    visible ? (
      <RN.View testID={testID}>
        {children}
      </RN.View>
    ) : null;

  Dialog.Title = ({ children }: any) => (
    <RN.Text testID="dialog-title">{children}</RN.Text>
  );

  Dialog.Content = ({ children }: any) => (
    <RN.View testID="dialog-content">{children}</RN.View>
  );

  Dialog.Actions = ({ children, style }: any) => (
    <RN.View testID="dialog-actions" style={style}>
      {children}
    </RN.View>
  );

  return {
    Portal: ({ children }: any) => <RN.View testID="portal">{children}</RN.View>,
    Dialog,
    Text: ({ children, variant, style }: any) => (
      <RN.Text style={style} testID={`text-${variant}`}>
        {children}
      </RN.Text>
    ),
    Button: ({ children, onPress, loading, disabled, testID, accessibilityLabel, textColor }: any) => (
      <RN.TouchableOpacity
        testID={testID}
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityLabel={accessibilityLabel}
      >
        <RN.Text style={{ color: textColor }}>{children}</RN.Text>
        {loading && <RN.View testID={`${testID}-loading`} />}
      </RN.TouchableOpacity>
    ),
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

describe('SignOutDialog', () => {
  const mockOnDismiss = jest.fn();
  const mockOnConfirm = jest.fn();

  const defaultProps = {
    visible: true,
    onDismiss: mockOnDismiss,
    onConfirm: mockOnConfirm,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when visible is true', () => {
      const { getByTestId } = render(<SignOutDialog {...defaultProps} />);
      expect(getByTestId('sign-out-dialog')).toBeTruthy();
    });

    it('should not render when visible is false', () => {
      const { queryByTestId } = render(
        <SignOutDialog {...defaultProps} visible={false} />
      );
      expect(queryByTestId('sign-out-dialog')).toBeNull();
    });

    it('should display title', () => {
      const { getByTestId } = render(<SignOutDialog {...defaultProps} />);
      expect(getByTestId('dialog-title')).toHaveTextContent('Sign Out');
    });

    it('should display confirmation message', () => {
      const { getByText } = render(<SignOutDialog {...defaultProps} />);
      expect(
        getByText('Are you sure you want to sign out? You will need to sign in again to access your account.')
      ).toBeTruthy();
    });

    it('should display cancel button', () => {
      const { getByTestId } = render(<SignOutDialog {...defaultProps} />);
      expect(getByTestId('sign-out-cancel')).toBeTruthy();
      expect(getByTestId('sign-out-cancel')).toHaveTextContent('Cancel');
    });

    it('should display confirm button', () => {
      const { getByTestId } = render(<SignOutDialog {...defaultProps} />);
      expect(getByTestId('sign-out-confirm')).toBeTruthy();
      expect(getByTestId('sign-out-confirm')).toHaveTextContent('Sign Out');
    });
  });

  describe('cancel functionality', () => {
    it('should call onDismiss when cancel button is pressed', () => {
      const { getByTestId } = render(<SignOutDialog {...defaultProps} />);
      fireEvent.press(getByTestId('sign-out-cancel'));
      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('should not call onConfirm when cancel button is pressed', () => {
      const { getByTestId } = render(<SignOutDialog {...defaultProps} />);
      fireEvent.press(getByTestId('sign-out-cancel'));
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should disable cancel button when isLoading is true', () => {
      const { getByTestId } = render(
        <SignOutDialog {...defaultProps} isLoading={true} />
      );
      expect(getByTestId('sign-out-cancel').props.disabled).toBe(true);
    });
  });

  describe('confirm functionality', () => {
    it('should call onConfirm when confirm button is pressed', () => {
      const { getByTestId } = render(<SignOutDialog {...defaultProps} />);
      fireEvent.press(getByTestId('sign-out-confirm'));
      expect(mockOnConfirm).toHaveBeenCalled();
    });

    it('should not call onDismiss when confirm button is pressed', () => {
      const { getByTestId } = render(<SignOutDialog {...defaultProps} />);
      fireEvent.press(getByTestId('sign-out-confirm'));
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });

    it('should show loading indicator when isLoading is true', () => {
      const { getByTestId } = render(
        <SignOutDialog {...defaultProps} isLoading={true} />
      );
      expect(getByTestId('sign-out-confirm-loading')).toBeTruthy();
    });

    it('should disable confirm button when isLoading is true', () => {
      const { getByTestId } = render(
        <SignOutDialog {...defaultProps} isLoading={true} />
      );
      expect(getByTestId('sign-out-confirm').props.disabled).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should have accessible label for cancel button', () => {
      const { getByTestId } = render(<SignOutDialog {...defaultProps} />);
      expect(getByTestId('sign-out-cancel').props.accessibilityLabel).toBe('Cancel sign out');
    });

    it('should have accessible label for confirm button', () => {
      const { getByTestId } = render(<SignOutDialog {...defaultProps} />);
      expect(getByTestId('sign-out-confirm').props.accessibilityLabel).toBe('Confirm sign out');
    });
  });

  describe('styling', () => {
    it('should render dialog actions container', () => {
      const { getByTestId } = render(<SignOutDialog {...defaultProps} />);
      expect(getByTestId('dialog-actions')).toBeTruthy();
    });

    it('should render dialog content container', () => {
      const { getByTestId } = render(<SignOutDialog {...defaultProps} />);
      expect(getByTestId('dialog-content')).toBeTruthy();
    });
  });
});
