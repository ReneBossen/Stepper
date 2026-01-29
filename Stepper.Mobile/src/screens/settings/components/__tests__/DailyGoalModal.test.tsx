import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { DailyGoalModal } from '../DailyGoalModal';

// Mock @react-native-community/slider
jest.mock('@react-native-community/slider', () => {
  const React = require('react');
  const RN = require('react-native');

  return (props: any) => {
    const { value, onValueChange, minimumValue, maximumValue, testID, accessibilityLabel } = props;
    return React.createElement(
      RN.View,
      { testID, accessibilityLabel },
      React.createElement(RN.Text, { testID: `${testID}-value` }, String(value)),
      React.createElement(RN.Text, { testID: `${testID}-min` }, String(minimumValue)),
      React.createElement(RN.Text, { testID: `${testID}-max` }, String(maximumValue)),
      React.createElement(RN.TouchableOpacity, {
        testID: `${testID}-set-15000`,
        onPress: () => onValueChange?.(15000),
      })
    );
  };
});

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  const RN = require('react-native');

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
    Chip: ({ children, selected, onPress, testID, accessibilityLabel }: any) =>
      React.createElement(
        RN.TouchableOpacity,
        { testID, onPress, accessibilityLabel },
        React.createElement(RN.Text, null, children),
        selected ? React.createElement(RN.View, { testID: `${testID}-selected` }) : null
      ),
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
        surfaceVariant: '#E0E0E0',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        primaryContainer: '#E8F5E9',
        onPrimaryContainer: '#1B5E20',
      },
    }),
  };
});

describe('DailyGoalModal', () => {
  const mockOnDismiss = jest.fn();
  const mockOnSave = jest.fn();

  const defaultProps = {
    visible: true,
    currentGoal: 10000,
    onDismiss: mockOnDismiss,
    onSave: mockOnSave,
    isSaving: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when visible is true', () => {
      const { getByTestId } = render(<DailyGoalModal {...defaultProps} />);
      expect(getByTestId('modal')).toBeTruthy();
    });

    it('should not render when visible is false', () => {
      const { queryByTestId } = render(
        <DailyGoalModal {...defaultProps} visible={false} />
      );
      expect(queryByTestId('modal')).toBeNull();
    });

    it('should display title', () => {
      const { getByText } = render(<DailyGoalModal {...defaultProps} />);
      expect(getByText('Daily Step Goal')).toBeTruthy();
    });

    it('should display description', () => {
      const { getByText } = render(<DailyGoalModal {...defaultProps} />);
      expect(getByText('Set your daily step target')).toBeTruthy();
    });

    it('should display steps label', () => {
      const { getByText } = render(<DailyGoalModal {...defaultProps} />);
      expect(getByText('steps')).toBeTruthy();
    });

    it('should display close button', () => {
      const { getByTestId } = render(<DailyGoalModal {...defaultProps} />);
      expect(getByTestId('daily-goal-modal-close')).toBeTruthy();
    });

    it('should display save button', () => {
      const { getByTestId } = render(<DailyGoalModal {...defaultProps} />);
      expect(getByTestId('daily-goal-save-button')).toBeTruthy();
    });
  });

  describe('slider', () => {
    it('should display slider', () => {
      const { getByTestId } = render(<DailyGoalModal {...defaultProps} />);
      expect(getByTestId('daily-goal-slider')).toBeTruthy();
    });

    it('should have correct minimum value', () => {
      const { getByTestId } = render(<DailyGoalModal {...defaultProps} />);
      expect(getByTestId('daily-goal-slider-min')).toHaveTextContent('1000');
    });

    it('should have correct maximum value', () => {
      const { getByTestId } = render(<DailyGoalModal {...defaultProps} />);
      expect(getByTestId('daily-goal-slider-max')).toHaveTextContent('50000');
    });
  });

  describe('preset goals', () => {
    it('should display preset goals label', () => {
      const { getByText } = render(<DailyGoalModal {...defaultProps} />);
      expect(getByText('Common Goals:')).toBeTruthy();
    });

    it('should display all preset goal chips', () => {
      const { getByTestId } = render(<DailyGoalModal {...defaultProps} />);
      expect(getByTestId('preset-goal-5000')).toBeTruthy();
      expect(getByTestId('preset-goal-8000')).toBeTruthy();
      expect(getByTestId('preset-goal-10000')).toBeTruthy();
      expect(getByTestId('preset-goal-12000')).toBeTruthy();
      expect(getByTestId('preset-goal-15000')).toBeTruthy();
      expect(getByTestId('preset-goal-20000')).toBeTruthy();
    });

    it('should show 10000 as selected when currentGoal is 10000', () => {
      const { getByTestId } = render(<DailyGoalModal {...defaultProps} />);
      expect(getByTestId('preset-goal-10000-selected')).toBeTruthy();
    });
  });

  describe('save functionality', () => {
    it('should call onSave with current goal when save is pressed', () => {
      const { getByTestId } = render(<DailyGoalModal {...defaultProps} />);
      fireEvent.press(getByTestId('daily-goal-save-button'));
      expect(mockOnSave).toHaveBeenCalledWith(10000);
    });

    it('should call onSave with updated goal after slider change', async () => {
      const { getByTestId } = render(<DailyGoalModal {...defaultProps} />);

      // Trigger slider change
      fireEvent.press(getByTestId('daily-goal-slider-set-15000'));

      await waitFor(() => {
        fireEvent.press(getByTestId('daily-goal-save-button'));
        expect(mockOnSave).toHaveBeenCalledWith(15000);
      });
    });

    it('should show loading indicator when isSaving is true', () => {
      const { getByTestId } = render(
        <DailyGoalModal {...defaultProps} isSaving={true} />
      );
      expect(getByTestId('daily-goal-save-button-loading')).toBeTruthy();
    });

    it('should disable save button when isSaving is true', () => {
      const { getByTestId } = render(
        <DailyGoalModal {...defaultProps} isSaving={true} />
      );
      expect(getByTestId('daily-goal-save-button').props.disabled).toBe(true);
    });
  });

  describe('dismiss functionality', () => {
    it('should call onDismiss when close button is pressed', () => {
      const { getByTestId } = render(<DailyGoalModal {...defaultProps} />);
      fireEvent.press(getByTestId('daily-goal-modal-close'));
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  describe('preset chip interaction', () => {
    it('should update goal when preset chip is pressed', async () => {
      const { getByTestId } = render(<DailyGoalModal {...defaultProps} />);

      fireEvent.press(getByTestId('preset-goal-15000'));

      await waitFor(() => {
        fireEvent.press(getByTestId('daily-goal-save-button'));
        expect(mockOnSave).toHaveBeenCalledWith(15000);
      });
    });

    it('should update goal when different preset is selected', async () => {
      const { getByTestId } = render(<DailyGoalModal {...defaultProps} />);

      fireEvent.press(getByTestId('preset-goal-20000'));

      await waitFor(() => {
        fireEvent.press(getByTestId('daily-goal-save-button'));
        expect(mockOnSave).toHaveBeenCalledWith(20000);
      });
    });
  });
});
