import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorMessage } from '../ErrorMessage';

// Mock react-native-paper
jest.mock('react-native-paper', () => ({
  Text: ({ children, variant, style, testID }: any) => {
    const React = require('react');
    return React.createElement('Text', { testID: testID || 'error-text', variant, style }, children);
  },
  Button: ({ children, mode, onPress, style, testID }: any) => {
    const React = require('react');
    return React.createElement(
      'Button',
      { testID: testID || 'retry-button', mode, style, onPress },
      children
    );
  },
}));

describe('ErrorMessage', () => {
  const defaultMessage = 'An error occurred';
  const mockRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<ErrorMessage message={defaultMessage} />);
      expect(getByTestId('error-text')).toBeDefined();
    });

    it('should display error message', () => {
      const { getByTestId } = render(<ErrorMessage message={defaultMessage} />);
      const errorText = getByTestId('error-text');
      expect(errorText.props.children).toBe(defaultMessage);
    });

    it('should use bodyLarge variant for text', () => {
      const { getByTestId } = render(<ErrorMessage message={defaultMessage} />);
      const errorText = getByTestId('error-text');
      expect(errorText.props.variant).toBe('bodyLarge');
    });
  });

  describe('retry button', () => {
    it('should render retry button when onRetry is provided', () => {
      const { getByTestId } = render(
        <ErrorMessage message={defaultMessage} onRetry={mockRetry} />
      );
      expect(getByTestId('retry-button')).toBeDefined();
    });

    it('should not render retry button when onRetry is not provided', () => {
      const { queryByTestId } = render(<ErrorMessage message={defaultMessage} />);
      expect(queryByTestId('retry-button')).toBeNull();
    });

    it('should call onRetry when retry button is pressed', () => {
      const { getByTestId } = render(
        <ErrorMessage message={defaultMessage} onRetry={mockRetry} />
      );

      const retryButton = getByTestId('retry-button');
      fireEvent.press(retryButton);

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('should use contained mode for retry button', () => {
      const { getByTestId } = render(
        <ErrorMessage message={defaultMessage} onRetry={mockRetry} />
      );

      const retryButton = getByTestId('retry-button');
      expect(retryButton.props.mode).toBe('contained');
    });

    it('should display "Retry" text on button', () => {
      const { getByTestId } = render(
        <ErrorMessage message={defaultMessage} onRetry={mockRetry} />
      );

      const retryButton = getByTestId('retry-button');
      expect(retryButton.props.children).toBe('Retry');
    });

    it('should call onRetry multiple times when pressed multiple times', () => {
      const { getByTestId } = render(
        <ErrorMessage message={defaultMessage} onRetry={mockRetry} />
      );

      const retryButton = getByTestId('retry-button');
      fireEvent.press(retryButton);
      fireEvent.press(retryButton);
      fireEvent.press(retryButton);

      expect(mockRetry).toHaveBeenCalledTimes(3);
    });
  });

  describe('message content', () => {
    it('should display custom error message', () => {
      const customMessage = 'Network connection failed';
      const { getByTestId } = render(<ErrorMessage message={customMessage} />);
      const errorText = getByTestId('error-text');
      expect(errorText.props.children).toBe(customMessage);
    });

    it('should display long error message', () => {
      const longMessage = 'This is a very long error message that should still be displayed properly in the error component';
      const { getByTestId } = render(<ErrorMessage message={longMessage} />);
      const errorText = getByTestId('error-text');
      expect(errorText.props.children).toBe(longMessage);
    });

    it('should display empty string message', () => {
      const { getByTestId } = render(<ErrorMessage message="" />);
      const errorText = getByTestId('error-text');
      expect(errorText.props.children).toBe('');
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Error: 404 - Not Found!';
      const { getByTestId } = render(<ErrorMessage message={specialMessage} />);
      const errorText = getByTestId('error-text');
      expect(errorText.props.children).toBe(specialMessage);
    });
  });

  describe('layout', () => {
    it('should render in a container', () => {
      const { getByTestId } = render(<ErrorMessage message={defaultMessage} />);
      const errorText = getByTestId('error-text');
      expect(errorText).toBeDefined();
    });

    it('should center content', () => {
      const { getByTestId } = render(<ErrorMessage message={defaultMessage} />);
      const errorText = getByTestId('error-text');
      expect(errorText.parent).toBeDefined();
    });
  });

  describe('component props', () => {
    it('should accept message prop as required', () => {
      expect(() => render(<ErrorMessage message={defaultMessage} />)).not.toThrow();
    });

    it('should accept optional onRetry prop', () => {
      expect(() => render(<ErrorMessage message={defaultMessage} onRetry={mockRetry} />)).not.toThrow();
    });

    it('should work with undefined onRetry', () => {
      expect(() => render(<ErrorMessage message={defaultMessage} onRetry={undefined} />)).not.toThrow();
    });
  });

  describe('snapshot', () => {
    it('should match snapshot without retry button', () => {
      const { toJSON } = render(<ErrorMessage message={defaultMessage} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with retry button', () => {
      const { toJSON } = render(
        <ErrorMessage message={defaultMessage} onRetry={mockRetry} />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('reusability', () => {
    it('should render multiple instances with different messages', () => {
      const { getAllByTestId } = render(
        <>
          <ErrorMessage message="Error 1" />
          <ErrorMessage message="Error 2" />
        </>
      );

      const errorTexts = getAllByTestId('error-text');
      expect(errorTexts).toHaveLength(2);
      expect(errorTexts[0].props.children).toBe('Error 1');
      expect(errorTexts[1].props.children).toBe('Error 2');
    });

    it('should handle different retry handlers independently', () => {
      const mockRetry1 = jest.fn();
      const mockRetry2 = jest.fn();

      const { getAllByTestId } = render(
        <>
          <ErrorMessage message="Error 1" onRetry={mockRetry1} />
          <ErrorMessage message="Error 2" onRetry={mockRetry2} />
        </>
      );

      const retryButtons = getAllByTestId('retry-button');
      fireEvent.press(retryButtons[0]);

      expect(mockRetry1).toHaveBeenCalledTimes(1);
      expect(mockRetry2).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should render text component for screen readers', () => {
      const { getByTestId } = render(<ErrorMessage message={defaultMessage} />);
      const errorText = getByTestId('error-text');
      expect(errorText).toBeDefined();
    });

    it('should render button component for interaction', () => {
      const { getByTestId } = render(
        <ErrorMessage message={defaultMessage} onRetry={mockRetry} />
      );
      const retryButton = getByTestId('retry-button');
      expect(retryButton).toBeDefined();
    });
  });
});
