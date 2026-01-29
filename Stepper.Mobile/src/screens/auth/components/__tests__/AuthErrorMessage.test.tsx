import React from 'react';
import { render } from '@testing-library/react-native';
import AuthErrorMessage from '../AuthErrorMessage';

// Mock dependencies
jest.mock('@hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    paperTheme: {
      colors: {
        errorContainer: '#F9DEDC',
        onErrorContainer: '#410E0B',
      },
    },
  }),
}));

jest.mock('react-native-paper', () => ({
  Text: ({ children, variant, style, testID }: any) => {
    const React = require('react');
    return React.createElement('Text', { testID: testID || 'error-text', variant, style }, children);
  },
  Surface: ({ children, style, elevation, testID }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: testID || 'error-surface', style, elevation }, children);
  },
}));

describe('AuthErrorMessage', () => {
  describe('AuthErrorMessage_Rendering_WithError', () => {
    it('AuthErrorMessage_WhenErrorProvided_DisplaysError', () => {
      const { getByText } = render(<AuthErrorMessage error="Invalid credentials" />);

      expect(getByText('Invalid credentials')).toBeTruthy();
    });

    it('AuthErrorMessage_WhenErrorProvided_DisplaysSurface', () => {
      const { getByTestId } = render(<AuthErrorMessage error="Test error" />);

      expect(getByTestId('error-surface')).toBeTruthy();
    });

    it('AuthErrorMessage_WhenLongErrorProvided_DisplaysFullError', () => {
      const longError = 'This is a very long error message that should still be displayed completely';
      const { getByText } = render(<AuthErrorMessage error={longError} />);

      expect(getByText(longError)).toBeTruthy();
    });

    it('AuthErrorMessage_WhenErrorWithSpecialCharacters_DisplaysCorrectly', () => {
      const specialError = 'Error: 404 - User not found!';
      const { getByText } = render(<AuthErrorMessage error={specialError} />);

      expect(getByText(specialError)).toBeTruthy();
    });
  });

  describe('AuthErrorMessage_Rendering_WithoutError', () => {
    it('AuthErrorMessage_WhenErrorIsNull_ReturnsNull', () => {
      const { toJSON } = render(<AuthErrorMessage error={null} />);

      expect(toJSON()).toBeNull();
    });

    it('AuthErrorMessage_WhenErrorIsNull_DoesNotRenderSurface', () => {
      const { queryByTestId } = render(<AuthErrorMessage error={null} />);

      expect(queryByTestId('error-surface')).toBeNull();
    });

    it('AuthErrorMessage_WhenErrorIsNull_DoesNotRenderText', () => {
      const { queryByTestId } = render(<AuthErrorMessage error={null} />);

      expect(queryByTestId('error-text')).toBeNull();
    });
  });

  describe('AuthErrorMessage_ErrorContent_VariousTypes', () => {
    it('AuthErrorMessage_WhenShortError_DisplaysShortError', () => {
      const { getByText } = render(<AuthErrorMessage error="Error" />);

      expect(getByText('Error')).toBeTruthy();
    });

    it('AuthErrorMessage_WhenErrorWithNewlines_DisplaysWithNewlines', () => {
      const errorWithNewlines = 'Error:\nMultiple issues found';
      const { getByText } = render(<AuthErrorMessage error={errorWithNewlines} />);

      expect(getByText(errorWithNewlines)).toBeTruthy();
    });

    it('AuthErrorMessage_WhenEmptyString_ReturnsNull', () => {
      const { toJSON } = render(<AuthErrorMessage error="" />);

      // Empty string is falsy, so component returns null
      expect(toJSON()).toBeNull();
    });

    it('AuthErrorMessage_WhenErrorChanges_UpdatesDisplay', () => {
      const { getByText, rerender } = render(<AuthErrorMessage error="First error" />);

      expect(getByText('First error')).toBeTruthy();

      rerender(<AuthErrorMessage error="Second error" />);

      expect(getByText('Second error')).toBeTruthy();
    });

    it('AuthErrorMessage_WhenErrorChangesToNull_HidesComponent', () => {
      const { getByText, rerender, queryByTestId } = render(<AuthErrorMessage error="Error message" />);

      expect(getByText('Error message')).toBeTruthy();

      rerender(<AuthErrorMessage error={null} />);

      expect(queryByTestId('error-surface')).toBeNull();
    });
  });

  describe('AuthErrorMessage_Props_AcceptsCorrectValues', () => {
    it('AuthErrorMessage_WhenValidErrorProp_RendersCorrectly', () => {
      expect(() => render(<AuthErrorMessage error="Valid error" />)).not.toThrow();
    });

    it('AuthErrorMessage_WhenNullErrorProp_RendersCorrectly', () => {
      expect(() => render(<AuthErrorMessage error={null} />)).not.toThrow();
    });
  });

  describe('AuthErrorMessage_Reusability_WorksWithMultipleInstances', () => {
    it('AuthErrorMessage_WhenMultipleInstances_RendersIndependently', () => {
      const { getAllByTestId } = render(
        <>
          <AuthErrorMessage error="First error" />
          <AuthErrorMessage error="Second error" />
        </>
      );

      const errorTexts = getAllByTestId('error-text');
      expect(errorTexts).toHaveLength(2);
      expect(errorTexts[0].props.children).toBe('First error');
      expect(errorTexts[1].props.children).toBe('Second error');
    });

    it('AuthErrorMessage_WhenMixedErrorStates_RendersCorrectly', () => {
      const { getAllByTestId } = render(
        <>
          <AuthErrorMessage error="Error message" />
          <AuthErrorMessage error={null} />
          <AuthErrorMessage error="Another error" />
        </>
      );

      const errorTexts = getAllByTestId('error-text');
      expect(errorTexts).toHaveLength(2);
    });
  });

  describe('AuthErrorMessage_Styling_AppliesCorrectly', () => {
    it('AuthErrorMessage_WhenRendered_AppliesBodyMediumVariant', () => {
      const { getByTestId } = render(<AuthErrorMessage error="Test error" />);

      const errorText = getByTestId('error-text');
      expect(errorText.props.variant).toBe('bodyMedium');
    });

    it('AuthErrorMessage_WhenRendered_AppliesSurfaceWithElevationZero', () => {
      const { getByTestId } = render(<AuthErrorMessage error="Test error" />);

      const surface = getByTestId('error-surface');
      expect(surface.props.elevation).toBe(0);
    });
  });
});
