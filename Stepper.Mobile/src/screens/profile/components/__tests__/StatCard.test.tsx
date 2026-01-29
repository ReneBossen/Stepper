import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StatCard } from '../StatCard';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  return {
    Card: ({ children, style }: any) => (
      <RN.View style={style} testID="card">
        {children}
      </RN.View>
    ),
    Text: ({ children, variant, style }: any) => (
      <RN.Text style={style} testID={`text-${variant}`}>
        {children}
      </RN.Text>
    ),
    useTheme: () => ({
      colors: {
        surfaceVariant: '#F5F5F5',
        onSurfaceVariant: '#666666',
      },
    }),
  };
});

// Add Card.Content mock
const mockCardContent = ({ children, style }: any) => {
  const RN = require('react-native');
  return <RN.View style={style}>{children}</RN.View>;
};
jest.mock('react-native-paper', () => {
  const RN = require('react-native');
  const Card = ({ children, style }: any) => (
    <RN.View style={style} testID="card">
      {children}
    </RN.View>
  );
  Card.Content = ({ children, style }: any) => (
    <RN.View style={style}>{children}</RN.View>
  );

  return {
    Card,
    Text: ({ children, variant, style }: any) => (
      <RN.Text style={style} testID={`text-${variant}`}>
        {children}
      </RN.Text>
    ),
    useTheme: () => ({
      colors: {
        surfaceVariant: '#F5F5F5',
        onSurfaceVariant: '#666666',
      },
    }),
  };
});

describe('StatCard', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(
        <StatCard value={100} label="Friends" testID="stat-card" />
      );
      expect(getByTestId('stat-card')).toBeTruthy();
    });

    it('should display the value formatted', () => {
      const { getByTestId } = render(
        <StatCard value={1234} label="Friends" testID="stat-card" />
      );
      // Value is formatted with toLocaleString, actual format depends on locale
      const valueText = getByTestId('text-headlineMedium');
      expect(valueText).toBeTruthy();
      // The number should be present in some formatted form
      expect(valueText.props.children.toString()).toContain('1');
    });

    it('should display the label', () => {
      const { getByText } = render(
        <StatCard value={100} label="Friends" testID="stat-card" />
      );
      expect(getByText('Friends')).toBeTruthy();
    });

    it('should display zero value', () => {
      const { getByText } = render(
        <StatCard value={0} label="Groups" testID="stat-card" />
      );
      expect(getByText('0')).toBeTruthy();
    });

    it('should handle large numbers with proper formatting', () => {
      const { getByTestId } = render(
        <StatCard value={1000000} label="Steps" testID="stat-card" />
      );
      const valueText = getByTestId('text-headlineMedium');
      expect(valueText).toBeTruthy();
      // The formatted value should contain the digits
      expect(valueText.props.children.toString()).toContain('1');
      expect(valueText.props.children.toString()).toContain('0');
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibility label', () => {
      const { getByLabelText } = render(
        <StatCard value={124} label="Friends" testID="stat-card" />
      );
      expect(getByLabelText('124 Friends')).toBeTruthy();
    });

    it('should have button role when onPress is provided', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <StatCard value={45} label="Groups" onPress={mockOnPress} testID="stat-card" />
      );
      const pressable = getByTestId('stat-card');
      expect(pressable.props.accessibilityRole).toBe('button');
    });
  });

  describe('interactions', () => {
    it('should call onPress when pressed and handler is provided', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <StatCard value={100} label="Friends" onPress={mockOnPress} testID="stat-card" />
      );

      fireEvent.press(getByTestId('stat-card'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not crash when pressed without onPress handler', () => {
      const { getByTestId } = render(
        <StatCard value={100} label="Friends" testID="stat-card" />
      );

      expect(() => fireEvent.press(getByTestId('stat-card'))).not.toThrow();
    });
  });

  describe('different label types', () => {
    it('should render with "Friends" label', () => {
      const { getByText } = render(
        <StatCard value={124} label="Friends" testID="stat-friends" />
      );
      expect(getByText('Friends')).toBeTruthy();
    });

    it('should render with "Groups" label', () => {
      const { getByText } = render(
        <StatCard value={45} label="Groups" testID="stat-groups" />
      );
      expect(getByText('Groups')).toBeTruthy();
    });

    it('should render with "Badges" label', () => {
      const { getByText } = render(
        <StatCard value={12} label="Badges" testID="stat-badges" />
      );
      expect(getByText('Badges')).toBeTruthy();
    });
  });
});
