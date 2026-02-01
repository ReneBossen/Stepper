import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RegisterScreen from '../RegisterScreen';
import { useRegister } from '../hooks/useRegister';

// Mock dependencies
jest.mock('../hooks/useRegister');
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    // Execute the callback immediately for testing
    callback();
  }),
}));
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

jest.mock('@screens/legal', () => ({
  LegalModal: () => null,
  TERMS_OF_SERVICE_CONTENT: 'Terms content',
  PRIVACY_POLICY_CONTENT: 'Privacy content',
}));

jest.mock('react-native-paper', () => {
  const React = require('react');

  const MockTextInput = ({ label, value, onChangeText, disabled, testID }: any) => {
    return React.createElement('TextInput', {
      testID: testID || `input-${label?.toLowerCase().replace(/\s/g, '-')}`,
      value,
      onChangeText,
      editable: !disabled,
      placeholder: label,
    });
  };

  MockTextInput.Icon = () => React.createElement('View');

  return {
    TextInput: MockTextInput,
    Button: ({ children, onPress, loading, disabled, testID }: any) => {
      const React = require('react');
      const isDisabled = disabled || loading;
      const handlePress = () => {
        if (!isDisabled && onPress) {
          onPress();
        }
      };
      return React.createElement(
        'TouchableOpacity',
        {
          testID: testID || 'button',
          onPress: handlePress,
          disabled: isDisabled,
        },
        React.createElement('Text', {}, children)
      );
    },
    Text: ({ children, testID, variant, style }: any) => {
      return React.createElement('Text', { testID, variant, style }, children);
    },
    Checkbox: ({ status, onPress, disabled }: any) => {
      const React = require('react');
      const handlePress = () => {
        if (!disabled && onPress) {
          onPress();
        }
      };
      return React.createElement(
        'TouchableOpacity',
        {
          testID: 'checkbox',
          onPress: handlePress,
          disabled,
        },
        React.createElement('Text', {}, status === 'checked' ? '☑' : '☐')
      );
    },
    Surface: ({ children, testID }: any) => {
      return React.createElement('View', { testID: testID || 'surface' }, children);
    },
    useTheme: () => ({
      colors: {
        primary: '#6200ee',
        background: '#ffffff',
        surface: '#ffffff',
        onSurface: '#000000',
        onSurfaceVariant: '#49454F',
      },
    }),
    Portal: ({ children }: any) => children,
    Modal: ({ children, visible }: any) => visible ? React.createElement('View', { testID: 'modal' }, children) : null,
    IconButton: ({ onPress, icon, testID }: any) =>
      React.createElement('TouchableOpacity', { onPress, testID: testID || `icon-${icon}` }),
    Divider: () => React.createElement('View', { testID: 'divider' }),
  };
});

const mockNavigation = {
  navigate: jest.fn(),
};

// Base mock values for useRegister hook
const createMockUseRegisterReturn = (overrides = {}) => ({
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
  fieldErrors: {},
  clearFieldError: jest.fn(),
  resetForm: jest.fn(),
  registrationSuccess: false,
  handleRegister: jest.fn(),
  ...overrides,
});

