import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';
import { useLogin } from '../hooks/useLogin';
import { useAuthStore } from '@store/authStore';

// Mock dependencies
jest.mock('../hooks/useLogin');
jest.mock('@store/authStore');

jest.mock('@hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    paperTheme: {
      colors: {
        primary: '#6200ee',
        onSurfaceVariant: '#49454F',
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

jest.mock('react-native-paper', () => {
  const React = require('react');

  const MockTextInput = ({ label, value, onChangeText, disabled, testID, left, right }: any) => {
    return React.createElement('TextInput', {
      testID: testID || `input-${label?.toLowerCase()}`,
      value,
      onChangeText,
      editable: !disabled,
      placeholder: label,
    });
  };

  MockTextInput.Icon = ({ icon, onPress }: any) => {
    const React = require('react');
    if (onPress) {
      return React.createElement('TouchableOpacity', { onPress, testID: `icon-${icon}` });
    }
    // Return an empty View instead of null to avoid undefined component issues
    return React.createElement('View', { testID: `icon-${icon}` });
  };

  return {
    TextInput: MockTextInput,
    Button: ({ children, onPress, loading, disabled, testID }: any) => {
      const React = require('react');
      const isDisabled = disabled || loading;
      // Use a function component to properly handle the press event
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
          accessibilityState: { disabled: isDisabled },
        },
        React.createElement('Text', {}, children)
      );
    },
    Text: ({ children, testID, variant, style, onPress }: any) => {
      return React.createElement('Text', { testID, variant, style, onPress }, children);
    },
    Divider: () => {
      return React.createElement('View', { testID: 'divider' });
    },
  };
});

const mockNavigation = {
  navigate: jest.fn(),
};

// Get references to mocked functions
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('LoginScreen', () => {
  const mockUseLogin = useLogin as jest.MockedFunction<typeof useLogin>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for useAuthStore
    mockUseAuthStore.mockImplementation((selector: any) => {
      const store = {
        signInWithGoogle: jest.fn(),
      };
      return selector ? selector(store) : store;
    });
  });

  describe('LoginScreen_Rendering_DisplaysAllElements', () => {
    it('LoginScreen_WhenRendered_DisplaysTitle', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByTestId } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByTestId('layout-title')).toHaveTextContent('Welcome Back!');
    });

    it('LoginScreen_WhenRendered_DisplaysSubtitle', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByTestId } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByTestId('layout-subtitle')).toHaveTextContent('Sign in to continue');
    });

    it('LoginScreen_WhenRendered_DisplaysEmailInput', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByPlaceholderText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByPlaceholderText('Email')).toBeTruthy();
    });

    it('LoginScreen_WhenRendered_DisplaysPasswordInput', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByPlaceholderText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByPlaceholderText('Password')).toBeTruthy();
    });

    it('LoginScreen_WhenRendered_DisplaysSignInButton', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByText('Sign In')).toBeTruthy();
    });

    it('LoginScreen_WhenRendered_DisplaysForgotPasswordLink', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByText('Forgot Password?')).toBeTruthy();
    });

    it('LoginScreen_WhenRendered_DisplaysSignUpLink', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByText('Sign Up')).toBeTruthy();
    });
  });

  describe('LoginScreen_EmailInput_UpdatesState', () => {
    it('LoginScreen_WhenEmailChanged_CallsSetEmail', () => {
      const setEmail = jest.fn();
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail,
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByPlaceholderText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');

      expect(setEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('LoginScreen_WhenEmailHasValue_DisplaysValue', () => {
      mockUseLogin.mockReturnValue({
        email: 'test@example.com',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByPlaceholderText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByPlaceholderText('Email').props.value).toBe('test@example.com');
    });
  });

  describe('LoginScreen_PasswordInput_UpdatesState', () => {
    it('LoginScreen_WhenPasswordChanged_CallsSetPassword', () => {
      const setPassword = jest.fn();
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword,
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByPlaceholderText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

      expect(setPassword).toHaveBeenCalledWith('password123');
    });

    it('LoginScreen_WhenPasswordHasValue_DisplaysValue', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: 'password123',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByPlaceholderText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByPlaceholderText('Password').props.value).toBe('password123');
    });
  });

  describe('LoginScreen_SignInButton_HandlesLogin', () => {
    it('LoginScreen_WhenSignInPressed_CallsHandleLogin', () => {
      const handleLogin = jest.fn();
      mockUseLogin.mockReturnValue({
        email: 'test@example.com',
        setEmail: jest.fn(),
        password: 'password123',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        handleLogin,
      });

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Sign In'));

      expect(handleLogin).toHaveBeenCalledTimes(1);
    });

    it('LoginScreen_WhenLoading_DisablesSignInButton', () => {
      const handleLogin = jest.fn();
      mockUseLogin.mockReturnValue({
        email: 'test@example.com',
        setEmail: jest.fn(),
        password: 'password123',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: true,
        error: null,
        handleLogin,
      });

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Sign In'));

      // When disabled, pressing should not call handleLogin
      expect(handleLogin).not.toHaveBeenCalled();
    });
  });

  describe('LoginScreen_Navigation_WorksCorrectly', () => {
    it('LoginScreen_WhenForgotPasswordPressed_NavigatesToForgotPassword', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Forgot Password?'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('ForgotPassword');
    });

    it('LoginScreen_WhenSignUpPressed_NavigatesToRegister', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Sign Up'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Register');
    });

    it('LoginScreen_WhenLoading_DisablesForgotPasswordLink', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: true,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Forgot Password?'));

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('LoginScreen_WhenLoading_DisablesSignUpLink', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: true,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Sign Up'));

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('LoginScreen_ErrorHandling_DisplaysErrors', () => {
    it('LoginScreen_WhenErrorExists_DisplaysErrorMessage', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: 'Invalid email or password',
        handleLogin: jest.fn(),
      });

      const { getByTestId } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByTestId('error-message')).toHaveTextContent('Invalid email or password');
    });

    it('LoginScreen_WhenNoError_DoesNotDisplayErrorMessage', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        handleLogin: jest.fn(),
      });

      const { queryByTestId } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(queryByTestId('error-message')).toBeNull();
    });
  });

  describe('LoginScreen_LoadingState_DisablesInputs', () => {
    it('LoginScreen_WhenLoading_DisablesEmailInput', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: true,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByPlaceholderText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByPlaceholderText('Email').props.editable).toBe(false);
    });

    it('LoginScreen_WhenLoading_DisablesPasswordInput', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: true,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByPlaceholderText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByPlaceholderText('Password').props.editable).toBe(false);
    });

    it('LoginScreen_WhenNotLoading_EnablesInputs', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: false,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByPlaceholderText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByPlaceholderText('Email').props.editable).toBe(true);
      expect(getByPlaceholderText('Password').props.editable).toBe(true);
    });
  });

});
