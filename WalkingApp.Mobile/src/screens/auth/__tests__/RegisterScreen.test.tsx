import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RegisterScreen from '../RegisterScreen';
import { useRegister } from '../hooks/useRegister';

// Mock dependencies
jest.mock('../hooks/useRegister');
jest.mock('@hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    paperTheme: {
      colors: {
        primary: '#6200ee',
        onSurfaceVariant: '#49454F',
        primaryContainer: '#EADDFF',
      },
    },
  }),
}));

jest.mock('../components/AuthLayout', () => ({
  __esModule: true,
  default: ({ children, title, subtitle }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'auth-layout' }, [
      React.createElement('Text', { key: 'title', testID: 'layout-title' }, title),
      React.createElement('Text', { key: 'subtitle', testID: 'layout-subtitle' }, subtitle),
      children,
    ]);
  },
}));

jest.mock('../components/AuthErrorMessage', () => ({
  __esModule: true,
  default: ({ error }: any) => {
    const React = require('react');
    return error ? React.createElement('Text', { testID: 'error-message' }, error) : null;
  },
}));

jest.mock('../components/PasswordStrengthIndicator', () => ({
  __esModule: true,
  default: ({ password }: any) => {
    const React = require('react');
    return password ? React.createElement('Text', { testID: 'password-strength' }, `Strength: ${password}`) : null;
  },
}));

jest.mock('react-native-paper', () => {
  const React = require('react');
  const RN = require('react-native');

  const MockTextInput = ({ label, value, onChangeText, disabled, testID }: any) => {
    return React.createElement(RN.TextInput, {
      testID: testID || `input-${label?.toLowerCase().replace(/\s/g, '-')}`,
      value,
      onChangeText,
      editable: !disabled,
      placeholder: label,
    });
  };

  MockTextInput.Icon = () => null;

  return {
    TextInput: MockTextInput,
    Button: ({ children, onPress, loading, disabled, testID }: any) => {
      return React.createElement(
        RN.TouchableOpacity,
        {
          testID: testID || 'button',
          onPress,
          disabled: disabled || loading,
        },
        React.createElement(RN.Text, {}, children)
      );
    },
    Text: ({ children, testID, variant, style }: any) => {
      return React.createElement(RN.Text, { testID, variant, style }, children);
    },
    Checkbox: ({ status, onPress, disabled }: any) => {
      return React.createElement(
        RN.TouchableOpacity,
        {
          testID: 'checkbox',
          onPress,
          disabled,
        },
        React.createElement(RN.Text, {}, status === 'checked' ? '☑' : '☐')
      );
    },
    Surface: ({ children, testID }: any) => {
      return React.createElement(RN.View, { testID: testID || 'surface' }, children);
    },
  };
});

const mockNavigation = {
  navigate: jest.fn(),
};

