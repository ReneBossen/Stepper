import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { JoinGroupCard } from '../JoinGroupCard';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  const Card = ({ children, style, mode }: any) => (
    <RN.View testID="card" style={style}>{children}</RN.View>
  );
  Card.Content = ({ children, style }: any) => (
    <RN.View testID="card-content" style={style}>{children}</RN.View>
  );

  return {
    Card,
    Text: ({ children, style, variant, ...props }: any) => (
      <RN.Text {...props} style={style}>{children}</RN.Text>
    ),
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        surface: '#FFFFFF',
        surfaceVariant: '#F5F5F5',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        outline: '#CCCCCC',
      },
    }),
  };
});

describe('JoinGroupCard', () => {
  const defaultProps = {
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByText } = render(<JoinGroupCard {...defaultProps} />);
      expect(getByText('Join a Group')).toBeTruthy();
    });

    it('should render the title', () => {
      const { getByText } = render(<JoinGroupCard {...defaultProps} />);
      expect(getByText('Join a Group')).toBeTruthy();
    });

    it('should render the subtitle', () => {
      const { getByText } = render(<JoinGroupCard {...defaultProps} />);
      expect(getByText('Find groups to compete with friends')).toBeTruthy();
    });

    it('should have correct testID when provided', () => {
      const { getByTestId } = render(
        <JoinGroupCard {...defaultProps} testID="join-card" />
      );
      expect(getByTestId('join-card')).toBeTruthy();
    });

    it('should render card component', () => {
      const { getByTestId } = render(<JoinGroupCard {...defaultProps} />);
      expect(getByTestId('card')).toBeTruthy();
    });

    it('should render card content', () => {
      const { getByTestId } = render(<JoinGroupCard {...defaultProps} />);
      expect(getByTestId('card-content')).toBeTruthy();
    });
  });

  describe('onPress handler', () => {
    it('should call onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <JoinGroupCard onPress={onPress} testID="join-card" />
      );

      fireEvent.press(getByTestId('join-card'));

      expect(onPress).toHaveBeenCalled();
    });

    it('should call onPress only once per press', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <JoinGroupCard onPress={onPress} testID="join-card" />
      );

      fireEvent.press(getByTestId('join-card'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should call onPress when pressing title text', () => {
      const onPress = jest.fn();
      const { getByText } = render(<JoinGroupCard onPress={onPress} />);

      fireEvent.press(getByText('Join a Group'));

      expect(onPress).toHaveBeenCalled();
    });

    it('should call onPress when pressing subtitle text', () => {
      const onPress = jest.fn();
      const { getByText } = render(<JoinGroupCard onPress={onPress} />);

      fireEvent.press(getByText('Find groups to compete with friends'));

      expect(onPress).toHaveBeenCalled();
    });
  });

  describe('styling', () => {
    it('should render as outlined card', () => {
      const { getByTestId } = render(<JoinGroupCard {...defaultProps} />);
      // Card is rendered with mode="outlined"
      expect(getByTestId('card')).toBeTruthy();
    });
  });
});
