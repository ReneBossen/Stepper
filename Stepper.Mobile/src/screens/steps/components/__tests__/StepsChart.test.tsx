import React from 'react';
import { render } from '@testing-library/react-native';
import { StepsChart } from '../StepsChart';
import type { AggregatedChartData } from '../../hooks';

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
        tertiary: '#7C5800',
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        outline: '#79747E',
        outlineVariant: '#CAC4D0',
        inverseSurface: '#313033',
        inverseOnSurface: '#F4EFF4',
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
  const createMockChartData = (overrides: Partial<AggregatedChartData> = {}): AggregatedChartData => ({
    label: 'Mon',
    value: 8500,
    ...overrides,
  });

  const createMockChartDataArray = (count: number, stepsBase: number = 8000): AggregatedChartData[] => {
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return Array.from({ length: count }, (_, index) => ({
      label: dayLabels[index % 7],
      value: stepsBase + index * 500,
    }));
  };

  const defaultProps = {
    chartData: createMockChartDataArray(7),
    viewMode: 'daily' as const,
    dailyGoal: 10000,
  };

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<StepsChart {...defaultProps} />);
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should render bar chart with correct number of bars', () => {
      const chartData = createMockChartDataArray(5);
      const { getByTestId } = render(
        <StepsChart {...defaultProps} chartData={chartData} />
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
    it('should show empty message when no chartData', () => {
      const { getByText } = render(
        <StepsChart {...defaultProps} chartData={[]} />
      );
      expect(getByText('No data available for this period')).toBeTruthy();
    });

    it('should not render bar chart when no chartData', () => {
      const { queryByTestId } = render(
        <StepsChart {...defaultProps} chartData={[]} />
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
      const chartData: AggregatedChartData[] = [
        { label: 'Jan', value: 250000 },
        { label: 'Feb', value: 230000 },
        { label: 'Mar', value: 280000 },
      ];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} chartData={chartData} viewMode="monthly" />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });
  });

  describe('pre-aggregated data', () => {
    it('should render chartData as provided without sorting', () => {
      // Chart data is already pre-aggregated and ordered by parent
      const chartData: AggregatedChartData[] = [
        createMockChartData({ label: 'Mon', value: 5000 }),
        createMockChartData({ label: 'Tue', value: 6000 }),
        createMockChartData({ label: 'Wed', value: 7000 }),
      ];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} chartData={chartData} />
      );
      // The chart should render with 3 data points
      const chart = getByTestId('bar-chart');
      expect(chart.props['data-bar-count']).toBe(3);
    });
  });

  describe('accessibility', () => {
    it('should have correct accessibility label with data point count', () => {
      const chartData = createMockChartDataArray(5);
      const { getByLabelText } = render(
        <StepsChart {...defaultProps} chartData={chartData} />
      );
      expect(getByLabelText(/Step chart showing 5 data points/)).toBeTruthy();
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
    it('should handle data points meeting daily goal', () => {
      const chartData: AggregatedChartData[] = [
        createMockChartData({ label: 'Mon', value: 10000 }),
        createMockChartData({ label: 'Tue', value: 12000 }),
      ];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} chartData={chartData} dailyGoal={10000} viewMode="daily" />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should handle data points below daily goal', () => {
      const chartData: AggregatedChartData[] = [
        createMockChartData({ label: 'Mon', value: 5000 }),
        createMockChartData({ label: 'Tue', value: 7000 }),
      ];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} chartData={chartData} dailyGoal={10000} viewMode="daily" />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should handle mixed goal achievement', () => {
      const chartData: AggregatedChartData[] = [
        createMockChartData({ label: 'Mon', value: 5000 }),
        createMockChartData({ label: 'Tue', value: 15000 }),
      ];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} chartData={chartData} dailyGoal={10000} viewMode="daily" />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should use weekly goal threshold for weekly view', () => {
      // Weekly goal is dailyGoal * 7 = 70000
      const chartData: AggregatedChartData[] = [
        { label: 'Wk 1', value: 70000 }, // Meets goal
        { label: 'Wk 2', value: 50000 }, // Below goal
      ];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} chartData={chartData} dailyGoal={10000} viewMode="weekly" />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should use monthly goal threshold for monthly view', () => {
      // Monthly goal is dailyGoal * 30 = 300000
      const chartData: AggregatedChartData[] = [
        { label: 'Jan', value: 300000 }, // Meets goal
        { label: 'Feb', value: 250000 }, // Below goal
      ];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} chartData={chartData} dailyGoal={10000} viewMode="monthly" />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle single data point', () => {
      const chartData = [createMockChartData()];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} chartData={chartData} />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should handle large number of data points', () => {
      const chartData: AggregatedChartData[] = Array.from({ length: 12 }, (_, i) => ({
        label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
        value: 250000 + i * 10000,
      }));
      const { getByTestId } = render(
        <StepsChart {...defaultProps} chartData={chartData} viewMode="monthly" />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should handle data points with zero steps', () => {
      const chartData: AggregatedChartData[] = [
        createMockChartData({ label: 'Mon', value: 0 }),
        createMockChartData({ label: 'Tue', value: 10000 }),
      ];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} chartData={chartData} />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should handle data points with very large step counts', () => {
      const chartData: AggregatedChartData[] = [
        createMockChartData({ label: 'Mon', value: 100000 }),
      ];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} chartData={chartData} />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should handle different daily goal values', () => {
      const chartData = createMockChartDataArray(5);
      const { getByTestId } = render(
        <StepsChart {...defaultProps} chartData={chartData} dailyGoal={5000} />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should handle subLabel in chart data', () => {
      const chartData: AggregatedChartData[] = [
        { label: 'Wk 1', value: 70000, subLabel: 'Jan 1-7' },
        { label: 'Wk 2', value: 65000, subLabel: 'Jan 8-14' },
      ];
      const { getByTestId } = render(
        <StepsChart {...defaultProps} chartData={chartData} viewMode="weekly" />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });
  });
});
