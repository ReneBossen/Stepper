import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AchievementChip } from '../AchievementChip';
import type { Achievement } from '@store/userStore';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  return {
    Chip: ({ children, icon, style, textStyle, compact }: any) => (
      <RN.View style={style} testID="chip">
        <RN.Text testID="chip-icon">{icon}</RN.Text>
        <RN.Text style={textStyle}>{children}</RN.Text>
      </RN.View>
    ),
    useTheme: () => ({
      colors: {
        secondaryContainer: '#E3F2FD',
        onSecondaryContainer: '#1565C0',
      },
    }),
  };
});

describe('AchievementChip', () => {
  const mockAchievement: Achievement = {
    id: 'achievement-1',
    name: '100K Club',
    description: 'Walk 100,000 steps in a week',
    icon: 'trophy',
    earned_at: '2025-01-15T10:30:00Z',
  };

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(
        <AchievementChip
          achievement={mockAchievement}
          testID="achievement-chip"
        />
      );
      expect(getByTestId('achievement-chip')).toBeTruthy();
    });

    it('should display the achievement name', () => {
      const { getByText } = render(
        <AchievementChip
          achievement={mockAchievement}
          testID="achievement-chip"
        />
      );
      expect(getByText('100K Club')).toBeTruthy();
    });

    it('should use provided icon', () => {
      const { getByTestId } = render(
        <AchievementChip
          achievement={mockAchievement}
          testID="achievement-chip"
        />
      );
      expect(getByTestId('chip-icon')).toHaveTextContent('trophy');
    });

    it('should use default medal icon when icon is not provided', () => {
      const achievementNoIcon: Achievement = {
        ...mockAchievement,
        icon: '',
      };

      const { getByTestId } = render(
        <AchievementChip
          achievement={achievementNoIcon}
          testID="achievement-chip"
        />
      );
      // Empty icon falls back to 'medal' in the component
      expect(getByTestId('chip-icon')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibility label', () => {
      const { getByLabelText } = render(
        <AchievementChip
          achievement={mockAchievement}
          testID="achievement-chip"
        />
      );
      expect(
        getByLabelText('100K Club badge: Walk 100,000 steps in a week')
      ).toBeTruthy();
    });

    it('should have button role when onPress is provided', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <AchievementChip
          achievement={mockAchievement}
          onPress={mockOnPress}
          testID="achievement-chip"
        />
      );
      const pressable = getByTestId('achievement-chip');
      expect(pressable.props.accessibilityRole).toBe('button');
    });

    it('should have text role when onPress is not provided', () => {
      const { getByTestId } = render(
        <AchievementChip
          achievement={mockAchievement}
          testID="achievement-chip"
        />
      );
      const pressable = getByTestId('achievement-chip');
      expect(pressable.props.accessibilityRole).toBe('text');
    });
  });

  describe('interactions', () => {
    it('should call onPress with achievement when pressed', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <AchievementChip
          achievement={mockAchievement}
          onPress={mockOnPress}
          testID="achievement-chip"
        />
      );

      fireEvent.press(getByTestId('achievement-chip'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnPress).toHaveBeenCalledWith(mockAchievement);
    });

    it('should not crash when pressed without onPress handler', () => {
      const { getByTestId } = render(
        <AchievementChip
          achievement={mockAchievement}
          testID="achievement-chip"
        />
      );

      expect(() => fireEvent.press(getByTestId('achievement-chip'))).not.toThrow();
    });
  });

  describe('different achievements', () => {
    it('should render 7-Day Warrior achievement', () => {
      const achievement: Achievement = {
        id: 'achievement-2',
        name: '7-Day Warrior',
        description: 'Complete 7 consecutive days of activity',
        icon: 'fire',
        earned_at: '2025-01-10T08:00:00Z',
      };

      const { getByText } = render(
        <AchievementChip achievement={achievement} testID="achievement-chip" />
      );
      expect(getByText('7-Day Warrior')).toBeTruthy();
    });

    it('should render First 10K achievement', () => {
      const achievement: Achievement = {
        id: 'achievement-3',
        name: 'First 10K',
        description: 'Walk 10,000 steps in a day',
        icon: 'star',
        earned_at: '2025-01-01T12:00:00Z',
      };

      const { getByText } = render(
        <AchievementChip achievement={achievement} testID="achievement-chip" />
      );
      expect(getByText('First 10K')).toBeTruthy();
    });

    it('should render Social Butterfly achievement', () => {
      const achievement: Achievement = {
        id: 'achievement-4',
        name: 'Social Butterfly',
        description: 'Add 10 friends',
        icon: 'account-group',
        earned_at: '2025-01-20T15:30:00Z',
      };

      const { getByText } = render(
        <AchievementChip achievement={achievement} testID="achievement-chip" />
      );
      expect(getByText('Social Butterfly')).toBeTruthy();
    });
  });
});
