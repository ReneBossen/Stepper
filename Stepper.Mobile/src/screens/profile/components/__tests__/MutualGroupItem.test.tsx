import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MutualGroupItem } from '../MutualGroupItem';
import type { MutualGroup } from '@store/userStore';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  const List = {
    Item: ({ title, left, right, style }: any) => (
      <RN.View style={style} testID="list-item">
        {left && left({ color: '#000' })}
        <RN.Text testID="list-item-title">{title}</RN.Text>
        {right && right({ color: '#666' })}
      </RN.View>
    ),
    Icon: ({ icon, color }: any) => (
      <RN.View testID={`list-icon-${icon}`}>
        <RN.Text>{icon}</RN.Text>
      </RN.View>
    ),
  };

  return {
    List,
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        onSurfaceVariant: '#666666',
      },
    }),
  };
});

describe('MutualGroupItem', () => {
  const mockGroup: MutualGroup = {
    id: 'group-1',
    name: 'Morning Walkers',
  };

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(
        <MutualGroupItem group={mockGroup} testID="mutual-group" />
      );
      expect(getByTestId('mutual-group')).toBeTruthy();
    });

    it('should display the group name', () => {
      const { getByText } = render(
        <MutualGroupItem group={mockGroup} testID="mutual-group" />
      );
      expect(getByText('Morning Walkers')).toBeTruthy();
    });

    it('should display trophy icon', () => {
      const { getByTestId } = render(
        <MutualGroupItem group={mockGroup} testID="mutual-group" />
      );
      expect(getByTestId('list-icon-trophy')).toBeTruthy();
    });

    it('should display chevron icon when onPress is provided', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <MutualGroupItem
          group={mockGroup}
          onPress={mockOnPress}
          testID="mutual-group"
        />
      );
      expect(getByTestId('list-icon-chevron-right')).toBeTruthy();
    });

    it('should not display chevron icon when onPress is not provided', () => {
      const { queryByTestId } = render(
        <MutualGroupItem group={mockGroup} testID="mutual-group" />
      );
      expect(queryByTestId('list-icon-chevron-right')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibility label', () => {
      const { getByLabelText } = render(
        <MutualGroupItem group={mockGroup} testID="mutual-group" />
      );
      expect(getByLabelText('Mutual group: Morning Walkers')).toBeTruthy();
    });

    it('should have button role when onPress is provided', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <MutualGroupItem
          group={mockGroup}
          onPress={mockOnPress}
          testID="mutual-group"
        />
      );
      const pressable = getByTestId('mutual-group');
      expect(pressable.props.accessibilityRole).toBe('button');
    });

    it('should have text role when onPress is not provided', () => {
      const { getByTestId } = render(
        <MutualGroupItem group={mockGroup} testID="mutual-group" />
      );
      const pressable = getByTestId('mutual-group');
      expect(pressable.props.accessibilityRole).toBe('text');
    });
  });

  describe('interactions', () => {
    it('should call onPress with group when pressed', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <MutualGroupItem
          group={mockGroup}
          onPress={mockOnPress}
          testID="mutual-group"
        />
      );

      fireEvent.press(getByTestId('mutual-group'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnPress).toHaveBeenCalledWith(mockGroup);
    });

    it('should not crash when pressed without onPress handler', () => {
      const { getByTestId } = render(
        <MutualGroupItem group={mockGroup} testID="mutual-group" />
      );

      expect(() => fireEvent.press(getByTestId('mutual-group'))).not.toThrow();
    });
  });

  describe('different groups', () => {
    it('should render Weekend Warriors group', () => {
      const group: MutualGroup = {
        id: 'group-2',
        name: 'Weekend Warriors',
      };

      const { getByText } = render(
        <MutualGroupItem group={group} testID="mutual-group" />
      );
      expect(getByText('Weekend Warriors')).toBeTruthy();
    });

    it('should render Fitness Fanatics group', () => {
      const group: MutualGroup = {
        id: 'group-3',
        name: 'Fitness Fanatics',
      };

      const { getByText } = render(
        <MutualGroupItem group={group} testID="mutual-group" />
      );
      expect(getByText('Fitness Fanatics')).toBeTruthy();
    });

    it('should handle group with long name', () => {
      const group: MutualGroup = {
        id: 'group-4',
        name: 'The Very Long Group Name That Might Overflow',
      };

      const { getByText } = render(
        <MutualGroupItem group={group} testID="mutual-group" />
      );
      expect(
        getByText('The Very Long Group Name That Might Overflow')
      ).toBeTruthy();
    });
  });
});
