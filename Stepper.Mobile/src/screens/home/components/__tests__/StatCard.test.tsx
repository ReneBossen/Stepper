import React from 'react';
import { render } from '@testing-library/react-native';
import { StatCard } from '../StatCard';

// Mock react-native-paper
jest.mock('react-native-paper', () => ({
  Card: ({ children, style, testID, ...props }: any) => {
    const RN = require('react-native');
    return <RN.View {...props} testID={testID} style={style}>{children}</RN.View>;
  },
  Text: ({ children, style, variant, ...props }: any) => {
    const RN = require('react-native');
    return <RN.Text {...props} style={style}>{children}</RN.Text>;
  },
  useTheme: () => ({
    colors: {
      surface: '#FFF',
      onSurface: '#000',
      onSurfaceVariant: '#666',
    },
  }),
}));

// Add Card.Content
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  const Card = ({ children, style, testID, ...props }: any) => (
    <RN.View {...props} testID={testID} style={style}>{children}</RN.View>
  );
  Card.Content = ({ children, style, ...props }: any) => (
    <RN.View {...props} style={style}>{children}</RN.View>
  );

  return {
    Card,
    Text: ({ children, style, variant, ...props }: any) => (
      <RN.Text {...props} style={style}>{children}</RN.Text>
    ),
    useTheme: () => ({
      colors: {
        surface: '#FFF',
        onSurface: '#000',
        onSurfaceVariant: '#666',
      },
    }),
  };
});

describe('StatCard', () => {
  it('should render title and value', () => {
    const { getByText } = render(
      <StatCard title="Weekly Average" value={9234} />
    );

    expect(getByText('Weekly Average')).toBeTruthy();
    // Check for formatted value (locale-independent check)
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

    // Check for formatted value (locale-independent check)
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
    // Should not have subtitle text
    expect(queryByText('steps')).toBeNull();
  });
});
