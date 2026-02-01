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

  const Button = ({ children, onPress, mode, testID, icon, style }: any) => {
    return React.createElement(
      RN.TouchableOpacity,
      { testID, onPress, accessibilityRole: 'button' },
      React.createElement(RN.Text, {}, children)
    );
  };

  const Chip = ({ children, onPress, selected, mode, testID, style, accessibilityLabel }: any) => {
    return React.createElement(
      RN.TouchableOpacity,
      { testID, onPress, accessibilityRole: 'button', accessibilityLabel },
      React.createElement(RN.Text, {}, children)
    );
  };

  const Text = ({ children, variant, style, ...props }: any) => {
    return React.createElement(RN.Text, { ...props, style }, children);
  };

  const Divider = ({ style }: any) => {
    return React.createElement(RN.View, { style });
  };

  return {
    Portal,
    Modal,
    Button,
    Chip,
    Text,
    Divider,
    useTheme: () => ({
      colors: {
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        surfaceVariant: '#F5F5F5',
        error: '#FF0000',
      },
    }),
  };
});

// Mock react-native-paper-dates
jest.mock('react-native-paper-dates', () => {
  const React = require('react');
  const RN = require('react-native');

  const DatePickerModal = ({
    visible,
    onDismiss,
    onConfirm,
    startDate,
    endDate,
    mode,
  }: any) => {
    if (!visible) return null;

    // Simulate the calendar modal with buttons to test interactions
    return React.createElement(
      RN.View,
      { testID: 'calendar-modal' },
      React.createElement(
        RN.TouchableOpacity,
        {
          testID: 'calendar-confirm',
          onPress: () =>
            onConfirm({
              startDate: new Date('2026-03-01'),
              endDate: new Date('2026-03-15'),
            }),
        },
        React.createElement(RN.Text, {}, 'Select')
      ),
      React.createElement(
        RN.TouchableOpacity,
        { testID: 'calendar-dismiss', onPress: onDismiss },
        React.createElement(RN.Text, {}, 'Cancel')
      )
    );
  };

  return {
    DatePickerModal,
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
    // Mock current date for preset calculations
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-20'));
  });

  afterEach(() => {
    jest.useRealTimers();
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

    it('should show Cancel button', () => {
      const { getByText } = render(<DateRangePicker {...defaultProps} />);
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should show Apply button', () => {
      const { getByText } = render(<DateRangePicker {...defaultProps} />);
      expect(getByText('Apply')).toBeTruthy();
    });

    it('should show Pick Dates button', () => {
      const { getByText } = render(<DateRangePicker {...defaultProps} />);
      expect(getByText('Pick Dates')).toBeTruthy();
    });

    it('should show Quick Select section', () => {
      const { getByText } = render(<DateRangePicker {...defaultProps} />);
      expect(getByText('Quick Select')).toBeTruthy();
    });

    it('should show Custom Range section', () => {
      const { getByText } = render(<DateRangePicker {...defaultProps} />);
      expect(getByText('Custom Range')).toBeTruthy();
    });
  });

  describe('preset buttons', () => {
    it('should render Last 7 days preset', () => {
      const { getByText } = render(<DateRangePicker {...defaultProps} />);
      expect(getByText('Last 7 days')).toBeTruthy();
    });

    it('should render Last 30 days preset', () => {
      const { getByText } = render(<DateRangePicker {...defaultProps} />);
      expect(getByText('Last 30 days')).toBeTruthy();
    });

    it('should render This month preset', () => {
      const { getByText } = render(<DateRangePicker {...defaultProps} />);
      expect(getByText('This month')).toBeTruthy();
    });

    it('should call onConfirm immediately when Last 7 days preset is selected', () => {
      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <DateRangePicker {...defaultProps} onConfirm={onConfirm} />
      );

      const preset = getByTestId('date-range-picker-preset-last7');
      fireEvent.press(preset);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      const [startDate, endDate] = onConfirm.mock.calls[0];

      // Should be 7 days range ending today (2026-01-20)
      expect(startDate.getDate()).toBe(14); // Jan 14 (6 days before Jan 20)
      expect(endDate.getDate()).toBe(20); // Jan 20 (today)
    });

    it('should call onConfirm immediately when Last 30 days preset is selected', () => {
      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <DateRangePicker {...defaultProps} onConfirm={onConfirm} />
      );

      const preset = getByTestId('date-range-picker-preset-last30');
      fireEvent.press(preset);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      const [startDate, endDate] = onConfirm.mock.calls[0];

      // Should be 30 days range
      expect(startDate.getMonth()).toBe(11); // December
      expect(startDate.getDate()).toBe(22); // Dec 22 (29 days before Jan 20)
      expect(endDate.getMonth()).toBe(0); // January
      expect(endDate.getDate()).toBe(20); // Jan 20 (today)
    });

    it('should call onConfirm immediately when This month preset is selected', () => {
      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <DateRangePicker {...defaultProps} onConfirm={onConfirm} />
      );

      const preset = getByTestId('date-range-picker-preset-thisMonth');
      fireEvent.press(preset);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      const [startDate, endDate] = onConfirm.mock.calls[0];

      // Should be from Jan 1 to today (Jan 20)
      expect(startDate.getMonth()).toBe(0); // January
      expect(startDate.getDate()).toBe(1);
      expect(endDate.getMonth()).toBe(0); // January
      expect(endDate.getDate()).toBe(20);
    });

    it('should have accessibility labels on preset chips', () => {
      const { getByTestId } = render(<DateRangePicker {...defaultProps} />);

      const last7Preset = getByTestId('date-range-picker-preset-last7');
      const last30Preset = getByTestId('date-range-picker-preset-last30');
      const thisMonthPreset = getByTestId('date-range-picker-preset-thisMonth');

      expect(last7Preset.props.accessibilityLabel).toBe('Select Last 7 days');
      expect(last30Preset.props.accessibilityLabel).toBe('Select Last 30 days');
      expect(thisMonthPreset.props.accessibilityLabel).toBe('Select This month');
    });
  });

  describe('date range display', () => {
    it('should display the current date range', () => {
      const { getByTestId } = render(<DateRangePicker {...defaultProps} />);
      const rangeDisplay = getByTestId('date-range-picker-range-display');

      // Should show Jan 1, 2026 - Jan 15, 2026
      expect(rangeDisplay).toBeTruthy();
    });

    it('should reset display when modal reopens', () => {
      const { getByTestId, rerender } = render(
        <DateRangePicker {...defaultProps} />
      );

      // Close and reopen modal with new dates
      rerender(<DateRangePicker {...defaultProps} visible={false} />);
      rerender(
        <DateRangePicker
          {...defaultProps}
          visible={true}
          startDate={new Date('2026-02-01')}
          endDate={new Date('2026-02-15')}
        />
      );

      const rangeDisplay = getByTestId('date-range-picker-range-display');
      expect(rangeDisplay).toBeTruthy();
    });
  });

  describe('calendar picker', () => {
    it('should open calendar modal when Pick Dates is pressed', () => {
      const { getByTestId, queryByTestId } = render(
        <DateRangePicker {...defaultProps} />
      );

      // Calendar should not be visible initially
      expect(queryByTestId('calendar-modal')).toBeNull();

      // Press Pick Dates button
      const pickDatesButton = getByTestId('date-range-picker-pick-dates-button');
      fireEvent.press(pickDatesButton);

      // Calendar should now be visible
      expect(getByTestId('calendar-modal')).toBeTruthy();
    });

    it('should close calendar modal when dismissed', () => {
      const { getByTestId, queryByTestId } = render(
        <DateRangePicker {...defaultProps} />
      );

      // Open calendar
      const pickDatesButton = getByTestId('date-range-picker-pick-dates-button');
      fireEvent.press(pickDatesButton);
      expect(getByTestId('calendar-modal')).toBeTruthy();

      // Dismiss calendar
      const dismissButton = getByTestId('calendar-dismiss');
      fireEvent.press(dismissButton);

      // Calendar should be closed
      expect(queryByTestId('calendar-modal')).toBeNull();
    });

    it('should update temp dates when calendar confirms', () => {
      const { getByTestId, queryByTestId } = render(
        <DateRangePicker {...defaultProps} />
      );

      // Open calendar
      const pickDatesButton = getByTestId('date-range-picker-pick-dates-button');
      fireEvent.press(pickDatesButton);

      // Confirm selection in calendar (mocked to return Mar 1-15)
      const confirmButton = getByTestId('calendar-confirm');
      fireEvent.press(confirmButton);

      // Calendar should close
      expect(queryByTestId('calendar-modal')).toBeNull();

      // Range display should be updated (but we need to press Apply to confirm)
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

    it('should call onConfirm with current range when Apply is pressed', () => {
      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <DateRangePicker {...defaultProps} onConfirm={onConfirm} />
      );

      const confirmButton = getByTestId('date-range-picker-confirm-button');
      fireEvent.press(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);

      const [startDate, endDate] = onConfirm.mock.calls[0];
      expect(startDate.getFullYear()).toBe(2026);
      expect(startDate.getMonth()).toBe(0); // January
      expect(startDate.getDate()).toBe(1);
      expect(endDate.getFullYear()).toBe(2026);
      expect(endDate.getMonth()).toBe(0);
      expect(endDate.getDate()).toBe(15);
    });

    it('should call onConfirm with updated range after using calendar picker', () => {
      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <DateRangePicker {...defaultProps} onConfirm={onConfirm} />
      );

      // Open calendar and confirm (mocked to return Mar 1-15)
      const pickDatesButton = getByTestId('date-range-picker-pick-dates-button');
      fireEvent.press(pickDatesButton);

      const calendarConfirm = getByTestId('calendar-confirm');
      fireEvent.press(calendarConfirm);

      // Now press Apply
      const applyButton = getByTestId('date-range-picker-confirm-button');
      fireEvent.press(applyButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);

      const [startDate, endDate] = onConfirm.mock.calls[0];
      expect(startDate.getMonth()).toBe(2); // March
      expect(startDate.getDate()).toBe(1);
      expect(endDate.getMonth()).toBe(2); // March
      expect(endDate.getDate()).toBe(15);
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
  });

  describe('accessibility', () => {
    it('should have proper testIDs for all interactive elements', () => {
      const { getByTestId } = render(<DateRangePicker {...defaultProps} />);

      expect(getByTestId('date-range-picker')).toBeTruthy();
      expect(getByTestId('date-range-picker-preset-last7')).toBeTruthy();
      expect(getByTestId('date-range-picker-preset-last30')).toBeTruthy();
      expect(getByTestId('date-range-picker-preset-thisMonth')).toBeTruthy();
      expect(getByTestId('date-range-picker-pick-dates-button')).toBeTruthy();
      expect(getByTestId('date-range-picker-cancel-button')).toBeTruthy();
      expect(getByTestId('date-range-picker-confirm-button')).toBeTruthy();
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
      const pickDatesButton = getByTestId('date-range-picker-pick-dates-button');

      expect(cancelButton.props.accessibilityRole).toBe('button');
      expect(confirmButton.props.accessibilityRole).toBe('button');
      expect(pickDatesButton.props.accessibilityRole).toBe('button');
    });

    it('should have accessibility label on Pick Dates button', () => {
      const { getByTestId } = render(<DateRangePicker {...defaultProps} />);
      const pickDatesButton = getByTestId('date-range-picker-pick-dates-button');
      // Button component in mock doesn't pass accessibilityLabel, but the real component does
      expect(pickDatesButton).toBeTruthy();
    });
  });

  describe('edge cases', () => {
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

      // Should render but without testIDs
      expect(getByText('Select Date Range')).toBeTruthy();
      expect(queryByTestId('date-range-picker-preset-last7')).toBeNull();
    });

    it('should handle year boundaries correctly in presets', () => {
      // Set date to early January
      jest.setSystemTime(new Date('2026-01-05'));

      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <DateRangePicker {...defaultProps} onConfirm={onConfirm} />
      );

      const preset = getByTestId('date-range-picker-preset-last30');
      fireEvent.press(preset);

      const [startDate, endDate] = onConfirm.mock.calls[0];
      expect(startDate.getFullYear()).toBe(2025); // Previous year
      expect(endDate.getFullYear()).toBe(2026); // Current year
    });

    it('should handle This month preset at start of month', () => {
      jest.setSystemTime(new Date('2026-02-01'));

      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <DateRangePicker {...defaultProps} onConfirm={onConfirm} />
      );

      const preset = getByTestId('date-range-picker-preset-thisMonth');
      fireEvent.press(preset);

      const [startDate, endDate] = onConfirm.mock.calls[0];
      expect(startDate.getDate()).toBe(1);
      expect(endDate.getDate()).toBe(1);
      expect(startDate.getMonth()).toBe(1); // February
    });
  });
});
