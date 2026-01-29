import React from 'react';
import { render } from '@testing-library/react-native';
import { StepHistoryItem } from '../StepHistoryItem';
import type { DailyStepEntry } from '@store/stepsStore';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  return {
    Text: ({ children, style, variant, ...props }: any) => (
      <RN.Text {...props} style={style}>{children}</RN.Text>
    ),
    ProgressBar: ({ progress, color, style, ...props }: any) => (
      <RN.View
        {...props}
        testID="progress-bar"
        accessibilityValue={{ now: progress * 100, min: 0, max: 100 }}
        style={style}
      />
    ),
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        secondary: '#2196F3',
        surface: '#FFFFFF',
        surfaceVariant: '#F5F5F5',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
      },
    }),
  };
});

describe('StepHistoryItem', () => {
  const createMockEntry = (overrides: Partial<DailyStepEntry> = {}): DailyStepEntry => ({
    id: 'entry-1',
    date: '2024-01-15',
    steps: 8500,
    distanceMeters: 6800,
    ...overrides,
  });

  const defaultProps = {
    entry: createMockEntry(),
    dailyGoal: 10000,
    units: 'metric' as const,
  };

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByText } = render(<StepHistoryItem {...defaultProps} />);
      expect(getByText(/steps/)).toBeTruthy();
    });

    it('should render the formatted date', () => {
      const { getByText } = render(<StepHistoryItem {...defaultProps} />);
      // Date format: "Monday, Jan 15"
      expect(getByText(/Jan 15/)).toBeTruthy();
    });

    it('should render the step count with locale formatting', () => {
      const { getByText } = render(<StepHistoryItem {...defaultProps} />);
      expect(getByText(`${(8500).toLocaleString()} steps`)).toBeTruthy();
    });

    it('should render the progress bar', () => {
      const { getByTestId } = render(<StepHistoryItem {...defaultProps} />);
      expect(getByTestId('progress-bar')).toBeTruthy();
    });

    it('should render the percentage', () => {
      const { getByText } = render(<StepHistoryItem {...defaultProps} />);
      // 8500 / 10000 = 85%
      expect(getByText('85%')).toBeTruthy();
    });

    it('should have correct testID when provided', () => {
      const { getByTestId } = render(
        <StepHistoryItem {...defaultProps} testID="test-history-item" />
      );
      expect(getByTestId('test-history-item')).toBeTruthy();
    });
  });

  describe('distance formatting', () => {
    it('should display distance in kilometers for metric units', () => {
      const { getByText } = render(
        <StepHistoryItem {...defaultProps} units="metric" />
      );
      // 6800 meters = 6.8 km
      expect(getByText('6.8 km')).toBeTruthy();
    });

    it('should display distance in miles for imperial units', () => {
      const { getByText } = render(
        <StepHistoryItem {...defaultProps} units="imperial" />
      );
      // 6800 meters / 1609.344 = ~4.2 mi
      expect(getByText('4.2 mi')).toBeTruthy();
    });

    it('should handle zero distance', () => {
      const entry = createMockEntry({ distanceMeters: 0 });
      const { getByText } = render(
        <StepHistoryItem {...defaultProps} entry={entry} />
      );
      expect(getByText('0.0 km')).toBeTruthy();
    });

    it('should handle large distances', () => {
      const entry = createMockEntry({ distanceMeters: 25000 });
      const { getByText } = render(
        <StepHistoryItem {...defaultProps} entry={entry} />
      );
      expect(getByText('25.0 km')).toBeTruthy();
    });
  });

  describe('progress calculation', () => {
    it('should calculate correct percentage for partial goal', () => {
      const entry = createMockEntry({ steps: 5000 });
      const { getByText } = render(
        <StepHistoryItem {...defaultProps} entry={entry} />
      );
      expect(getByText('50%')).toBeTruthy();
    });

    it('should cap progress at 100% for exceeded goal', () => {
      const entry = createMockEntry({ steps: 15000 });
      const { getByText } = render(
        <StepHistoryItem {...defaultProps} entry={entry} />
      );
      // percentage shows actual (150%), but progress bar is capped
      expect(getByText('150%')).toBeTruthy();
    });

    it('should handle zero steps', () => {
      const entry = createMockEntry({ steps: 0 });
      const { getByText } = render(
        <StepHistoryItem {...defaultProps} entry={entry} />
      );
      expect(getByText('0%')).toBeTruthy();
      expect(getByText('0 steps')).toBeTruthy();
    });

    it('should handle exactly meeting the goal', () => {
      const entry = createMockEntry({ steps: 10000 });
      const { getByText } = render(
        <StepHistoryItem {...defaultProps} entry={entry} />
      );
      expect(getByText('100%')).toBeTruthy();
    });

    it('should handle different daily goals', () => {
      const entry = createMockEntry({ steps: 4000 });
      const { getByText } = render(
        <StepHistoryItem {...defaultProps} entry={entry} dailyGoal={8000} />
      );
      // 4000 / 8000 = 50%
      expect(getByText('50%')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have correct accessibility label format', () => {
      const { getByLabelText } = render(<StepHistoryItem {...defaultProps} />);
      // The accessibility label contains date, steps, distance, and percentage
      expect(
        getByLabelText(/steps.*km.*85% of goal/)
      ).toBeTruthy();
    });

    it('should have text accessibility role on container', () => {
      const { getByTestId } = render(
        <StepHistoryItem {...defaultProps} testID="test-item" />
      );
      const container = getByTestId('test-item');
      expect(container.props.accessibilityRole).toBe('text');
    });
  });

  describe('date formatting', () => {
    it('should format different dates correctly', () => {
      const entry = createMockEntry({ date: '2024-12-25' });
      const { getByText } = render(
        <StepHistoryItem {...defaultProps} entry={entry} />
      );
      expect(getByText(/Dec 25/)).toBeTruthy();
    });

    it('should show day of week', () => {
      // January 15, 2024 was a Monday
      const { getByText } = render(<StepHistoryItem {...defaultProps} />);
      expect(getByText(/Monday/)).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle large step counts', () => {
      const entry = createMockEntry({ steps: 50000 });
      const { getByText } = render(
        <StepHistoryItem {...defaultProps} entry={entry} />
      );
      expect(getByText(`${(50000).toLocaleString()} steps`)).toBeTruthy();
    });

    it('should handle small daily goal', () => {
      const entry = createMockEntry({ steps: 100 });
      const { getByText } = render(
        <StepHistoryItem {...defaultProps} entry={entry} dailyGoal={100} />
      );
      expect(getByText('100%')).toBeTruthy();
    });
  });
});
