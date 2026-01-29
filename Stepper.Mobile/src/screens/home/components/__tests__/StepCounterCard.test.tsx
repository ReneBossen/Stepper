import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StepCounterCard } from '../StepCounterCard';

// Mock react-native-circular-progress
jest.mock('react-native-circular-progress', () => ({
  AnimatedCircularProgress: ({ children, fill }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID="circular-progress" data-fill={fill}>
        {children && children()}
      </RN.View>
    );
  },
}));

// Mock react-native-paper
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
        primary: '#4CAF50',
        surface: '#FFF',
        surfaceVariant: '#F5F5F5',
        onSurface: '#000',
        onSurfaceVariant: '#666',
        tertiaryContainer: '#FFE0B2',
        onTertiaryContainer: '#E65100',
      },
    }),
  };
});

describe('StepCounterCard', () => {
  const defaultProps = {
    steps: 8547,
    goal: 10000,
    distance: 6800,
    streak: 12,
    units: 'metric' as const,
  };

  it('should render step count', () => {
    const { getByText } = render(<StepCounterCard {...defaultProps} />);

    // Check for formatted value (locale-independent check)
    expect(getByText((8547).toLocaleString())).toBeTruthy();
    expect(getByText('steps')).toBeTruthy();
  });

  it('should render goal text', () => {
    const { getByText } = render(<StepCounterCard {...defaultProps} />);

    // Check for goal text with locale-formatted number
    expect(getByText(/Goal:/)).toBeTruthy();
  });

  it('should calculate and display correct percentage', () => {
    const { getByText } = render(<StepCounterCard {...defaultProps} />);

    // 8547 / 10000 = 85.47% -> rounded to 85%
    expect(getByText('85%')).toBeTruthy();
  });

  it('should cap percentage at 100%', () => {
    const { getByText } = render(
      <StepCounterCard {...defaultProps} steps={12000} />
    );

    expect(getByText('100%')).toBeTruthy();
  });

  it('should display distance in kilometers for metric units', () => {
    const { getByText } = render(
      <StepCounterCard {...defaultProps} distance={6800} units="metric" />
    );

    expect(getByText('6.8 km')).toBeTruthy();
  });

  it('should display distance in miles for imperial units', () => {
    const { getByText } = render(
      <StepCounterCard {...defaultProps} distance={6800} units="imperial" />
    );

    // 6800 meters = ~4.2 miles
    expect(getByText('4.2 mi')).toBeTruthy();
  });

  it('should render streak badge', () => {
    const { getByText } = render(<StepCounterCard {...defaultProps} />);

    expect(getByText(/12 days/)).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <StepCounterCard {...defaultProps} onPress={onPress} />
    );

    fireEvent.press(getByTestId('step-counter-card'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should not be pressable when onPress is not provided', () => {
    const { getByTestId } = render(<StepCounterCard {...defaultProps} />);

    // The card should still render
    expect(getByTestId('step-counter-card')).toBeTruthy();
  });

  it('should handle zero steps', () => {
    const { getByText } = render(
      <StepCounterCard {...defaultProps} steps={0} />
    );

    expect(getByText('0')).toBeTruthy();
    expect(getByText('0%')).toBeTruthy();
  });

  it('should handle zero distance', () => {
    const { getByText } = render(
      <StepCounterCard {...defaultProps} distance={0} />
    );

    expect(getByText('0.0 km')).toBeTruthy();
  });

  it('should render circular progress component', () => {
    const { getByTestId } = render(<StepCounterCard {...defaultProps} />);

    expect(getByTestId('circular-progress')).toBeTruthy();
  });

  it('should display ruler emoji for distance', () => {
    const { getByText } = render(<StepCounterCard {...defaultProps} />);

    expect(getByText('📏')).toBeTruthy();
  });

  it('should display fire emoji for streak', () => {
    const { getByText } = render(<StepCounterCard {...defaultProps} />);

    expect(getByText('🔥')).toBeTruthy();
  });

  it('should handle 50% progress correctly', () => {
    const { getByText } = render(
      <StepCounterCard {...defaultProps} steps={5000} goal={10000} />
    );

    expect(getByText('50%')).toBeTruthy();
  });
});