describe('RegisterScreen', () => {
  const mockUseRegister = useRegister as jest.MockedFunction<typeof useRegister>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RegisterScreen_Rendering_DisplaysAllElements', () => {
    it('RegisterScreen_WhenRendered_DisplaysTitle', () => {
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: false,
        handleRegister: jest.fn(),
      });

      const { getByTestId } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByTestId('layout-title')).toHaveTextContent('Create Account');
    });

    it('RegisterScreen_WhenRendered_DisplaysAllInputs', () => {
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: false,
        handleRegister: jest.fn(),
      });

      const { getByPlaceholderText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByPlaceholderText('Display Name')).toBeTruthy();
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
      expect(getByPlaceholderText('Confirm Password')).toBeTruthy();
    });

    it('RegisterScreen_WhenRendered_DisplaysTermsCheckbox', () => {
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: false,
        handleRegister: jest.fn(),
      });

      const { getByTestId } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByTestId('checkbox')).toBeTruthy();
    });

    it('RegisterScreen_WhenRendered_DisplaysSignUpButton', () => {
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: false,
        handleRegister: jest.fn(),
      });

      const { getByText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByText('Sign Up')).toBeTruthy();
    });
  });

  describe('RegisterScreen_InputHandling_UpdatesState', () => {
    it('RegisterScreen_WhenDisplayNameChanged_CallsSetDisplayName', () => {
      const setDisplayName = jest.fn();
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName,
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: false,
        handleRegister: jest.fn(),
      });

      const { getByPlaceholderText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.changeText(getByPlaceholderText('Display Name'), 'John Doe');

      expect(setDisplayName).toHaveBeenCalledWith('John Doe');
    });

    it('RegisterScreen_WhenEmailChanged_CallsSetEmail', () => {
      const setEmail = jest.fn();
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: '',
        setEmail,
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: false,
        handleRegister: jest.fn(),
      });

      const { getByPlaceholderText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');

      expect(setEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('RegisterScreen_WhenPasswordChanged_CallsSetPassword', () => {
      const setPassword = jest.fn();
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword,
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: false,
        handleRegister: jest.fn(),
      });

      const { getByPlaceholderText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

      expect(setPassword).toHaveBeenCalledWith('password123');
    });

    it('RegisterScreen_WhenConfirmPasswordChanged_CallsSetConfirmPassword', () => {
      const setConfirmPassword = jest.fn();
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword,
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: false,
        handleRegister: jest.fn(),
      });

      const { getByPlaceholderText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password123');

      expect(setConfirmPassword).toHaveBeenCalledWith('password123');
    });
  });

  describe('RegisterScreen_TermsCheckbox_TogglesCorrectly', () => {
    it('RegisterScreen_WhenCheckboxPressed_TogglesAgreedToTerms', () => {
      const setAgreedToTerms = jest.fn();
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms,
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: false,
        handleRegister: jest.fn(),
      });

      const { getByTestId } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByTestId('checkbox'));

      expect(setAgreedToTerms).toHaveBeenCalledWith(true);
    });

    it('RegisterScreen_WhenAgreedToTermsTrue_DisplaysCheckedCheckbox', () => {
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: true,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: false,
        handleRegister: jest.fn(),
      });

      const { getByTestId } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByTestId('checkbox')).toHaveTextContent('☑');
    });
  });

  describe('RegisterScreen_SignUpButton_HandlesRegistration', () => {
    it('RegisterScreen_WhenSignUpPressed_CallsHandleRegister', () => {
      const handleRegister = jest.fn();
      mockUseRegister.mockReturnValue({
        displayName: 'John Doe',
        setDisplayName: jest.fn(),
        email: 'test@example.com',
        setEmail: jest.fn(),
        password: 'password123',
        setPassword: jest.fn(),
        confirmPassword: 'password123',
        setConfirmPassword: jest.fn(),
        agreedToTerms: true,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: false,
        handleRegister,
      });

      const { getByText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Sign Up'));

      expect(handleRegister).toHaveBeenCalledTimes(1);
    });

    it('RegisterScreen_WhenLoading_DisablesSignUpButton', () => {
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: true,
        error: null,
        registrationSuccess: false,
        handleRegister: jest.fn(),
      });

      const { getByText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      const signUpButton = getByText('Sign Up').parent;
      expect(signUpButton?.props.disabled).toBe(true);
    });
  });

  describe('RegisterScreen_PasswordStrength_DisplaysCorrectly', () => {
    it('RegisterScreen_WhenPasswordEntered_DisplaysPasswordStrength', () => {
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: '',
        setEmail: jest.fn(),
        password: 'password123',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: false,
        handleRegister: jest.fn(),
      });

      const { getByTestId } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByTestId('password-strength')).toBeTruthy();
    });

    it('RegisterScreen_WhenNoPassword_DoesNotDisplayPasswordStrength', () => {
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: false,
        handleRegister: jest.fn(),
      });

      const { queryByTestId } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(queryByTestId('password-strength')).toBeNull();
    });
  });

  describe('RegisterScreen_SuccessState_DisplaysSuccessScreen', () => {
    it('RegisterScreen_WhenRegistrationSuccess_DisplaysSuccessMessage', () => {
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: 'test@example.com',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: true,
        handleRegister: jest.fn(),
      });

      const { getByText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByText('Check Your Email')).toBeTruthy();
      expect(getByText('test@example.com')).toBeTruthy();
    });

    it('RegisterScreen_WhenRegistrationSuccess_DisplaysBackToLoginButton', () => {
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: 'test@example.com',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: true,
        handleRegister: jest.fn(),
      });

      const { getByText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByText('Back to Login')).toBeTruthy();
    });

    it('RegisterScreen_WhenBackToLoginPressed_NavigatesToLogin', () => {
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: 'test@example.com',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: true,
        handleRegister: jest.fn(),
      });

      const { getByText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Back to Login'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });
  });

  describe('RegisterScreen_ErrorHandling_DisplaysErrors', () => {
    it('RegisterScreen_WhenErrorExists_DisplaysErrorMessage', () => {
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: 'Email already exists',
        registrationSuccess: false,
        handleRegister: jest.fn(),
      });

      const { getByTestId } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByTestId('error-message')).toHaveTextContent('Email already exists');
    });
  });

  describe('RegisterScreen_LoadingState_DisablesInputs', () => {
    it('RegisterScreen_WhenLoading_DisablesAllInputs', () => {
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: true,
        error: null,
        registrationSuccess: false,
        handleRegister: jest.fn(),
      });

      const { getByPlaceholderText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByPlaceholderText('Display Name').props.editable).toBe(false);
      expect(getByPlaceholderText('Email').props.editable).toBe(false);
      expect(getByPlaceholderText('Password').props.editable).toBe(false);
      expect(getByPlaceholderText('Confirm Password').props.editable).toBe(false);
    });
  });

  describe('RegisterScreen_Navigation_WorksCorrectly', () => {
    it('RegisterScreen_WhenSignInPressed_NavigatesToLogin', () => {
      mockUseRegister.mockReturnValue({
        displayName: '',
        setDisplayName: jest.fn(),
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        confirmPassword: '',
        setConfirmPassword: jest.fn(),
        agreedToTerms: false,
        setAgreedToTerms: jest.fn(),
        showPassword: false,
        showConfirmPassword: false,
        togglePasswordVisibility: jest.fn(),
        toggleConfirmPasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        registrationSuccess: false,
        handleRegister: jest.fn(),
      });

      const { getByText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Sign In'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });
  });
});
