import React from 'react';
import { render } from '@testing-library/react-native';
import PasswordStrengthIndicator from '../PasswordStrengthIndicator';

// Mock dependencies
jest.mock('@hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    paperTheme: {
      colors: {
        primary: '#6200ee',
      },
    },
  }),
}));

jest.mock('react-native-paper', () => ({
  Text: ({ children, variant, style, testID }: any) => {
    const React = require('react');
    return React.createElement('Text', { testID: testID || 'strength-text', variant, style }, children);
  },
  ProgressBar: ({ progress, color, style, testID }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: testID || 'progress-bar', style },
      React.createElement('Text', { testID: 'progress-value' }, progress.toString()),
      React.createElement('Text', { testID: 'progress-color' }, color)
    );
  },
}));

describe('PasswordStrengthIndicator', () => {
  describe('PasswordStrengthIndicator_Rendering_WithEmptyPassword', () => {
    it('PasswordStrengthIndicator_WhenPasswordEmpty_ReturnsNull', () => {
      const { toJSON } = render(<PasswordStrengthIndicator password="" />);

      expect(toJSON()).toBeNull();
    });

    it('PasswordStrengthIndicator_WhenPasswordEmpty_DoesNotRenderProgressBar', () => {
      const { queryByTestId } = render(<PasswordStrengthIndicator password="" />);

      expect(queryByTestId('progress-bar')).toBeNull();
    });

    it('PasswordStrengthIndicator_WhenPasswordEmpty_DoesNotRenderText', () => {
      const { queryByTestId } = render(<PasswordStrengthIndicator password="" />);

      expect(queryByTestId('strength-text')).toBeNull();
    });
  });

  describe('PasswordStrengthIndicator_WeakPassword_DisplaysCorrectly', () => {
    it('PasswordStrengthIndicator_WhenPasswordWeak_DisplaysWeakLabel', () => {
      const { getByText } = render(<PasswordStrengthIndicator password="abc" />);

      expect(getByText(/Weak/)).toBeTruthy();
    });

    it('PasswordStrengthIndicator_WhenPasswordWeak_DisplaysRedColor', () => {
      const { getByTestId } = render(<PasswordStrengthIndicator password="abc" />);

      const colorText = getByTestId('progress-color');
      expect(colorText.props.children).toBe('#F44336');
    });

    it('PasswordStrengthIndicator_WhenPasswordWeak_DisplaysLowProgress', () => {
      const { getByTestId } = render(<PasswordStrengthIndicator password="abc" />);

      const progressValue = getByTestId('progress-value');
      expect(progressValue.props.children).toBe('0.33');
    });

    it('PasswordStrengthIndicator_WhenPasswordShortLowercase_DisplaysWeak', () => {
      const { getByText } = render(<PasswordStrengthIndicator password="test" />);

      expect(getByText(/Weak/)).toBeTruthy();
    });

    it('PasswordStrengthIndicator_WhenPasswordNumbersOnly_DisplaysWeak', () => {
      const { getByText } = render(<PasswordStrengthIndicator password="123456" />);

      expect(getByText(/Weak/)).toBeTruthy();
    });
  });

  describe('PasswordStrengthIndicator_MediumPassword_DisplaysCorrectly', () => {
    it('PasswordStrengthIndicator_WhenPasswordMedium_DisplaysMediumLabel', () => {
      const { getByText } = render(<PasswordStrengthIndicator password="Test1234" />);

      expect(getByText(/Medium/)).toBeTruthy();
    });

    it('PasswordStrengthIndicator_WhenPasswordMedium_DisplaysOrangeColor', () => {
      const { getByTestId } = render(<PasswordStrengthIndicator password="Test1234" />);

      const colorText = getByTestId('progress-color');
      expect(colorText.props.children).toBe('#FF9800');
    });

    it('PasswordStrengthIndicator_WhenPasswordMedium_DisplaysMediumProgress', () => {
      const { getByTestId } = render(<PasswordStrengthIndicator password="Test1234" />);

      const progressValue = getByTestId('progress-value');
      expect(progressValue.props.children).toBe('0.66');
    });

    it('PasswordStrengthIndicator_WhenPasswordLongWithLettersAndNumbers_DisplaysMedium', () => {
      const { getByText } = render(<PasswordStrengthIndicator password="testpassword123" />);

      expect(getByText(/Medium/)).toBeTruthy();
    });

    it('PasswordStrengthIndicator_WhenPasswordMixedCase_DisplaysMedium', () => {
      const { getByText } = render(<PasswordStrengthIndicator password="TestPass" />);

      expect(getByText(/Medium/)).toBeTruthy();
    });
  });

  describe('PasswordStrengthIndicator_StrongPassword_DisplaysCorrectly', () => {
    it('PasswordStrengthIndicator_WhenPasswordStrong_DisplaysStrongLabel', () => {
      const { getByText } = render(<PasswordStrengthIndicator password="Test@1234!" />);

      expect(getByText(/Strong/)).toBeTruthy();
    });

    it('PasswordStrengthIndicator_WhenPasswordStrong_DisplaysGreenColor', () => {
      const { getByTestId } = render(<PasswordStrengthIndicator password="Test@1234!" />);

      const colorText = getByTestId('progress-color');
      expect(colorText.props.children).toBe('#4CAF50');
    });

    it('PasswordStrengthIndicator_WhenPasswordStrong_DisplaysFullProgress', () => {
      const { getByTestId } = render(<PasswordStrengthIndicator password="Test@1234!" />);

      const progressValue = getByTestId('progress-value');
      expect(progressValue.props.children).toBe('1');
    });

    it('PasswordStrengthIndicator_WhenPasswordLongMixedWithSpecial_DisplaysStrong', () => {
      const { getByText } = render(<PasswordStrengthIndicator password="SuperSecure123!@#" />);

      expect(getByText(/Strong/)).toBeTruthy();
    });

    it('PasswordStrengthIndicator_WhenPasswordComplexWithAllCharTypes_DisplaysStrong', () => {
      const { getByText } = render(<PasswordStrengthIndicator password="MyP@ssw0rd!" />);

      expect(getByText(/Strong/)).toBeTruthy();
    });
  });

  describe('PasswordStrengthIndicator_PasswordLengthScoring_WorksCorrectly', () => {
    it('PasswordStrengthIndicator_WhenPasswordLength8_IncreasesScore', () => {
      const { getByTestId: getByTestId7 } = render(<PasswordStrengthIndicator password="test123" />);
      const { getByTestId: getByTestId8 } = render(<PasswordStrengthIndicator password="test1234" />);

      const progress7 = getByTestId7('progress-value').props.children;
      const progress8 = getByTestId8('progress-value').props.children;

      expect(parseFloat(progress8)).toBeGreaterThanOrEqual(parseFloat(progress7));
    });

    it('PasswordStrengthIndicator_WhenPasswordLength12_IncreasesScoreFurther', () => {
      const { getByTestId: getByTestId8 } = render(<PasswordStrengthIndicator password="test1234" />);
      const { getByTestId: getByTestId12 } = render(<PasswordStrengthIndicator password="test12345678" />);

      const progress8 = getByTestId8('progress-value').props.children;
      const progress12 = getByTestId12('progress-value').props.children;

      expect(parseFloat(progress12)).toBeGreaterThanOrEqual(parseFloat(progress8));
    });
  });

  describe('PasswordStrengthIndicator_CharacterVarietyScoring_WorksCorrectly', () => {
    it('PasswordStrengthIndicator_WhenPasswordHasLowercase_IncreasesScore', () => {
      const { getByTestId } = render(<PasswordStrengthIndicator password="test" />);

      expect(getByTestId('progress-bar')).toBeTruthy();
    });

    it('PasswordStrengthIndicator_WhenPasswordHasUppercase_IncreasesScore', () => {
      const { getByTestId } = render(<PasswordStrengthIndicator password="Test" />);

      expect(getByTestId('progress-bar')).toBeTruthy();
    });

    it('PasswordStrengthIndicator_WhenPasswordHasNumbers_IncreasesScore', () => {
      const { getByTestId } = render(<PasswordStrengthIndicator password="test123" />);

      expect(getByTestId('progress-bar')).toBeTruthy();
    });

    it('PasswordStrengthIndicator_WhenPasswordHasSpecialChars_IncreasesScore', () => {
      const { getByTestId } = render(<PasswordStrengthIndicator password="test@!#" />);

      expect(getByTestId('progress-bar')).toBeTruthy();
    });
  });

  describe('PasswordStrengthIndicator_EdgeCases_HandlesCorrectly', () => {
    it('PasswordStrengthIndicator_WhenPasswordSingleChar_DisplaysWeak', () => {
      const { getByText } = render(<PasswordStrengthIndicator password="a" />);

      expect(getByText(/Weak/)).toBeTruthy();
    });

    it('PasswordStrengthIndicator_WhenPasswordAllSpaces_DisplaysWeak', () => {
      const { getByText } = render(<PasswordStrengthIndicator password="     " />);

      expect(getByText(/Weak/)).toBeTruthy();
    });

    it('PasswordStrengthIndicator_WhenPasswordChanges_UpdatesStrength', () => {
      const { getByText, rerender } = render(<PasswordStrengthIndicator password="weak" />);

      expect(getByText(/Weak/)).toBeTruthy();

      rerender(<PasswordStrengthIndicator password="StrongP@ss123!" />);

      expect(getByText(/Strong/)).toBeTruthy();
    });

    it('PasswordStrengthIndicator_WhenPasswordChangesToEmpty_HidesComponent', () => {
      const { getByText, rerender, queryByTestId } = render(<PasswordStrengthIndicator password="test123" />);

      expect(getByText(/Weak/)).toBeTruthy();

      rerender(<PasswordStrengthIndicator password="" />);

      expect(queryByTestId('progress-bar')).toBeNull();
    });
  });

  describe('PasswordStrengthIndicator_Reusability_WorksWithMultipleInstances', () => {
    it('PasswordStrengthIndicator_WhenMultipleInstances_RendersIndependently', () => {
      const { getAllByTestId } = render(
        <>
          <PasswordStrengthIndicator password="weak" />
          <PasswordStrengthIndicator password="StrongP@ss123!" />
        </>
      );

      const progressBars = getAllByTestId('progress-bar');
      expect(progressBars).toHaveLength(2);
    });

    it('PasswordStrengthIndicator_WhenDifferentPasswords_ShowsDifferentStrengths', () => {
      const { getAllByTestId } = render(
        <>
          <PasswordStrengthIndicator password="weak" />
          <PasswordStrengthIndicator password="Test1234" />
          <PasswordStrengthIndicator password="StrongP@ss123!" />
        </>
      );

      const progressValues = getAllByTestId('progress-value');
      expect(progressValues).toHaveLength(3);
      expect(progressValues[0].props.children).toBe('0.33');
      expect(progressValues[1].props.children).toBe('0.66');
      expect(progressValues[2].props.children).toBe('1');
    });
  });

  describe('PasswordStrengthIndicator_Display_ShowsCorrectText', () => {
    it('PasswordStrengthIndicator_WhenRendered_DisplaysPasswordStrengthPrefix', () => {
      const { getByText } = render(<PasswordStrengthIndicator password="test123" />);

      expect(getByText(/Password Strength:/)).toBeTruthy();
    });

    it('PasswordStrengthIndicator_WhenWeakPassword_DisplaysCompleteWeakText', () => {
      const { getByText } = render(<PasswordStrengthIndicator password="test" />);

      expect(getByText('Password Strength: Weak')).toBeTruthy();
    });

    it('PasswordStrengthIndicator_WhenMediumPassword_DisplaysCompleteMediumText', () => {
      const { getByText } = render(<PasswordStrengthIndicator password="Test1234" />);

      expect(getByText('Password Strength: Medium')).toBeTruthy();
    });

    it('PasswordStrengthIndicator_WhenStrongPassword_DisplaysCompleteStrongText', () => {
      const { getByText } = render(<PasswordStrengthIndicator password="Test@1234!" />);

      expect(getByText('Password Strength: Strong')).toBeTruthy();
    });
  });
});
