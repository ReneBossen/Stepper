import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ForgotPasswordScreen from '../ForgotPasswordScreen';
import { useForgotPassword } from '../hooks/useForgotPassword';

// Mock dependencies
jest.mock('../hooks/useForgotPassword');
jest.mock('@hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    paperTheme: {
      colors: {
        primary: '#6200ee',
        onSurfaceVariant: '#49454F',
        primaryContainer: '#EADDFF',
        surfaceVariant: '#E7E0EC',
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
  const RN = require('react-native');

  const MockTextInput = ({ label, value, onChangeText, disabled, testID }: any) => {
    return React.createElement(RN.TextInput, {
      testID: testID || `input-${label?.toLowerCase()}`,
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
    Surface: ({ children, testID }: any) => {
      return React.createElement(RN.View, { testID: testID || 'surface' }, children);
    },
  };
});

const mockNavigation = {
  navigate: jest.fn(),
};

describe('ForgotPasswordScreen', () => {
  const mockUseForgotPassword = useForgotPassword as jest.MockedFunction<typeof useForgotPassword>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ForgotPasswordScreen_Rendering_DisplaysAllElements', () => {
    it('ForgotPasswordScreen_WhenRendered_DisplaysTitle', () => {
      mockUseForgotPassword.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        isLoading: false,
        emailSent: false,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByTestId } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByTestId('layout-title')).toHaveTextContent('Forgot Password?');
    });

    it('ForgotPasswordScreen_WhenRendered_DisplaysEmailInput', () => {
      mockUseForgotPassword.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        isLoading: false,
        emailSent: false,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByPlaceholderText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByPlaceholderText('Email')).toBeTruthy();
    });

    it('ForgotPasswordScreen_WhenRendered_DisplaysSendResetLinkButton', () => {
      mockUseForgotPassword.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        isLoading: false,
        emailSent: false,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByText('Send Reset Link')).toBeTruthy();
    });

    it('ForgotPasswordScreen_WhenRendered_DisplaysInfoMessage', () => {
      mockUseForgotPassword.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        isLoading: false,
        emailSent: false,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByText(/We'll send you a link to reset your password/)).toBeTruthy();
    });

    it('ForgotPasswordScreen_WhenRendered_DisplaysSignInLink', () => {
      mockUseForgotPassword.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        isLoading: false,
        emailSent: false,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByText('Sign In')).toBeTruthy();
    });
  });

  describe('ForgotPasswordScreen_EmailInput_UpdatesState', () => {
    it('ForgotPasswordScreen_WhenEmailChanged_CallsSetEmail', () => {
      const setEmail = jest.fn();
      mockUseForgotPassword.mockReturnValue({
        email: '',
        setEmail,
        isLoading: false,
        emailSent: false,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByPlaceholderText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');

      expect(setEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('ForgotPasswordScreen_WhenEmailHasValue_DisplaysValue', () => {
      mockUseForgotPassword.mockReturnValue({
        email: 'test@example.com',
        setEmail: jest.fn(),
        isLoading: false,
        emailSent: false,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByPlaceholderText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByPlaceholderText('Email').props.value).toBe('test@example.com');
    });
  });

  describe('ForgotPasswordScreen_SendResetLinkButton_HandlesReset', () => {
    it('ForgotPasswordScreen_WhenSendResetLinkPressed_CallsHandleResetPassword', () => {
      const handleResetPassword = jest.fn();
      mockUseForgotPassword.mockReturnValue({
        email: 'test@example.com',
        setEmail: jest.fn(),
        isLoading: false,
        emailSent: false,
        error: null,
        handleResetPassword,
        handleResendEmail: jest.fn(),
      });

      const { getByText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Send Reset Link'));

      expect(handleResetPassword).toHaveBeenCalledTimes(1);
    });

    it('ForgotPasswordScreen_WhenLoading_DisablesSendResetLinkButton', () => {
      mockUseForgotPassword.mockReturnValue({
        email: 'test@example.com',
        setEmail: jest.fn(),
        isLoading: true,
        emailSent: false,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      const sendButton = getByText('Send Reset Link').parent;
      expect(sendButton?.props.disabled).toBe(true);
    });
  });

  describe('ForgotPasswordScreen_SuccessState_DisplaysSuccessScreen', () => {
    it('ForgotPasswordScreen_WhenEmailSent_DisplaysSuccessMessage', () => {
      mockUseForgotPassword.mockReturnValue({
        email: 'test@example.com',
        setEmail: jest.fn(),
        isLoading: false,
        emailSent: true,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByText('Check Your Email')).toBeTruthy();
      expect(getByText('test@example.com')).toBeTruthy();
      expect(getByText(/We've sent a password reset link to:/)).toBeTruthy();
    });

    it('ForgotPasswordScreen_WhenEmailSent_DisplaysBackToLoginButton', () => {
      mockUseForgotPassword.mockReturnValue({
        email: 'test@example.com',
        setEmail: jest.fn(),
        isLoading: false,
        emailSent: true,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByText('Back to Login')).toBeTruthy();
    });

    it('ForgotPasswordScreen_WhenEmailSent_DisplaysResendLink', () => {
      mockUseForgotPassword.mockReturnValue({
        email: 'test@example.com',
        setEmail: jest.fn(),
        isLoading: false,
        emailSent: true,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByText('Resend Link')).toBeTruthy();
    });

    it('ForgotPasswordScreen_WhenBackToLoginPressed_NavigatesToLogin', () => {
      mockUseForgotPassword.mockReturnValue({
        email: 'test@example.com',
        setEmail: jest.fn(),
        isLoading: false,
        emailSent: true,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Back to Login'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });

    it('ForgotPasswordScreen_WhenResendLinkPressed_CallsHandleResendEmail', () => {
      const handleResendEmail = jest.fn();
      mockUseForgotPassword.mockReturnValue({
        email: 'test@example.com',
        setEmail: jest.fn(),
        isLoading: false,
        emailSent: true,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail,
      });

      const { getByText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Resend Link'));

      expect(handleResendEmail).toHaveBeenCalledTimes(1);
    });

    it('ForgotPasswordScreen_WhenResendLinkPressedWhileLoading_DoesNotCallHandleResendEmail', () => {
      const handleResendEmail = jest.fn();
      mockUseForgotPassword.mockReturnValue({
        email: 'test@example.com',
        setEmail: jest.fn(),
        isLoading: true,
        emailSent: true,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail,
      });

      const { getByText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Resend Link'));

      expect(handleResendEmail).not.toHaveBeenCalled();
    });
  });

  describe('ForgotPasswordScreen_ErrorHandling_DisplaysErrors', () => {
    it('ForgotPasswordScreen_WhenErrorExists_DisplaysErrorMessage', () => {
      mockUseForgotPassword.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        isLoading: false,
        emailSent: false,
        error: 'Email is required',
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByTestId } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByTestId('error-message')).toHaveTextContent('Email is required');
    });

    it('ForgotPasswordScreen_WhenNoError_DoesNotDisplayErrorMessage', () => {
      mockUseForgotPassword.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        isLoading: false,
        emailSent: false,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { queryByTestId } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(queryByTestId('error-message')).toBeNull();
    });
  });

  describe('ForgotPasswordScreen_LoadingState_DisablesInputs', () => {
    it('ForgotPasswordScreen_WhenLoading_DisablesEmailInput', () => {
      mockUseForgotPassword.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        isLoading: true,
        emailSent: false,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByPlaceholderText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByPlaceholderText('Email').props.editable).toBe(false);
    });

    it('ForgotPasswordScreen_WhenNotLoading_EnablesEmailInput', () => {
      mockUseForgotPassword.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        isLoading: false,
        emailSent: false,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByPlaceholderText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      expect(getByPlaceholderText('Email').props.editable).toBe(true);
    });
  });

  describe('ForgotPasswordScreen_Navigation_WorksCorrectly', () => {
    it('ForgotPasswordScreen_WhenSignInPressed_NavigatesToLogin', () => {
      mockUseForgotPassword.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        isLoading: false,
        emailSent: false,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Sign In'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });

    it('ForgotPasswordScreen_WhenLoadingAndSignInPressed_DoesNotNavigate', () => {
      mockUseForgotPassword.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        isLoading: true,
        emailSent: false,
        error: null,
        handleResetPassword: jest.fn(),
        handleResendEmail: jest.fn(),
      });

      const { getByText } = render(<ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Sign In'));

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });
});
