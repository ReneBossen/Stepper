import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useLogin } from '../useLogin';
import { useAuthStore } from '@store/authStore';

// Mock the auth store
jest.mock('@store/authStore');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<any>;

describe('useLogin', () => {
  const mockSignIn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockImplementation((selector: any) => {
      const state = {
        signIn: mockSignIn,
        isLoading: false,
      };
      return selector(state);
    });
  });

  describe('useLogin_InitialState_IsCorrect', () => {
    it('useLogin_WhenInitialized_HasEmptyEmail', () => {
      const { result } = renderHook(() => useLogin());

      expect(result.current.email).toBe('');
    });

    it('useLogin_WhenInitialized_HasEmptyPassword', () => {
      const { result } = renderHook(() => useLogin());

      expect(result.current.password).toBe('');
    });

    it('useLogin_WhenInitialized_ShowPasswordIsFalse', () => {
      const { result } = renderHook(() => useLogin());

      expect(result.current.showPassword).toBe(false);
    });

    it('useLogin_WhenInitialized_ErrorIsNull', () => {
      const { result } = renderHook(() => useLogin());

      expect(result.current.error).toBeNull();
    });

    it('useLogin_WhenInitialized_IsLoadingIsFalse', () => {
      const { result } = renderHook(() => useLogin());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useLogin_SetEmail_UpdatesState', () => {
    it('useLogin_WhenSetEmailCalled_UpdatesEmail', () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      expect(result.current.email).toBe('test@example.com');
    });

    it('useLogin_WhenSetEmailCalledMultipleTimes_UpdatesCorrectly', () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('first@example.com');
      });

      expect(result.current.email).toBe('first@example.com');

      act(() => {
        result.current.setEmail('second@example.com');
      });

      expect(result.current.email).toBe('second@example.com');
    });
  });

  describe('useLogin_SetPassword_UpdatesState', () => {
    it('useLogin_WhenSetPasswordCalled_UpdatesPassword', () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setPassword('password123');
      });

      expect(result.current.password).toBe('password123');
    });

    it('useLogin_WhenSetPasswordCalledMultipleTimes_UpdatesCorrectly', () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setPassword('first123');
      });

      expect(result.current.password).toBe('first123');

      act(() => {
        result.current.setPassword('second456');
      });

      expect(result.current.password).toBe('second456');
    });
  });

  describe('useLogin_TogglePasswordVisibility_WorksCorrectly', () => {
    it('useLogin_WhenTogglePasswordVisibilityCalled_TogglesShowPassword', () => {
      const { result } = renderHook(() => useLogin());

      expect(result.current.showPassword).toBe(false);

      act(() => {
        result.current.togglePasswordVisibility();
      });

      expect(result.current.showPassword).toBe(true);
    });

    it('useLogin_WhenTogglePasswordVisibilityCalledTwice_TogglesBackToFalse', () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.togglePasswordVisibility();
      });

      expect(result.current.showPassword).toBe(true);

      act(() => {
        result.current.togglePasswordVisibility();
      });

      expect(result.current.showPassword).toBe(false);
    });
  });

  describe('useLogin_HandleLogin_WithValidCredentials', () => {
    it('useLogin_WhenHandleLoginCalledWithValidCredentials_CallsSignIn', async () => {
      mockSignIn.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('useLogin_WhenHandleLoginSucceeds_ClearsError', async () => {
      mockSignIn.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(result.current.error).toBeNull();
    });

    it('useLogin_WhenHandleLoginCalled_LowercasesEmail', async () => {
      mockSignIn.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('TEST@EXAMPLE.COM');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  describe('useLogin_HandleLogin_Validation_EmptyFields', () => {
    it('useLogin_WhenEmailEmpty_SetsError', async () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(result.current.error).toBe('Email is required');
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('useLogin_WhenEmailWhitespace_SetsError', async () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('   ');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(result.current.error).toBe('Email is required');
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('useLogin_WhenPasswordEmpty_SetsError', async () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(result.current.error).toBe('Password is required');
      expect(mockSignIn).not.toHaveBeenCalled();
    });
  });

  describe('useLogin_HandleLogin_Validation_InvalidFormat', () => {
    it('useLogin_WhenEmailInvalid_SetsError', async () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('invalid-email');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(result.current.error).toBe('Please enter a valid email address');
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('useLogin_WhenEmailMissingAtSign_SetsError', async () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('testexample.com');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(result.current.error).toBe('Please enter a valid email address');
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('useLogin_WhenEmailMissingDomain_SetsError', async () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('test@');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(result.current.error).toBe('Please enter a valid email address');
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('useLogin_WhenPasswordTooShort_SetsError', async () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('12345');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(result.current.error).toBe('Password must be at least 6 characters');
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('useLogin_WhenPasswordExactly6Characters_CallsSignIn', async () => {
      mockSignIn.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('123456');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(mockSignIn).toHaveBeenCalled();
    });
  });

  describe('useLogin_HandleLogin_ErrorHandling', () => {
    it('useLogin_WhenSignInFails_SetsError', async () => {
      mockSignIn.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(result.current.error).toBe('Invalid credentials');
    });

    it('useLogin_WhenSignInFailsWithoutMessage_SetsDefaultError', async () => {
      mockSignIn.mockRejectedValue(new Error());

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(result.current.error).toBe('Invalid email or password');
    });

    it('useLogin_WhenSignInFailsWithGenericError_SetsDefaultError', async () => {
      mockSignIn.mockRejectedValue({ message: null });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(result.current.error).toBe('Invalid email or password');
    });
  });

  describe('useLogin_HandleLogin_ClearsErrors', () => {
    it('useLogin_WhenHandleLoginCalled_ClearsExistingError', async () => {
      mockSignIn.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLogin());

      // First set an error
      act(() => {
        result.current.setEmail('');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(result.current.error).toBe('Email is required');

      // Now set valid credentials
      act(() => {
        result.current.setEmail('test@example.com');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('useLogin_IsLoading_ReflectsStoreState', () => {
    it('useLogin_WhenStoreIsLoadingTrue_ReturnsTrue', () => {
      mockUseAuthStore.mockImplementation((selector: any) => {
        const state = {
          signIn: mockSignIn,
          isLoading: true,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useLogin());

      expect(result.current.isLoading).toBe(true);
    });

    it('useLogin_WhenStoreIsLoadingFalse_ReturnsFalse', () => {
      mockUseAuthStore.mockImplementation((selector: any) => {
        const state = {
          signIn: mockSignIn,
          isLoading: false,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useLogin());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useLogin_EmailValidation_EdgeCases', () => {
    it('useLogin_WhenEmailHasMultipleAtSigns_SetsError', async () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('test@@example.com');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(result.current.error).toBe('Please enter a valid email address');
    });

    it('useLogin_WhenEmailHasSpaces_SetsError', async () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('test @example.com');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(result.current.error).toBe('Please enter a valid email address');
    });

    it('useLogin_WhenEmailValid_NoError', async () => {
      mockSignIn.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setEmail('valid.email@example.com');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleLogin();
      });

      expect(mockSignIn).toHaveBeenCalled();
    });
  });
});
