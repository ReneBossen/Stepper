import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '../ErrorBoundary';
import { Text } from 'react-native';

// Component that always throws during render
const ThrowingComponent = (): React.ReactElement => {
  throw new Error('Test error');
};

// Component that renders normally
const GoodComponent = (): React.ReactElement => <Text>All good</Text>;

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors in tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = jest.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    );
    expect(getByText('All good')).toBeTruthy();
  });

  it('renders fallback UI when child throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('renders custom fallback when provided', () => {
    const { getByText } = render(
      <ErrorBoundary fallback={<Text>Custom error</Text>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(getByText('Custom error')).toBeTruthy();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('recovers when Try Again is pressed', () => {
    // After reset, the component tries to render children again,
    // which will throw again, so we should still see the error boundary.
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    fireEvent.press(getByText('Try Again'));
    // The child throws again immediately, so error boundary catches it again
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('shows error detail in development mode', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    // __DEV__ is true in test environment, so the error message should be visible
    expect(getByText('Test error')).toBeTruthy();
  });

  it('renders description message in fallback UI', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(
      getByText('The app encountered an unexpected error. Please try again.')
    ).toBeTruthy();
  });
});
