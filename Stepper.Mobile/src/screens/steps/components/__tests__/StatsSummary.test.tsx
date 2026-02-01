import React from 'react';
import { render } from '@testing-library/react-native';
import { StatsSummary } from '../StatsSummary';
import type { ChartStats } from '../StatsSummary';

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
        secondary: '#2196F3',
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
      },
    }),
  };
});

describe('StatsSummary', () => {
  const createMockStats = (overrides?: Partial<ChartStats>): ChartStats => ({
    total: 50000,
    average: 7143,
    distanceMeters: 35000,
    ...overrides,
  });

  const defaultProps = {
    stats: createMockStats(),
    periodLabel: 'Jan 9 - Jan 15, 2024',
    units: 'metric' as const,
  };

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByText } = render(<StatsSummary {...defaultProps} />);
      expect(getByText('Total steps')).toBeTruthy();
    });

    it('should render period label', () => {
      const { getByText } = render(<StatsSummary {...defaultProps} />);
      expect(getByText('Jan 9 - Jan 15, 2024')).toBeTruthy();
    });

    it('should render total steps label', () => {
      const { getByText } = render(<StatsSummary {...defaultProps} />);
      expect(getByText('Total steps')).toBeTruthy();
    });

    it('should render daily average label', () => {
      const { getByText } = render(<StatsSummary {...defaultProps} />);
      expect(getByText('Daily average')).toBeTruthy();
    });

    it('should render distance label', () => {
      const { getByText } = render(<StatsSummary {...defaultProps} />);
      expect(getByText('Distance')).toBeTruthy();
    });

    it('should have correct testID when provided', () => {
      const { getByTestId } = render(
        <StatsSummary {...defaultProps} testID="test-stats-summary" />
      );
      expect(getByTestId('test-stats-summary')).toBeTruthy();
    });
  });

  describe('displaying stats', () => {
    it('should display total steps correctly', () => {
      const stats = createMockStats({ total: 20000 });
      const { getByText } = render(
        <StatsSummary {...defaultProps} stats={stats} />
      );
      expect(getByText((20000).toLocaleString())).toBeTruthy();
    });

    it('should display daily average correctly', () => {
      const stats = createMockStats({ average: 8000 });
      const { getByText } = render(
        <StatsSummary {...defaultProps} stats={stats} />
      );
      expect(getByText((8000).toLocaleString())).toBeTruthy();
    });

    it('should display distance correctly for metric units', () => {
      const stats = createMockStats({ distanceMeters: 8000 });
      const { getByText } = render(
        <StatsSummary {...defaultProps} stats={stats} units="metric" />
      );
      // 8000 / 1000 = 8.0 km
      expect(getByText('8.0 km')).toBeTruthy();
    });

    it('should display distance correctly for imperial units', () => {
      const stats = createMockStats({ distanceMeters: 16000 });
      const { getByText } = render(
        <StatsSummary {...defaultProps} stats={stats} units="imperial" />
      );
      // 16000 / 1609.344 ~= 9.9 mi
      expect(getByText('9.9 mi')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('should handle zero stats', () => {
      const stats = createMockStats({ total: 0, average: 0, distanceMeters: 0 });
      const { getAllByText } = render(
        <StatsSummary {...defaultProps} stats={stats} />
      );
      // Multiple zeros will be present (total and average)
      expect(getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });

    it('should show zero average for empty stats', () => {
      const stats = createMockStats({ total: 0, average: 0, distanceMeters: 0 });
      const { getAllByText } = render(
        <StatsSummary {...defaultProps} stats={stats} />
      );
      // Multiple zeros will be present
      expect(getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });

    it('should show zero distance for empty stats', () => {
      const stats = createMockStats({ total: 0, average: 0, distanceMeters: 0 });
      const { getByText } = render(
        <StatsSummary {...defaultProps} stats={stats} units="metric" />
      );
      expect(getByText('0.0 km')).toBeTruthy();
    });
  });

  describe('period label formatting', () => {
    it('should display period label with different months', () => {
      const { getByText } = render(
        <StatsSummary
          {...defaultProps}
          periodLabel="Jan 28 - Feb 3, 2024"
        />
      );
      expect(getByText('Jan 28 - Feb 3, 2024')).toBeTruthy();
    });

    it('should display period label with same month', () => {
      const { getByText } = render(
        <StatsSummary
          {...defaultProps}
          periodLabel="Mar 1 - Mar 15, 2024"
        />
      );
      expect(getByText('Mar 1 - Mar 15, 2024')).toBeTruthy();
    });

    it('should display period label for weekly view', () => {
      const { getByText } = render(
        <StatsSummary
          {...defaultProps}
          periodLabel="Week 1, 2024"
        />
      );
      expect(getByText('Week 1, 2024')).toBeTruthy();
    });

    it('should display period label for monthly view', () => {
      const { getByText } = render(
        <StatsSummary
          {...defaultProps}
          periodLabel="January 2024"
        />
      );
      expect(getByText('January 2024')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have correct accessibility label', () => {
      const stats = createMockStats({ total: 10000, average: 10000, distanceMeters: 8000 });
      const { getByLabelText } = render(
        <StatsSummary
          {...defaultProps}
          stats={stats}
          periodLabel="Jan 15, 2024"
        />
      );
      expect(
        getByLabelText(/Period:.*Total:.*Average:.*Distance:/)
      ).toBeTruthy();
    });

    it('should have text accessibility role on card', () => {
      const { getByTestId } = render(
        <StatsSummary {...defaultProps} testID="test-stats" />
      );
      const card = getByTestId('test-stats');
      expect(card.props.accessibilityRole).toBe('text');
    });
  });

  describe('edge cases', () => {
    it('should handle same total and average (single day)', () => {
      const stats = createMockStats({ total: 12000, average: 12000 });
      const { getAllByText } = render(
        <StatsSummary {...defaultProps} stats={stats} />
      );
      // Total and average should be the same, so we expect two instances
      expect(getAllByText((12000).toLocaleString()).length).toBe(2);
    });

    it('should handle large step counts', () => {
      const stats = createMockStats({ total: 200000 });
      const { getByText } = render(
        <StatsSummary {...defaultProps} stats={stats} />
      );
      expect(getByText((200000).toLocaleString())).toBeTruthy();
    });

    it('should handle zero total with non-zero average', () => {
      // This is an edge case that shouldn't happen in practice
      const stats = createMockStats({ total: 0, average: 5000 });
      const { getByText } = render(
        <StatsSummary {...defaultProps} stats={stats} />
      );
      expect(getByText((5000).toLocaleString())).toBeTruthy();
    });

    it('should handle very small distance values', () => {
      const stats = createMockStats({ distanceMeters: 100 });
      const { getByText } = render(
        <StatsSummary {...defaultProps} stats={stats} units="metric" />
      );
      // 100 / 1000 = 0.1 km
      expect(getByText('0.1 km')).toBeTruthy();
    });

    it('should handle very large distance values', () => {
      const stats = createMockStats({ distanceMeters: 100000 });
      const { getByText } = render(
        <StatsSummary {...defaultProps} stats={stats} units="metric" />
      );
      // 100000 / 1000 = 100.0 km
      expect(getByText('100.0 km')).toBeTruthy();
    });
  });
});
