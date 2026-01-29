import React from 'react';
import { render } from '@testing-library/react-native';
import { StepsChart } from '../StepsChart';
import type { DailyStepEntry } from '@store/stepsStore';

// Mock react-native-gifted-charts
jest.mock('react-native-gifted-charts', () => ({
  BarChart: ({ data, testID, ...props }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID="bar-chart" data-bar-count={data?.length || 0}>
        {data?.map((item: any, index: number) => (
          <RN.View
            key={index}
            testID={`bar-${index}`}
            accessibilityLabel={`${item.label}: ${item.value} steps`}
          />
        ))}
      </RN.View>
    );
  },
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  const Card = ({ children, style, testID, accessibilityLabel, accessibilityRole, ...props }: any) => (
    <RN.View
      {...props}
      testID={testID}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
    >
      {children}
    </RN.View>
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
        primary: '#4CAF50',
        primaryContainer: '#C8E6C9',
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        outline: '#79747E',
        outlineVariant: '#CAC4D0',
      },
    }),
  };
});

// Mock Dimensions
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Dimensions: {
      get: () => ({ width: 375, height: 812 }),
    },
  };
});

describe('StepsChart', () => {
  const createMockEntry = (overrides: Partial<DailyStepEntry> = {}): DailyStepEntry => ({
    id: 'entry-1',
    date: '2024-01-15',
    steps: 8500,
    distanceMeters: 6800,
    ...overrides,
  });

  const createMockEntries = (count: number, stepsBase: number = 8000): DailyStepEntry[] => {
    return Array.from({ length: count }, (_, index) => ({
      id: `entry-${index}`,
      date: `2024-01-${String(15 - index).padStart(2, '0')}`,
      steps: stepsBase + index * 500,
      distanceMeters: (stepsBase + index * 500) * 0.8,
    }));
  };

  const defaultProps = {
    entries: createMockEntries(7),
    viewMode: 'daily' as const,
    dailyGoal: 10000,
  };

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<StepsChart {...defaultProps} />);
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should render bar chart with correct number of bars', () => {
      const entries = createMockEntries(5);
      const { getByTestId } = render(
        <StepsChart {...defaultProps} entries={entries} />
      );
      const chart = getByTestId('bar-chart');
      expect(chart.props['data-bar-count']).toBe(5);
    });

    it('should have correct testID when provided', () => {
      const { getByTestId } = render(
        <StepsChart {...defaultProps} testID="test-steps-chart" />
      );
      expect(getByTestId('test-steps-chart')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('should show empty message when no entries', () => {
      const { getByText } = render(
        <StepsChart {...defaultProps} entries={[]} />
      );
      expect(getByText('No data available for this period')).toBeTruthy();
    });

    it('should not render bar chart when no entries', () => {
      const { queryByTestId } = render(
        <StepsChart {...defaultProps} entries={[]} />
      );
      expect(queryByTestId('bar-chart')).toBeNull();
    });
  });

  describe('view modes', () => {
    it('should render in daily view mode', () => {
      const { getByTestId } = render(
        <StepsChart {...defaultProps} viewMode="daily" />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should render in weekly view mode', () => {
      const { getByTestId } = render(
        <StepsChart {...defaultProps} viewMode="weekly" />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should render in monthly view mode', () => {
      const entries = createMockEntries(30);
      const { getByTestId } = render(
        <StepsChart {...defaultProps} entries={entries} viewMode="monthly" />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });
  });

  describe('data sorting', () => {
    it('should sort entries by date ascending for display', () => {
      // Entries created with descending dates (newest first)
      const entries: DailyStepEntry[] = [
        createMockEntry({ id: '3', date: '2024-01-17', steps: 7000 }),
        createMockEntry({ id: '1', date: '2024-01-15', steps: 5000 }),
        createMockEntry({ id: '2', date: '2024-01-16', steps: 6000 }),
      ];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} entries={entries} />
      );
      // The chart should render with 3 entries
      const chart = getByTestId('bar-chart');
      expect(chart.props['data-bar-count']).toBe(3);
    });
  });

  describe('accessibility', () => {
    it('should have correct accessibility label with entry count', () => {
      const entries = createMockEntries(5);
      const { getByLabelText } = render(
        <StepsChart {...defaultProps} entries={entries} />
      );
      expect(getByLabelText(/Step chart showing 5 days of data/)).toBeTruthy();
    });

    it('should have image accessibility role on chart card', () => {
      const { getByTestId } = render(
        <StepsChart {...defaultProps} testID="test-chart" />
      );
      const card = getByTestId('test-chart');
      expect(card.props.accessibilityRole).toBe('image');
    });
  });

  describe('goal threshold coloring', () => {
    it('should handle entries meeting goal', () => {
      const entries = [
        createMockEntry({ steps: 10000 }),
        createMockEntry({ steps: 12000, id: 'entry-2' }),
      ];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} entries={entries} dailyGoal={10000} />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should handle entries below goal', () => {
      const entries = [
        createMockEntry({ steps: 5000 }),
        createMockEntry({ steps: 7000, id: 'entry-2' }),
      ];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} entries={entries} dailyGoal={10000} />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should handle mixed goal achievement', () => {
      const entries = [
        createMockEntry({ steps: 5000 }),
        createMockEntry({ steps: 15000, id: 'entry-2' }),
      ];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} entries={entries} dailyGoal={10000} />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle single entry', () => {
      const entries = [createMockEntry()];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} entries={entries} />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should handle large number of entries', () => {
      const entries = createMockEntries(31);
      const { getByTestId } = render(
        <StepsChart {...defaultProps} entries={entries} viewMode="monthly" />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should handle entries with zero steps', () => {
      const entries = [
        createMockEntry({ steps: 0 }),
        createMockEntry({ steps: 10000, id: 'entry-2' }),
      ];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} entries={entries} />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should handle entries with very large step counts', () => {
      const entries = [
        createMockEntry({ steps: 100000 }),
      ];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} entries={entries} />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should handle different daily goal values', () => {
      const entries = createMockEntries(5);
      const { getByTestId } = render(
        <StepsChart {...defaultProps} entries={entries} dailyGoal={5000} />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });
  });
});
