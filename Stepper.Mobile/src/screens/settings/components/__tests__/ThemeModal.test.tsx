import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeModal } from '../ThemeModal';

// Mock @store/userStore for ThemePreference type
jest.mock('@store/userStore', () => ({
  ThemePreference: {},
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
        React.createElement(RN.Text, null, children)
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

describe('ThemeModal', () => {
  const mockOnDismiss = jest.fn();
  const mockOnSave = jest.fn();

  const defaultProps = {
    visible: true,
    currentTheme: 'system' as const,
    onDismiss: mockOnDismiss,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when visible is true', () => {
      const { getByTestId } = render(<ThemeModal {...defaultProps} />);
      expect(getByTestId('modal')).toBeTruthy();
    });

    it('should not render when visible is false', () => {
      const { queryByTestId } = render(
        <ThemeModal {...defaultProps} visible={false} />
      );
      expect(queryByTestId('modal')).toBeNull();
    });

    it('should display title', () => {
      const { getByText } = render(<ThemeModal {...defaultProps} />);
      expect(getByText('Theme')).toBeTruthy();
    });

    it('should display description', () => {
      const { getByText } = render(<ThemeModal {...defaultProps} />);
      expect(getByText('Choose your app theme')).toBeTruthy();
    });

    it('should display light theme option', () => {
      const { getByTestId } = render(<ThemeModal {...defaultProps} />);
      expect(getByTestId('theme-light-radio')).toBeTruthy();
      expect(getByTestId('theme-light-radio-label')).toHaveTextContent('Light');
    });

    it('should display dark theme option', () => {
      const { getByTestId } = render(<ThemeModal {...defaultProps} />);
      expect(getByTestId('theme-dark-radio')).toBeTruthy();
      expect(getByTestId('theme-dark-radio-label')).toHaveTextContent('Dark');
    });

    it('should display system theme option', () => {
      const { getByTestId } = render(<ThemeModal {...defaultProps} />);
      expect(getByTestId('theme-system-radio')).toBeTruthy();
      expect(getByTestId('theme-system-radio-label')).toHaveTextContent('System Default');
    });

    it('should display light description', () => {
      const { getByText } = render(<ThemeModal {...defaultProps} />);
      expect(getByText('Always use light mode')).toBeTruthy();
    });

    it('should display dark description', () => {
      const { getByText } = render(<ThemeModal {...defaultProps} />);
      expect(getByText('Always use dark mode')).toBeTruthy();
    });

    it('should display system description', () => {
      const { getByText } = render(<ThemeModal {...defaultProps} />);
      expect(getByText('Match device theme')).toBeTruthy();
    });

    it('should display save button', () => {
      const { getByTestId } = render(<ThemeModal {...defaultProps} />);
      expect(getByTestId('theme-save-button')).toBeTruthy();
    });

    it('should display close button', () => {
      const { getByTestId } = render(<ThemeModal {...defaultProps} />);
      expect(getByTestId('theme-modal-close')).toBeTruthy();
    });
  });

  describe('save functionality', () => {
    it('should call onSave with system when system is current and save is pressed', () => {
      const { getByTestId } = render(<ThemeModal {...defaultProps} currentTheme="system" />);
      fireEvent.press(getByTestId('theme-save-button'));
      expect(mockOnSave).toHaveBeenCalledWith('system');
    });

    it('should call onSave with light when light is current and save is pressed', () => {
      const { getByTestId } = render(<ThemeModal {...defaultProps} currentTheme="light" />);
      fireEvent.press(getByTestId('theme-save-button'));
      expect(mockOnSave).toHaveBeenCalledWith('light');
    });

    it('should call onSave with dark when dark is current and save is pressed', () => {
      const { getByTestId } = render(<ThemeModal {...defaultProps} currentTheme="dark" />);
      fireEvent.press(getByTestId('theme-save-button'));
      expect(mockOnSave).toHaveBeenCalledWith('dark');
    });

    it('should call onDismiss after save', () => {
      const { getByTestId } = render(<ThemeModal {...defaultProps} />);
      fireEvent.press(getByTestId('theme-save-button'));
      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('should apply theme immediately (onSave before onDismiss)', () => {
      const callOrder: string[] = [];
      const trackOnSave = jest.fn(() => callOrder.push('onSave'));
      const trackOnDismiss = jest.fn(() => callOrder.push('onDismiss'));

      const { getByTestId } = render(
        <ThemeModal
          {...defaultProps}
          onSave={trackOnSave}
          onDismiss={trackOnDismiss}
        />
      );

      fireEvent.press(getByTestId('theme-save-button'));

      expect(trackOnSave).toHaveBeenCalled();
      expect(trackOnDismiss).toHaveBeenCalled();
      expect(callOrder).toEqual(['onSave', 'onDismiss']);
    });
  });

  describe('dismiss functionality', () => {
    it('should call onDismiss when close button is pressed', () => {
      const { getByTestId } = render(<ThemeModal {...defaultProps} />);
      fireEvent.press(getByTestId('theme-modal-close'));
      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('should not call onSave when close button is pressed', () => {
      const { getByTestId } = render(<ThemeModal {...defaultProps} />);
      fireEvent.press(getByTestId('theme-modal-close'));
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('radio button interaction', () => {
    it('should render radio group', () => {
      const { getByTestId } = render(<ThemeModal {...defaultProps} />);
      expect(getByTestId('radio-group')).toBeTruthy();
    });

    it('should have clickable light option', () => {
      const { getByTestId } = render(<ThemeModal {...defaultProps} />);
      const lightRadio = getByTestId('theme-light-radio');
      expect(lightRadio.props.onPress).toBeDefined();
    });

    it('should have clickable dark option', () => {
      const { getByTestId } = render(<ThemeModal {...defaultProps} />);
      const darkRadio = getByTestId('theme-dark-radio');
      expect(darkRadio.props.onPress).toBeDefined();
    });

    it('should have clickable system option', () => {
      const { getByTestId } = render(<ThemeModal {...defaultProps} />);
      const systemRadio = getByTestId('theme-system-radio');
      expect(systemRadio.props.onPress).toBeDefined();
    });
  });
});
