import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { UnitsModal } from '../UnitsModal';

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

describe('UnitsModal', () => {
  const mockOnDismiss = jest.fn();
  const mockOnSave = jest.fn();

  const defaultProps = {
    visible: true,
    currentUnits: 'metric' as const,
    onDismiss: mockOnDismiss,
    onSave: mockOnSave,
    isSaving: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when visible is true', () => {
      const { getByTestId } = render(<UnitsModal {...defaultProps} />);
      expect(getByTestId('modal')).toBeTruthy();
    });

    it('should not render when visible is false', () => {
      const { queryByTestId } = render(
        <UnitsModal {...defaultProps} visible={false} />
      );
      expect(queryByTestId('modal')).toBeNull();
    });

    it('should display title', () => {
      const { getByText } = render(<UnitsModal {...defaultProps} />);
      expect(getByText('Units')).toBeTruthy();
    });

    it('should display description', () => {
      const { getByText } = render(<UnitsModal {...defaultProps} />);
      expect(getByText('Choose your preferred unit system')).toBeTruthy();
    });

    it('should display metric option', () => {
      const { getByTestId } = render(<UnitsModal {...defaultProps} />);
      expect(getByTestId('units-metric-radio')).toBeTruthy();
      expect(getByTestId('units-metric-radio-label')).toHaveTextContent('Metric (km)');
    });

    it('should display imperial option', () => {
      const { getByTestId } = render(<UnitsModal {...defaultProps} />);
      expect(getByTestId('units-imperial-radio')).toBeTruthy();
      expect(getByTestId('units-imperial-radio-label')).toHaveTextContent('Imperial (miles)');
    });

    it('should display metric description', () => {
      const { getByText } = render(<UnitsModal {...defaultProps} />);
      expect(getByText('Distance in kilometers')).toBeTruthy();
    });

    it('should display imperial description', () => {
      const { getByText } = render(<UnitsModal {...defaultProps} />);
      expect(getByText('Distance in miles')).toBeTruthy();
    });

    it('should display save button', () => {
      const { getByTestId } = render(<UnitsModal {...defaultProps} />);
      expect(getByTestId('units-save-button')).toBeTruthy();
    });

    it('should display close button', () => {
      const { getByTestId } = render(<UnitsModal {...defaultProps} />);
      expect(getByTestId('units-modal-close')).toBeTruthy();
    });
  });

  describe('save functionality', () => {
    it('should call onSave with metric when metric is current and save is pressed', () => {
      const { getByTestId } = render(<UnitsModal {...defaultProps} currentUnits="metric" />);
      fireEvent.press(getByTestId('units-save-button'));
      expect(mockOnSave).toHaveBeenCalledWith('metric');
    });

    it('should call onSave with imperial when imperial is current and save is pressed', () => {
      const { getByTestId } = render(<UnitsModal {...defaultProps} currentUnits="imperial" />);
      fireEvent.press(getByTestId('units-save-button'));
      expect(mockOnSave).toHaveBeenCalledWith('imperial');
    });

    it('should show loading indicator when isSaving is true', () => {
      const { getByTestId } = render(
        <UnitsModal {...defaultProps} isSaving={true} />
      );
      expect(getByTestId('units-save-button-loading')).toBeTruthy();
    });

    it('should disable save button when isSaving is true', () => {
      const { getByTestId } = render(
        <UnitsModal {...defaultProps} isSaving={true} />
      );
      expect(getByTestId('units-save-button').props.disabled).toBe(true);
    });
  });

  describe('dismiss functionality', () => {
    it('should call onDismiss when close button is pressed', () => {
      const { getByTestId } = render(<UnitsModal {...defaultProps} />);
      fireEvent.press(getByTestId('units-modal-close'));
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  describe('radio button interaction', () => {
    it('should render radio group', () => {
      const { getByTestId } = render(<UnitsModal {...defaultProps} />);
      expect(getByTestId('radio-group')).toBeTruthy();
    });

    it('should have clickable metric option', () => {
      const { getByTestId } = render(<UnitsModal {...defaultProps} />);
      const metricRadio = getByTestId('units-metric-radio');
      expect(metricRadio.props.onPress).toBeDefined();
    });

    it('should have clickable imperial option', () => {
      const { getByTestId } = render(<UnitsModal {...defaultProps} />);
      const imperialRadio = getByTestId('units-imperial-radio');
      expect(imperialRadio.props.onPress).toBeDefined();
    });
  });
});
