import React from 'react';
import { render } from '@testing-library/react-native';
import { StatsSummary } from '../StatsSummary';
import type { DailyStepEntry } from '@store/stepsStore';

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
    dateRange: {
      start: new Date('2024-01-09'),
      end: new Date('2024-01-15'),
    },
    units: 'metric' as const,
  };

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByText } = render(<StatsSummary {...defaultProps} />);
      expect(getByText('Total steps')).toBeTruthy();
    });

    it('should render date range', () => {
      const { getByText } = render(<StatsSummary {...defaultProps} />);
      expect(getByText(/Jan 9 - Jan 15/)).toBeTruthy();
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

  describe('calculations', () => {
    it('should calculate total steps correctly', () => {
      const entries = [
        createMockEntry({ steps: 5000 }),
        createMockEntry({ steps: 7000, id: 'entry-2' }),
        createMockEntry({ steps: 8000, id: 'entry-3' }),
      ];
      const { getByText } = render(
        <StatsSummary
          {...defaultProps}
          entries={entries}
        />
      );
      // 5000 + 7000 + 8000 = 20000
      expect(getByText((20000).toLocaleString())).toBeTruthy();
    });

    it('should calculate daily average correctly', () => {
      const entries = [
        createMockEntry({ steps: 6000 }),
        createMockEntry({ steps: 8000, id: 'entry-2' }),
        createMockEntry({ steps: 10000, id: 'entry-3' }),
      ];
      const { getByText } = render(
        <StatsSummary
          {...defaultProps}
          entries={entries}
        />
      );
      // (6000 + 8000 + 10000) / 3 = 8000
      expect(getByText((8000).toLocaleString())).toBeTruthy();
    });

    it('should calculate total distance correctly for metric', () => {
      const entries = [
        createMockEntry({ distanceMeters: 5000 }),
        createMockEntry({ distanceMeters: 3000, id: 'entry-2' }),
      ];
      const { getByText } = render(
        <StatsSummary
          {...defaultProps}
          entries={entries}
          units="metric"
        />
      );
      // (5000 + 3000) / 1000 = 8.0 km
      expect(getByText('8.0 km')).toBeTruthy();
    });

    it('should calculate total distance correctly for imperial', () => {
      const entries = [
        createMockEntry({ distanceMeters: 8000 }),
        createMockEntry({ distanceMeters: 8000, id: 'entry-2' }),
      ];
      const { getByText } = render(
        <StatsSummary
          {...defaultProps}
          entries={entries}
          units="imperial"
        />
      );
      // 16000 / 1609.344 ~= 9.9 mi
      expect(getByText('9.9 mi')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('should handle empty entries array', () => {
      const { getAllByText } = render(
        <StatsSummary
          {...defaultProps}
          entries={[]}
        />
      );
      // Multiple zeros will be present (total and average)
      expect(getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });

    it('should show zero average for empty entries', () => {
      const { getAllByText } = render(
        <StatsSummary
          {...defaultProps}
          entries={[]}
        />
      );
      // Multiple zeros will be present
      expect(getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });

    it('should show zero distance for empty entries', () => {
      const { getByText } = render(
        <StatsSummary
          {...defaultProps}
          entries={[]}
          units="metric"
        />
      );
      expect(getByText('0.0 km')).toBeTruthy();
    });
  });

  describe('date range formatting', () => {
    it('should format date range with different months', () => {
      const { getByText } = render(
        <StatsSummary
          {...defaultProps}
          dateRange={{
            start: new Date('2024-01-28'),
            end: new Date('2024-02-03'),
          }}
        />
      );
      expect(getByText(/Jan 28 - Feb 3/)).toBeTruthy();
    });

    it('should format same month date range', () => {
      const { getByText } = render(
        <StatsSummary
          {...defaultProps}
          dateRange={{
            start: new Date('2024-03-01'),
            end: new Date('2024-03-15'),
          }}
        />
      );
      expect(getByText(/Mar 1 - Mar 15/)).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have correct accessibility label', () => {
      const entries = [
        createMockEntry({ steps: 10000, distanceMeters: 8000 }),
      ];
      const { getByLabelText } = render(
        <StatsSummary
          {...defaultProps}
          entries={entries}
          dateRange={{
            start: new Date('2024-01-15'),
            end: new Date('2024-01-15'),
          }}
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
    it('should handle single entry', () => {
      const entries = [createMockEntry({ steps: 12000 })];
      const { getAllByText } = render(
        <StatsSummary
          {...defaultProps}
          entries={entries}
        />
      );
      // Total and average should be the same, so we expect two instances
      expect(getAllByText((12000).toLocaleString()).length).toBe(2);
    });

    it('should handle large step counts', () => {
      const entries = [
        createMockEntry({ steps: 100000 }),
        createMockEntry({ steps: 100000, id: 'entry-2' }),
      ];
      const { getByText } = render(
        <StatsSummary
          {...defaultProps}
          entries={entries}
        />
      );
      expect(getByText((200000).toLocaleString())).toBeTruthy();
    });

    it('should handle entries with zero steps', () => {
      const entries = [
        createMockEntry({ steps: 0 }),
        createMockEntry({ steps: 10000, id: 'entry-2' }),
      ];
      const { getByText } = render(
        <StatsSummary
          {...defaultProps}
          entries={entries}
        />
      );
      // Average should be 5000
      expect(getByText((5000).toLocaleString())).toBeTruthy();
    });
  });
});