describe('RegisterScreen', () => {
  const mockUseRegister = useRegister as jest.MockedFunction<typeof useRegister>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RegisterScreen_Rendering_DisplaysAllElements', () => {
    it('RegisterScreen_WhenRendered_DisplaysTitle', () => {
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn());

      const { getByTestId } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByTestId('layout-title')).toHaveTextContent('Create Account');
    });

    it('RegisterScreen_WhenRendered_DisplaysAllInputs', () => {
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn());

      const { getByPlaceholderText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByPlaceholderText('Display Name')).toBeTruthy();
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
      expect(getByPlaceholderText('Confirm Password')).toBeTruthy();
    });

    it('RegisterScreen_WhenRendered_DisplaysTermsCheckbox', () => {
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn());

      const { getByTestId } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByTestId('checkbox')).toBeTruthy();
    });

    it('RegisterScreen_WhenRendered_DisplaysSignUpButton', () => {
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn());

      const { getByText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByText('Sign Up')).toBeTruthy();
    });
  });

  describe('RegisterScreen_InputHandling_UpdatesState', () => {
    it('RegisterScreen_WhenDisplayNameChanged_CallsSetDisplayName', () => {
      const setDisplayName = jest.fn();
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn({ setDisplayName }));

      const { getByPlaceholderText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.changeText(getByPlaceholderText('Display Name'), 'John Doe');

      expect(setDisplayName).toHaveBeenCalledWith('John Doe');
    });

    it('RegisterScreen_WhenEmailChanged_CallsSetEmail', () => {
      const setEmail = jest.fn();
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn({ setEmail }));

      const { getByPlaceholderText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');

      expect(setEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('RegisterScreen_WhenPasswordChanged_CallsSetPassword', () => {
      const setPassword = jest.fn();
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn({ setPassword }));

      const { getByPlaceholderText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

      expect(setPassword).toHaveBeenCalledWith('password123');
    });

    it('RegisterScreen_WhenConfirmPasswordChanged_CallsSetConfirmPassword', () => {
      const setConfirmPassword = jest.fn();
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn({ setConfirmPassword }));

      const { getByPlaceholderText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password123');

      expect(setConfirmPassword).toHaveBeenCalledWith('password123');
    });
  });

  describe('RegisterScreen_TermsCheckbox_TogglesCorrectly', () => {
    it('RegisterScreen_WhenCheckboxPressed_TogglesAgreedToTerms', () => {
      const setAgreedToTerms = jest.fn();
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn({ setAgreedToTerms }));

      const { getByTestId } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByTestId('checkbox'));

      expect(setAgreedToTerms).toHaveBeenCalledWith(true);
    });

    it('RegisterScreen_WhenAgreedToTermsTrue_DisplaysCheckedCheckbox', () => {
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn({ agreedToTerms: true }));

      const { getByTestId } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByTestId('checkbox')).toHaveTextContent('☑');
    });
  });

  describe('RegisterScreen_SignUpButton_HandlesRegistration', () => {
    it('RegisterScreen_WhenSignUpPressed_CallsHandleRegister', () => {
      const handleRegister = jest.fn();
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn({
        displayName: 'John Doe',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        agreedToTerms: true,
        handleRegister,
      }));

      const { getByText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Sign Up'));

      expect(handleRegister).toHaveBeenCalledTimes(1);
    });

    it('RegisterScreen_WhenLoading_DisablesSignUpButton', () => {
      const handleRegister = jest.fn();
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn({
        isLoading: true,
        handleRegister,
      }));

      const { getByText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Sign Up'));

      // When disabled, pressing should not call handleRegister
      expect(handleRegister).not.toHaveBeenCalled();
    });
  });

  describe('RegisterScreen_PasswordStrength_DisplaysCorrectly', () => {
    it('RegisterScreen_WhenPasswordEntered_DisplaysPasswordStrength', () => {
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn({ password: 'password123' }));

      const { getByTestId } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByTestId('password-strength')).toBeTruthy();
    });

    it('RegisterScreen_WhenNoPassword_DoesNotDisplayPasswordStrength', () => {
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn());

      const { queryByTestId } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(queryByTestId('password-strength')).toBeNull();
    });
  });

  describe('RegisterScreen_SuccessState_DisplaysSuccessScreen', () => {
    it('RegisterScreen_WhenRegistrationSuccess_DisplaysSuccessMessage', () => {
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn({
        email: 'test@example.com',
        registrationSuccess: true,
      }));

      const { getByText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByText('Check Your Email')).toBeTruthy();
      expect(getByText('test@example.com')).toBeTruthy();
    });

    it('RegisterScreen_WhenRegistrationSuccess_DisplaysBackToLoginButton', () => {
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn({
        email: 'test@example.com',
        registrationSuccess: true,
      }));

      const { getByText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByText('Back to Login')).toBeTruthy();
    });

    it('RegisterScreen_WhenBackToLoginPressed_NavigatesToLogin', () => {
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn({
        email: 'test@example.com',
        registrationSuccess: true,
      }));

      const { getByText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Back to Login'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });
  });

  describe('RegisterScreen_ErrorHandling_DisplaysErrors', () => {
    it('RegisterScreen_WhenErrorExists_DisplaysErrorMessage', () => {
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn({
        error: 'Email already exists',
      }));

      const { getByTestId } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByTestId('error-message')).toHaveTextContent('Email already exists');
    });
  });

  describe('RegisterScreen_LoadingState_DisablesInputs', () => {
    it('RegisterScreen_WhenLoading_DisablesAllInputs', () => {
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn({ isLoading: true }));

      const { getByPlaceholderText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByPlaceholderText('Display Name').props.editable).toBe(false);
      expect(getByPlaceholderText('Email').props.editable).toBe(false);
      expect(getByPlaceholderText('Password').props.editable).toBe(false);
      expect(getByPlaceholderText('Confirm Password').props.editable).toBe(false);
    });
  });

  describe('RegisterScreen_Navigation_WorksCorrectly', () => {
    it('RegisterScreen_WhenSignInPressed_NavigatesToLogin', () => {
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn());

      const { getByText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Sign In'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });
  });

  describe('RegisterScreen_FieldErrors_DisplaysErrorState', () => {
    it('RegisterScreen_WhenFieldErrorsExist_ClearsOnInput', () => {
      const clearFieldError = jest.fn();
      mockUseRegister.mockReturnValue(createMockUseRegisterReturn({
        fieldErrors: { displayName: 'Display name is required' },
        clearFieldError,
      }));

      const { getByPlaceholderText } = render(<RegisterScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.changeText(getByPlaceholderText('Display Name'), 'John');

      expect(clearFieldError).toHaveBeenCalledWith('displayName');
    });
  });
});
