import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DateRangePicker } from '../DateRangePicker';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');
  const React = require('react');

  const Portal = ({ children }: any) => children;

  const Modal = ({ children, visible, onDismiss, testID, contentContainerStyle }: any) => {
    if (!visible) return null;
    return React.createElement(
      RN.View,
      { testID, style: contentContainerStyle, accessibilityRole: 'dialog' },
      children
    );
  };

  const TextInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    error,
    testID,
    mode,
    style,
    keyboardType,
    autoCapitalize,
  }: any) => {
    return React.createElement(RN.TextInput, {
      testID,
      value,
      onChangeText,
      placeholder: placeholder || label,
      accessibilityLabel: label,
      accessibilityState: { invalid: !!error },
      style,
    });
  };

  const Button = ({ children, onPress, mode, testID }: any) => {
    return React.createElement(
      RN.TouchableOpacity,
      { testID, onPress, accessibilityRole: 'button' },
      React.createElement(RN.Text, {}, children)
    );
  };

  const Text = ({ children, variant, style, ...props }: any) => {
    return React.createElement(RN.Text, { ...props, style }, children);
  };

  return {
    Portal,
    Modal,
    TextInput,
    Button,
    Text,
    useTheme: () => ({
      colors: {
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        error: '#FF0000',
      },
    }),
  };
});

