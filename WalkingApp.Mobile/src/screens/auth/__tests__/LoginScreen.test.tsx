import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';
import LoginScreen from '../LoginScreen';
import { useLogin } from '../hooks/useLogin';
import { signInWithGoogleOAuth, supabase } from '@services/supabase';

// Mock Alert
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock dependencies
jest.mock('../hooks/useLogin');

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

// Mock supabase service
jest.mock('@services/supabase', () => ({
  signInWithGoogleOAuth: jest.fn(),
  supabase: {
    auth: {
      setSession: jest.fn(),
    },
  },
}));

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
  const RN = require('react-native');

  const MockTextInput = ({ label, value, onChangeText, disabled, testID, left, right }: any) => {
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
    Divider: () => {
      return React.createElement(RN.View, { testID: 'divider' });
    },
  };
});

const mockNavigation = {
  navigate: jest.fn(),
};

// Get references to mocked functions
const mockSignInWithGoogleOAuth = signInWithGoogleOAuth as jest.MockedFunction<typeof signInWithGoogleOAuth>;
const mockSetSession = supabase.auth.setSession as jest.MockedFunction<typeof supabase.auth.setSession>;
const mockOpenAuthSessionAsync = WebBrowser.openAuthSessionAsync as jest.MockedFunction<typeof WebBrowser.openAuthSessionAsync>;

// Get Alert reference
const { Alert } = require('react-native');
const mockAlert = Alert.alert;

