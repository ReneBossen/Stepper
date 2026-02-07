import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StatCard } from '../StatCard';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  const Card = ({ children, style, testID, ...props }: any) => (
    <RN.View {...props} testID={testID} style={style}>
      {children}
    </RN.View>
  );
  Card.Content = ({ children, style, ...props }: any) => (
    <RN.View {...props} style={style}>
      {children}
    </RN.View>
  );

  return {
    Card,
    Text: ({ children, style, variant, ...props }: any) => (
      <RN.Text {...props} style={style} testID={`text-${variant}`}>
        {children}
      </RN.Text>
    ),
    useTheme: () => ({
      colors: {
        surface: '#FFF',
        surfaceVariant: '#F5F5F5',
        onSurface: '#000',
        onSurfaceVariant: '#666',
      },
    }),
  };
});

describe('StatCard', () => {
  describe('elevated variant (default)', () => {
    it('should render title and value', () => {
      const { getByText } = render(
        <StatCard title="Weekly Average" value={9234} />
      );

      expect(getByText('Weekly Average')).toBeTruthy();
      expect(getByText((9234).toLocaleString())).toBeTruthy();
    });

    it('should render subtitle when provided', () => {
      const { getByText } = render(
        <StatCard title="Weekly Average" value={9234} subtitle="steps" />
      );

      expect(getByText('steps')).toBeTruthy();
    });

    it('should format number values with locale formatting', () => {
      const { getByText } = render(
        <StatCard title="Total" value={1234567} />
      );

      expect(getByText((1234567).toLocaleString())).toBeTruthy();
    });

    it('should handle string values', () => {
      const { getByText } = render(
        <StatCard title="Status" value="Active" />
      );

      expect(getByText('Active')).toBeTruthy();
    });

    it('should handle zero value', () => {
      const { getByText } = render(
        <StatCard title="Steps" value={0} />
      );

      expect(getByText('0')).toBeTruthy();
    });

    it('should have correct testID when provided', () => {
      const { getByTestId } = render(
        <StatCard title="Test" value={100} testID="test-card" />
      );

      expect(getByTestId('test-card')).toBeTruthy();
    });

    it('should handle negative values', () => {
      const { getByText } = render(
        <StatCard title="Difference" value={-500} />
      );

      expect(getByText('-500')).toBeTruthy();
    });

    it('should render without subtitle', () => {
      const { getByText, queryByText } = render(
        <StatCard title="Test" value={100} />
      );

      expect(getByText('Test')).toBeTruthy();
      expect(getByText('100')).toBeTruthy();
      expect(queryByText('steps')).toBeNull();
    });

    it('should use headlineSmall variant for value text', () => {
      const { getByTestId } = render(
        <StatCard title="Test" value={100} />
      );

      expect(getByTestId('text-headlineSmall')).toBeTruthy();
    });

    it('should have accessibility role text when not interactive', () => {
      const { getByTestId } = render(
        <StatCard title="Test" value={100} testID="test-card" />
      );

      const card = getByTestId('test-card');
      expect(card.props.accessibilityRole).toBe('text');
    });

    it('should have correct accessibility label with subtitle', () => {
      const { getByTestId } = render(
        <StatCard title="Weekly Average" value={9234} subtitle="steps" testID="test-card" />
      );

      const card = getByTestId('test-card');
      expect(card.props.accessibilityLabel).toBe(
        `Weekly Average: ${(9234).toLocaleString()} steps`
      );
    });

    it('should have correct accessibility label without subtitle', () => {
      const { getByTestId } = render(
        <StatCard title="Total" value={500} testID="test-card" />
      );

      const card = getByTestId('test-card');
      expect(card.props.accessibilityLabel).toBe('Total: 500');
    });
  });

  describe('flat variant', () => {
    it('should render value and title', () => {
      const { getByText } = render(
        <StatCard title="Friends" value={124} variant="flat" />
      );

      expect(getByText('Friends')).toBeTruthy();
      expect(getByText('124')).toBeTruthy();
    });

    it('should display zero value', () => {
      const { getByText } = render(
        <StatCard title="Groups" value={0} variant="flat" />
      );

      expect(getByText('0')).toBeTruthy();
    });

    it('should handle large numbers with proper formatting', () => {
      const { getByText } = render(
        <StatCard title="Steps" value={1000000} variant="flat" />
      );

      expect(getByText((1000000).toLocaleString())).toBeTruthy();
    });

    it('should use headlineMedium variant for value text', () => {
      const { getByTestId } = render(
        <StatCard title="Friends" value={100} variant="flat" />
      );

      expect(getByTestId('text-headlineMedium')).toBeTruthy();
    });

    it('should have correct testID when provided', () => {
      const { getByTestId } = render(
        <StatCard title="Friends" value={100} variant="flat" testID="stat-card" />
      );

      expect(getByTestId('stat-card')).toBeTruthy();
    });

    it('should have correct accessibility label', () => {
      const { getByTestId } = render(
        <StatCard title="Friends" value={124} variant="flat" testID="stat-card" />
      );

      const pressable = getByTestId('stat-card');
      expect(pressable.props.accessibilityLabel).toBe('Friends: 124');
    });

    it('should render with different titles', () => {
      const { getByText: getByText1 } = render(
        <StatCard title="Friends" value={124} variant="flat" />
      );
      expect(getByText1('Friends')).toBeTruthy();

      const { getByText: getByText2 } = render(
        <StatCard title="Groups" value={45} variant="flat" />
      );
      expect(getByText2('Groups')).toBeTruthy();

      const { getByText: getByText3 } = render(
        <StatCard title="Badges" value={12} variant="flat" />
      );
      expect(getByText3('Badges')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('should call onPress when pressed and handler is provided', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <StatCard
          title="Friends"
          value={100}
          variant="flat"
          onPress={mockOnPress}
          testID="stat-card"
        />
      );

      fireEvent.press(getByTestId('stat-card'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not crash when pressed without onPress handler (flat variant)', () => {
      const { getByTestId } = render(
        <StatCard title="Friends" value={100} variant="flat" testID="stat-card" />
      );

      expect(() => fireEvent.press(getByTestId('stat-card'))).not.toThrow();
    });

    it('should have button role when onPress is provided', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <StatCard
          title="Groups"
          value={45}
          variant="flat"
          onPress={mockOnPress}
          testID="stat-card"
        />
      );

      const pressable = getByTestId('stat-card');
      expect(pressable.props.accessibilityRole).toBe('button');
    });

    it('should not have button role when onPress is not provided (flat variant)', () => {
      const { getByTestId } = render(
        <StatCard title="Friends" value={100} variant="flat" testID="stat-card" />
      );

      const pressable = getByTestId('stat-card');
      expect(pressable.props.accessibilityRole).not.toBe('button');
    });

    it('should support onPress on elevated variant', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <StatCard
          title="Total"
          value={500}
          onPress={mockOnPress}
          testID="stat-card"
        />
      );

      fireEvent.press(getByTestId('stat-card'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should have button role when onPress is provided on elevated variant', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <StatCard
          title="Total"
          value={500}
          onPress={mockOnPress}
          testID="stat-card"
        />
      );

      const pressable = getByTestId('stat-card');
      expect(pressable.props.accessibilityRole).toBe('button');
    });
  });
});