describe('DateRangePicker', () => {
  const defaultProps = {
    visible: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-15'),
    onDismiss: jest.fn(),
    onConfirm: jest.fn(),
    testID: 'date-range-picker',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal when visible is true', () => {
      const { getByTestId } = render(<DateRangePicker {...defaultProps} />);
      expect(getByTestId('date-range-picker')).toBeTruthy();
    });

    it('should not render when visible is false', () => {
      const { queryByTestId } = render(
        <DateRangePicker {...defaultProps} visible={false} />
      );
      expect(queryByTestId('date-range-picker')).toBeNull();
    });

    it('should display correct title', () => {
      const { getByText } = render(<DateRangePicker {...defaultProps} />);
      expect(getByText('Select Date Range')).toBeTruthy();
    });

    it('should show start date input', () => {
      const { getByTestId } = render(<DateRangePicker {...defaultProps} />);
      expect(getByTestId('date-range-picker-start-input')).toBeTruthy();
    });

    it('should show end date input', () => {
      const { getByTestId } = render(<DateRangePicker {...defaultProps} />);
      expect(getByTestId('date-range-picker-end-input')).toBeTruthy();
    });

    it('should show Cancel button', () => {
      const { getByText } = render(<DateRangePicker {...defaultProps} />);
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should show Apply button', () => {
      const { getByText } = render(<DateRangePicker {...defaultProps} />);
      expect(getByText('Apply')).toBeTruthy();
    });

    it('should show date format hint', () => {
      const { getByText } = render(<DateRangePicker {...defaultProps} />);
      expect(getByText(/YYYY-MM-DD format/)).toBeTruthy();
    });
  });

  describe('date input', () => {
    it('should pre-fill with initial start date in YYYY-MM-DD format', () => {
      const { getByTestId } = render(<DateRangePicker {...defaultProps} />);
      const startInput = getByTestId('date-range-picker-start-input');
      expect(startInput.props.value).toBe('2026-01-01');
    });

    it('should pre-fill with initial end date in YYYY-MM-DD format', () => {
      const { getByTestId } = render(<DateRangePicker {...defaultProps} />);
      const endInput = getByTestId('date-range-picker-end-input');
      expect(endInput.props.value).toBe('2026-01-15');
    });

    it('should update start date input when text changes', () => {
      const { getByTestId } = render(<DateRangePicker {...defaultProps} />);
      const startInput = getByTestId('date-range-picker-start-input');

      fireEvent.changeText(startInput, '2026-02-01');

      expect(startInput.props.value).toBe('2026-02-01');
    });

    it('should update end date input when text changes', () => {
      const { getByTestId } = render(<DateRangePicker {...defaultProps} />);
      const endInput = getByTestId('date-range-picker-end-input');

      fireEvent.changeText(endInput, '2026-02-28');

      expect(endInput.props.value).toBe('2026-02-28');
    });

    it('should reset inputs when modal reopens', () => {
      const { getByTestId, rerender } = render(
        <DateRangePicker {...defaultProps} />
      );

      const startInput = getByTestId('date-range-picker-start-input');
      fireEvent.changeText(startInput, '2026-05-05');

      // Close and reopen modal
      rerender(<DateRangePicker {...defaultProps} visible={false} />);
      rerender(<DateRangePicker {...defaultProps} visible={true} />);

      const startInputAfter = getByTestId('date-range-picker-start-input');
      expect(startInputAfter.props.value).toBe('2026-01-01');
    });
  });

  describe('validation', () => {
    it('should show error for invalid start date format', () => {
      const { getByTestId, getByText } = render(
        <DateRangePicker {...defaultProps} />
      );

      const startInput = getByTestId('date-range-picker-start-input');
      fireEvent.changeText(startInput, 'invalid-date');

      const confirmButton = getByTestId('date-range-picker-confirm-button');
      fireEvent.press(confirmButton);

      expect(getByText('Invalid date format (YYYY-MM-DD)')).toBeTruthy();
    });

    it('should show error for invalid end date format', () => {
      const { getByTestId, getByText } = render(
        <DateRangePicker {...defaultProps} />
      );

      const endInput = getByTestId('date-range-picker-end-input');
      fireEvent.changeText(endInput, '01-15-2026');

      const confirmButton = getByTestId('date-range-picker-confirm-button');
      fireEvent.press(confirmButton);

      expect(getByText('Invalid date format (YYYY-MM-DD)')).toBeTruthy();
    });

    it('should show error when start date is after end date', () => {
      const { getByTestId, getByText } = render(
        <DateRangePicker {...defaultProps} />
      );

      const startInput = getByTestId('date-range-picker-start-input');
      const endInput = getByTestId('date-range-picker-end-input');

      fireEvent.changeText(startInput, '2026-02-15');
      fireEvent.changeText(endInput, '2026-01-01');

      const confirmButton = getByTestId('date-range-picker-confirm-button');
      fireEvent.press(confirmButton);

      expect(getByText('Start date must be before end date')).toBeTruthy();
    });

    it('should clear error when valid date is entered', () => {
      const { getByTestId, queryByText, getByText } = render(
        <DateRangePicker {...defaultProps} />
      );

      const startInput = getByTestId('date-range-picker-start-input');
      fireEvent.changeText(startInput, 'invalid');

      const confirmButton = getByTestId('date-range-picker-confirm-button');
      fireEvent.press(confirmButton);

      // Error should be shown
      expect(getByText('Invalid date format (YYYY-MM-DD)')).toBeTruthy();

      // Type a valid date - error should clear on change
      fireEvent.changeText(startInput, '2026-01-05');

      // Error should be cleared after typing
      expect(queryByText('Invalid date format (YYYY-MM-DD)')).toBeNull();
    });

    it('should reject invalid calendar dates like Feb 30', () => {
      const { getByTestId, getByText } = render(
        <DateRangePicker {...defaultProps} />
      );

      const startInput = getByTestId('date-range-picker-start-input');
      fireEvent.changeText(startInput, '2026-02-30');

      const confirmButton = getByTestId('date-range-picker-confirm-button');
      fireEvent.press(confirmButton);

      expect(getByText('Invalid date format (YYYY-MM-DD)')).toBeTruthy();
    });

    it('should accept valid leap year date Feb 29', () => {
      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <DateRangePicker
          {...defaultProps}
          startDate={new Date('2024-02-01')}
          endDate={new Date('2024-02-29')}
          onConfirm={onConfirm}
        />
      );

      const startInput = getByTestId('date-range-picker-start-input');
      const endInput = getByTestId('date-range-picker-end-input');

      fireEvent.changeText(startInput, '2024-02-01');
      fireEvent.changeText(endInput, '2024-02-29');

      const confirmButton = getByTestId('date-range-picker-confirm-button');
      fireEvent.press(confirmButton);

      expect(onConfirm).toHaveBeenCalled();
    });
  });

  describe('user interactions', () => {
    it('should call onDismiss when Cancel is pressed', () => {
      const onDismiss = jest.fn();
      const { getByTestId } = render(
        <DateRangePicker {...defaultProps} onDismiss={onDismiss} />
      );

      const cancelButton = getByTestId('date-range-picker-cancel-button');
      fireEvent.press(cancelButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm with correct dates when Apply is pressed with valid dates', () => {
      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <DateRangePicker {...defaultProps} onConfirm={onConfirm} />
      );

      const startInput = getByTestId('date-range-picker-start-input');
      const endInput = getByTestId('date-range-picker-end-input');

      fireEvent.changeText(startInput, '2026-03-01');
      fireEvent.changeText(endInput, '2026-03-15');

      const confirmButton = getByTestId('date-range-picker-confirm-button');
      fireEvent.press(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);

      const [startDate, endDate] = onConfirm.mock.calls[0];
      expect(startDate.getFullYear()).toBe(2026);
      expect(startDate.getMonth()).toBe(2); // March is 2 (0-indexed)
      expect(startDate.getDate()).toBe(1);
      expect(endDate.getFullYear()).toBe(2026);
      expect(endDate.getMonth()).toBe(2);
      expect(endDate.getDate()).toBe(15);
    });

    it('should not call onConfirm if validation fails', () => {
      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <DateRangePicker {...defaultProps} onConfirm={onConfirm} />
      );

      const startInput = getByTestId('date-range-picker-start-input');
      fireEvent.changeText(startInput, 'invalid');

      const confirmButton = getByTestId('date-range-picker-confirm-button');
      fireEvent.press(confirmButton);

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('should set start date time to start of day (00:00:00.000)', () => {
      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <DateRangePicker {...defaultProps} onConfirm={onConfirm} />
      );

      const confirmButton = getByTestId('date-range-picker-confirm-button');
      fireEvent.press(confirmButton);

      const [startDate] = onConfirm.mock.calls[0];
      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);
      expect(startDate.getSeconds()).toBe(0);
      expect(startDate.getMilliseconds()).toBe(0);
    });

    it('should set end date time to end of day (23:59:59.999)', () => {
      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <DateRangePicker {...defaultProps} onConfirm={onConfirm} />
      );

      const confirmButton = getByTestId('date-range-picker-confirm-button');
      fireEvent.press(confirmButton);

      const [, endDate] = onConfirm.mock.calls[0];
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
      expect(endDate.getSeconds()).toBe(59);
      expect(endDate.getMilliseconds()).toBe(999);
    });

    it('should allow same start and end date', () => {
      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <DateRangePicker {...defaultProps} onConfirm={onConfirm} />
      );

      const startInput = getByTestId('date-range-picker-start-input');
      const endInput = getByTestId('date-range-picker-end-input');

      fireEvent.changeText(startInput, '2026-01-15');
      fireEvent.changeText(endInput, '2026-01-15');

      const confirmButton = getByTestId('date-range-picker-confirm-button');
      fireEvent.press(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have proper testIDs for all interactive elements', () => {
      const { getByTestId } = render(<DateRangePicker {...defaultProps} />);

      expect(getByTestId('date-range-picker')).toBeTruthy();
      expect(getByTestId('date-range-picker-start-input')).toBeTruthy();
      expect(getByTestId('date-range-picker-end-input')).toBeTruthy();
      expect(getByTestId('date-range-picker-cancel-button')).toBeTruthy();
      expect(getByTestId('date-range-picker-confirm-button')).toBeTruthy();
    });

    it('should have accessibility labels on inputs', () => {
      const { getByTestId } = render(<DateRangePicker {...defaultProps} />);

      const startInput = getByTestId('date-range-picker-start-input');
      const endInput = getByTestId('date-range-picker-end-input');

      expect(startInput.props.accessibilityLabel).toBe('Start Date');
      expect(endInput.props.accessibilityLabel).toBe('End Date');
    });

    it('should indicate invalid state on inputs with errors', () => {
      const { getByTestId } = render(<DateRangePicker {...defaultProps} />);

      const startInput = getByTestId('date-range-picker-start-input');
      fireEvent.changeText(startInput, 'invalid');

      const confirmButton = getByTestId('date-range-picker-confirm-button');
      fireEvent.press(confirmButton);

      const startInputAfter = getByTestId('date-range-picker-start-input');
      expect(startInputAfter.props.accessibilityState?.invalid).toBe(true);
    });

    it('should have dialog role on modal', () => {
      const { getByTestId } = render(<DateRangePicker {...defaultProps} />);
      const modal = getByTestId('date-range-picker');
      expect(modal.props.accessibilityRole).toBe('dialog');
    });

    it('should have button role on buttons', () => {
      const { getByTestId } = render(<DateRangePicker {...defaultProps} />);

      const cancelButton = getByTestId('date-range-picker-cancel-button');
      const confirmButton = getByTestId('date-range-picker-confirm-button');

      expect(cancelButton.props.accessibilityRole).toBe('button');
      expect(confirmButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('edge cases', () => {
    it('should handle year boundaries correctly', () => {
      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <DateRangePicker
          {...defaultProps}
          startDate={new Date('2025-12-25')}
          endDate={new Date('2026-01-05')}
          onConfirm={onConfirm}
        />
      );

      const confirmButton = getByTestId('date-range-picker-confirm-button');
      fireEvent.press(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);

      const [startDate, endDate] = onConfirm.mock.calls[0];
      expect(startDate.getFullYear()).toBe(2025);
      expect(endDate.getFullYear()).toBe(2026);
    });

    it('should handle month boundaries correctly', () => {
      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <DateRangePicker
          {...defaultProps}
          startDate={new Date('2026-01-28')}
          endDate={new Date('2026-02-05')}
          onConfirm={onConfirm}
        />
      );

      const confirmButton = getByTestId('date-range-picker-confirm-button');
      fireEvent.press(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should handle single digit days and months with padding', () => {
      const { getByTestId } = render(
        <DateRangePicker
          {...defaultProps}
          startDate={new Date('2026-01-05')}
          endDate={new Date('2026-02-09')}
        />
      );

      const startInput = getByTestId('date-range-picker-start-input');
      const endInput = getByTestId('date-range-picker-end-input');

      expect(startInput.props.value).toBe('2026-01-05');
      expect(endInput.props.value).toBe('2026-02-09');
    });

    it('should work without testID prop', () => {
      const { getByText, queryByTestId } = render(
        <DateRangePicker
          visible={true}
          startDate={new Date('2026-01-01')}
          endDate={new Date('2026-01-15')}
          onDismiss={jest.fn()}
          onConfirm={jest.fn()}
        />
      );

      // Should render but without testIDs for inputs
      expect(getByText('Select Date Range')).toBeTruthy();
      expect(queryByTestId('date-range-picker-start-input')).toBeNull();
    });
  });
});
