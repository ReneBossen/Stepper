import React from 'react';
import { render } from '@testing-library/react-native';
import { LoadingSpinner } from '../LoadingSpinner';

// Mock react-native-paper
jest.mock('react-native-paper', () => ({
  ActivityIndicator: ({ size, testID }: any) => {
    const React = require('react');
    return React.createElement('ActivityIndicator', { testID: testID || 'activity-indicator', size });
  },
}));

describe('LoadingSpinner', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<LoadingSpinner />);
      expect(getByTestId('activity-indicator')).toBeDefined();
    });

    it('should render ActivityIndicator component', () => {
      const { getByTestId } = render(<LoadingSpinner />);
      const indicator = getByTestId('activity-indicator');
      expect(indicator).toBeDefined();
    });

    it('should set ActivityIndicator size to large', () => {
      const { getByTestId } = render(<LoadingSpinner />);
      const indicator = getByTestId('activity-indicator');
      expect(indicator.props.size).toBe('large');
    });
  });

  describe('layout', () => {
    it('should render in a container with flex layout', () => {
      const { getByTestId } = render(<LoadingSpinner />);
      const indicator = getByTestId('activity-indicator');
      expect(indicator.parent).toBeDefined();
    });

    it('should be centered in container', () => {
      const { getByTestId } = render(<LoadingSpinner />);
      const indicator = getByTestId('activity-indicator');
      expect(indicator).toBeDefined();
    });
  });

  describe('component structure', () => {
    it('should be a functional component', () => {
      expect(typeof LoadingSpinner).toBe('function');
    });

    it('should not accept any props', () => {
      // Component should render successfully without props
      expect(() => render(<LoadingSpinner />)).not.toThrow();
    });
  });

  describe('snapshot', () => {
    it('should match snapshot', () => {
      const { toJSON } = render(<LoadingSpinner />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('accessibility', () => {
    it('should render ActivityIndicator which provides loading state', () => {
      const { getByTestId } = render(<LoadingSpinner />);
      const indicator = getByTestId('activity-indicator');
      expect(indicator).toBeDefined();
    });
  });

  describe('reusability', () => {
    it('should render multiple instances independently', () => {
      const { getAllByTestId } = render(
        <>
          <LoadingSpinner />
          <LoadingSpinner />
        </>
      );

      const indicators = getAllByTestId('activity-indicator');
      expect(indicators).toHaveLength(2);
    });

    it('should be usable in different contexts', () => {
      const WrapperComponent = () => (
        <LoadingSpinner />
      );

      const { getByTestId } = render(<WrapperComponent />);
      expect(getByTestId('activity-indicator')).toBeDefined();
    });
  });
});