describe('LoginScreen', () => {
  const mockUseLogin = useLogin as jest.MockedFunction<typeof useLogin>;

  beforeEach(() => {
    jest.clearAllMocks();
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
      mockUseLogin.mockReturnValue({
        email: 'test@example.com',
        setEmail: jest.fn(),
        password: 'password123',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: true,
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      const signInButton = getByText('Sign In').parent;
      expect(signInButton?.props.disabled).toBe(true);
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

  describe('LoginScreen_GoogleSignIn_HandlesOAuthFlow', () => {
    beforeEach(() => {
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
      jest.clearAllMocks();
    });

    it('LoginScreen_WhenGoogleButtonPressed_CallsSignInWithGoogleOAuth', async () => {
      mockSignInWithGoogleOAuth.mockResolvedValue({
        provider: 'google',
        url: 'https://accounts.google.com/oauth',
      } as any);
      mockOpenAuthSessionAsync.mockResolvedValue({
        type: 'dismissed',
      } as any);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockSignInWithGoogleOAuth).toHaveBeenCalled();
      });
    });

    it('LoginScreen_WhenOAuthUrlReceived_OpensWebBrowser', async () => {
      const mockOAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?test=true';
      mockSignInWithGoogleOAuth.mockResolvedValue({
        provider: 'google',
        url: mockOAuthUrl,
      } as any);
      mockOpenAuthSessionAsync.mockResolvedValue({
        type: 'dismissed',
      } as any);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockOpenAuthSessionAsync).toHaveBeenCalledWith(
          mockOAuthUrl,
          'walkingapp://'
        );
      });
    });

    it('LoginScreen_WhenOAuthSucceeds_ExtractsTokensFromUrl', async () => {
      mockSignInWithGoogleOAuth.mockResolvedValue({
        provider: 'google',
        url: 'https://accounts.google.com/oauth',
      } as any);
      mockOpenAuthSessionAsync.mockResolvedValue({
        type: 'success',
        url: 'walkingapp://#access_token=test-access-token&refresh_token=test-refresh-token',
      } as any);
      mockSetSession.mockResolvedValue({ data: { user: null, session: null }, error: null } as any);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockSetSession).toHaveBeenCalledWith({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
        });
      });
    });

    it('LoginScreen_WhenOAuthSucceeds_SetsSessionWithTokens', async () => {
      mockSignInWithGoogleOAuth.mockResolvedValue({
        provider: 'google',
        url: 'https://accounts.google.com/oauth',
      } as any);
      mockOpenAuthSessionAsync.mockResolvedValue({
        type: 'success',
        url: 'walkingapp://#access_token=abc123&refresh_token=def456',
      } as any);
      mockSetSession.mockResolvedValue({ data: { user: null, session: null }, error: null } as any);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockSetSession).toHaveBeenCalledTimes(1);
      });
    });

    it('LoginScreen_WhenOAuthUrlHasNoTokens_DoesNotSetSession', async () => {
      mockSignInWithGoogleOAuth.mockResolvedValue({
        provider: 'google',
        url: 'https://accounts.google.com/oauth',
      } as any);
      mockOpenAuthSessionAsync.mockResolvedValue({
        type: 'success',
        url: 'walkingapp://#error=access_denied',
      } as any);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockSetSession).not.toHaveBeenCalled();
      });
    });

    it('LoginScreen_WhenOAuthUrlHasOnlyAccessToken_DoesNotSetSession', async () => {
      mockSignInWithGoogleOAuth.mockResolvedValue({
        provider: 'google',
        url: 'https://accounts.google.com/oauth',
      } as any);
      mockOpenAuthSessionAsync.mockResolvedValue({
        type: 'success',
        url: 'walkingapp://#access_token=test-token',
      } as any);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockSetSession).not.toHaveBeenCalled();
      });
    });

    it('LoginScreen_WhenOAuthUrlHasOnlyRefreshToken_DoesNotSetSession', async () => {
      mockSignInWithGoogleOAuth.mockResolvedValue({
        provider: 'google',
        url: 'https://accounts.google.com/oauth',
      } as any);
      mockOpenAuthSessionAsync.mockResolvedValue({
        type: 'success',
        url: 'walkingapp://#refresh_token=test-refresh',
      } as any);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockSetSession).not.toHaveBeenCalled();
      });
    });

    it('LoginScreen_WhenOAuthDismissed_DoesNotSetSession', async () => {
      mockSignInWithGoogleOAuth.mockResolvedValue({
        provider: 'google',
        url: 'https://accounts.google.com/oauth',
      } as any);
      mockOpenAuthSessionAsync.mockResolvedValue({
        type: 'dismissed',
      } as any);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockSetSession).not.toHaveBeenCalled();
      });
    });

    it('LoginScreen_WhenOAuthCancelled_DoesNotSetSession', async () => {
      mockSignInWithGoogleOAuth.mockResolvedValue({
        provider: 'google',
        url: 'https://accounts.google.com/oauth',
      } as any);
      mockOpenAuthSessionAsync.mockResolvedValue({
        type: 'cancel',
      } as any);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockSetSession).not.toHaveBeenCalled();
      });
    });

    it('LoginScreen_WhenSignInWithGoogleOAuthFails_ShowsAlert', async () => {
      const mockError = new Error('OAuth configuration error');
      mockSignInWithGoogleOAuth.mockRejectedValue(mockError);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Sign In Error',
          'OAuth configuration error'
        );
      });
    });

    it('LoginScreen_WhenWebBrowserFails_ShowsAlert', async () => {
      mockSignInWithGoogleOAuth.mockResolvedValue({
        provider: 'google',
        url: 'https://accounts.google.com/oauth',
      } as any);
      const mockError = new Error('Browser unavailable');
      mockOpenAuthSessionAsync.mockRejectedValue(mockError);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Sign In Error', 'Browser unavailable');
      });
    });

    it('LoginScreen_WhenErrorHasNoMessage_ShowsGenericAlert', async () => {
      mockSignInWithGoogleOAuth.mockRejectedValue({});

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Sign In Error',
          'Failed to sign in with Google'
        );
      });
    });

    it('LoginScreen_WhenGoogleSignInStarted_ShowsLoadingState', async () => {
      mockSignInWithGoogleOAuth.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ provider: 'google', url: 'test' } as any), 100))
      );

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      // Button should be disabled during loading
      await waitFor(() => {
        const googleButton = getByText('Continue with Google').parent;
        expect(googleButton?.props.disabled).toBe(true);
      });
    });

    it('LoginScreen_WhenGoogleSignInCompletes_ResetsLoadingState', async () => {
      mockSignInWithGoogleOAuth.mockResolvedValue({
        provider: 'google',
        url: 'https://accounts.google.com/oauth',
      } as any);
      mockOpenAuthSessionAsync.mockResolvedValue({
        type: 'dismissed',
      } as any);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        const googleButton = getByText('Continue with Google').parent;
        expect(googleButton?.props.disabled).toBe(false);
      });
    });

    it('LoginScreen_WhenGoogleSignInFails_ResetsLoadingState', async () => {
      mockSignInWithGoogleOAuth.mockRejectedValue(new Error('Failed'));

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        const googleButton = getByText('Continue with Google').parent;
        expect(googleButton?.props.disabled).toBe(false);
      });
    });

    it('LoginScreen_WhenEmailLoadingActive_DisablesGoogleButton', () => {
      mockUseLogin.mockReturnValue({
        email: '',
        setEmail: jest.fn(),
        password: '',
        setPassword: jest.fn(),
        showPassword: false,
        togglePasswordVisibility: jest.fn(),
        isLoading: true, // Email login is loading
        error: null,
        handleLogin: jest.fn(),
      });

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      const googleButton = getByText('Continue with Google').parent;
      expect(googleButton?.props.disabled).toBe(true);
    });

    it('LoginScreen_WhenOAuthUrlIsNull_DoesNotOpenBrowser', async () => {
      mockSignInWithGoogleOAuth.mockResolvedValue({
        provider: 'google',
        url: null,
      } as any);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockOpenAuthSessionAsync).not.toHaveBeenCalled();
      });
    });

    it('LoginScreen_WhenOAuthUrlIsUndefined_DoesNotOpenBrowser', async () => {
      mockSignInWithGoogleOAuth.mockResolvedValue({
        provider: 'google',
        url: undefined,
      } as any);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockOpenAuthSessionAsync).not.toHaveBeenCalled();
      });
    });

    it('LoginScreen_WhenOAuthSuccessHasNoUrl_DoesNotSetSession', async () => {
      mockSignInWithGoogleOAuth.mockResolvedValue({
        provider: 'google',
        url: 'https://accounts.google.com/oauth',
      } as any);
      mockOpenAuthSessionAsync.mockResolvedValue({
        type: 'success',
        url: undefined,
      } as any);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockSetSession).not.toHaveBeenCalled();
      });
    });

    it('LoginScreen_WhenOAuthUrlHasNoFragment_DoesNotSetSession', async () => {
      mockSignInWithGoogleOAuth.mockResolvedValue({
        provider: 'google',
        url: 'https://accounts.google.com/oauth',
      } as any);
      mockOpenAuthSessionAsync.mockResolvedValue({
        type: 'success',
        url: 'walkingapp://',
      } as any);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockSetSession).not.toHaveBeenCalled();
      });
    });

    it('LoginScreen_LogsErrorToConsole_WhenGoogleSignInFails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockError = new Error('OAuth failed');
      mockSignInWithGoogleOAuth.mockRejectedValue(mockError);

      const { getByText } = render(<LoginScreen navigation={mockNavigation as any} route={{} as any} />);

      fireEvent.press(getByText('Continue with Google'));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Google sign-in error:', mockError);
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
