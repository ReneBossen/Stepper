import React from 'react';
import { render } from '@testing-library/react-native';
import { WeeklyActivityCard } from '../WeeklyActivityCard';
import type { WeeklyActivity } from '@store/userStore';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  const Card = ({ children, style, testID }: any) => (
    <RN.View style={style} testID={testID}>
      {children}
    </RN.View>
  );
  Card.Content = ({ children }: any) => <RN.View>{children}</RN.View>;

  return {
    Card,
    Text: ({ children, variant, style }: any) => (
      <RN.Text style={style} testID={`text-${variant}`}>
        {children}
      </RN.Text>
    ),
    useTheme: () => ({
      colors: {
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        primary: '#4CAF50',
        tertiary: '#FF9800',
      },
    }),
  };
});

describe('WeeklyActivityCard', () => {
  const mockActivity: WeeklyActivity = {
    total_steps: 64638,
    total_distance_meters: 51710,
    average_steps_per_day: 9234,
    current_streak: 12,
  };

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(
        <WeeklyActivityCard activity={mockActivity} testID="weekly-activity" />
      );
      expect(getByTestId('weekly-activity')).toBeTruthy();
    });

    it('should display the title', () => {
      const { getByText } = render(
        <WeeklyActivityCard activity={mockActivity} testID="weekly-activity" />
      );
      expect(getByText("This Week's Activity")).toBeTruthy();
    });

    it('should display total steps formatted', () => {
      const { getByText, getAllByTestId } = render(
        <WeeklyActivityCard activity={mockActivity} testID="weekly-activity" />
      );
      // Check that steps label is present
      expect(getByText('steps')).toBeTruthy();
      // Check that the value contains the expected number (locale-independent)
      const headlineTexts = getAllByTestId('text-headlineSmall');
      const stepsValue = headlineTexts[0].props.children.toString();
      expect(stepsValue).toMatch(/64[,.]?638/);
    });

    it('should display average steps per day', () => {
      const { getByText, getAllByTestId } = render(
        <WeeklyActivityCard activity={mockActivity} testID="weekly-activity" />
      );
      expect(getByText('avg/day')).toBeTruthy();
      // Check the average value (locale-independent)
      const headlineTexts = getAllByTestId('text-headlineSmall');
      const avgValue = headlineTexts[2].props.children.toString();
      expect(avgValue).toMatch(/9[,.]?234/);
    });

    it('should display current streak', () => {
      const { getByText } = render(
        <WeeklyActivityCard activity={mockActivity} testID="weekly-activity" />
      );
      expect(getByText('12')).toBeTruthy();
      expect(getByText('day streak')).toBeTruthy();
    });
  });

  describe('distance conversion - metric', () => {
    it('should display distance in kilometers when units is metric', () => {
      const { getByText } = render(
        <WeeklyActivityCard
          activity={mockActivity}
          units="metric"
          testID="weekly-activity"
        />
      );
      expect(getByText('51.7 km')).toBeTruthy();
    });

    it('should default to metric when units not specified', () => {
      const { getByText } = render(
        <WeeklyActivityCard activity={mockActivity} testID="weekly-activity" />
      );
      expect(getByText('51.7 km')).toBeTruthy();
    });
  });

  describe('distance conversion - imperial', () => {
    it('should display distance in miles when units is imperial', () => {
      const { getByText } = render(
        <WeeklyActivityCard
          activity={mockActivity}
          units="imperial"
          testID="weekly-activity"
        />
      );
      expect(getByText('32.1 mi')).toBeTruthy();
    });
  });

  describe('zero values', () => {
    it('should display zero values correctly', () => {
      const zeroActivity: WeeklyActivity = {
        total_steps: 0,
        total_distance_meters: 0,
        average_steps_per_day: 0,
        current_streak: 0,
      };

      const { getAllByTestId, getByText } = render(
        <WeeklyActivityCard activity={zeroActivity} testID="weekly-activity" />
      );

      // Check that zero values are shown
      const headlineTexts = getAllByTestId('text-headlineSmall');
      expect(headlineTexts[0].props.children.toString()).toBe('0');
      expect(getByText('0.0 km')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle very large step counts', () => {
      const largeActivity: WeeklyActivity = {
        total_steps: 1000000,
        total_distance_meters: 800000,
        average_steps_per_day: 142857,
        current_streak: 365,
      };

      const { getAllByTestId } = render(
        <WeeklyActivityCard activity={largeActivity} testID="weekly-activity" />
      );

      // Check that large value is present (locale-independent)
      const headlineTexts = getAllByTestId('text-headlineSmall');
      const stepsValue = headlineTexts[0].props.children.toString();
      expect(stepsValue).toMatch(/1[,.]?000[,.]?000/);
    });

    it('should round distance to one decimal place', () => {
      const preciseActivity: WeeklyActivity = {
        total_steps: 10000,
        total_distance_meters: 8567,
        average_steps_per_day: 1429,
        current_streak: 1,
      };

      const { getByText } = render(
        <WeeklyActivityCard
          activity={preciseActivity}
          units="metric"
          testID="weekly-activity"
        />
      );

      expect(getByText('8.6 km')).toBeTruthy();
    });
  });
});
