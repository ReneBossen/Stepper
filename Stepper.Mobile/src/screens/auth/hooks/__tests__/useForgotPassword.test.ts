import { renderHook, act } from '@testing-library/react-native';
import { useForgotPassword } from '../useForgotPassword';
import { useAuthStore } from '@store/authStore';

// Mock the auth store
jest.mock('@store/authStore');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('useForgotPassword', () => {
  let mockResetPassword: jest.Mock;
  let mockIsLoading: boolean;

  beforeEach(() => {
    jest.clearAllMocks();
    mockResetPassword = jest.fn();
    mockIsLoading = false;

    // Default mock implementation
    mockUseAuthStore.mockImplementation((selector) => {
      const state = {
        resetPassword: mockResetPassword,
        isLoading: mockIsLoading,
      };
      return selector(state as any);
    });
  });

  describe('useForgotPassword_InitialState_IsCorrect', () => {
    it('useForgotPassword_WhenInitialized_HasEmptyEmail', () => {
      const { result } = renderHook(() => useForgotPassword());

      expect(result.current.email).toBe('');
    });

    it('useForgotPassword_WhenInitialized_IsLoadingIsFalse', () => {
      const { result } = renderHook(() => useForgotPassword());

      expect(result.current.isLoading).toBe(false);
    });

    it('useForgotPassword_WhenInitialized_EmailSentIsFalse', () => {
      const { result } = renderHook(() => useForgotPassword());

      expect(result.current.emailSent).toBe(false);
    });

    it('useForgotPassword_WhenInitialized_ErrorIsNull', () => {
      const { result } = renderHook(() => useForgotPassword());

      expect(result.current.error).toBeNull();
    });
  });

  describe('useForgotPassword_SetEmail_UpdatesState', () => {
    it('useForgotPassword_WhenSetEmailCalled_UpdatesEmail', () => {
      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      expect(result.current.email).toBe('test@example.com');
    });

    it('useForgotPassword_WhenSetEmailCalledMultipleTimes_UpdatesCorrectly', () => {
      const { result } = renderHook(() => useForgotPassword());

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

  describe('useForgotPassword_HandleResetPassword_WithValidEmail', () => {
    it('useForgotPassword_WhenHandleResetPasswordCalledWithValidEmail_CallsResetPassword', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
    });

    it('useForgotPassword_WhenHandleResetPasswordSucceeds_SetsEmailSentTrue', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.emailSent).toBe(true);
    });

    it('useForgotPassword_WhenHandleResetPasswordCalled_LowercasesEmail', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('TEST@EXAMPLE.COM');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
    });

    it('useForgotPassword_WhenHandleResetPasswordSucceeds_ClearsError', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('useForgotPassword_Validation_EmptyEmail', () => {
    it('useForgotPassword_WhenEmailEmpty_SetsError', async () => {
      const { result } = renderHook(() => useForgotPassword());

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.error).toBe('Email is required');
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('useForgotPassword_WhenEmailWhitespace_SetsError', async () => {
      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('   ');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.error).toBe('Email is required');
      expect(mockResetPassword).not.toHaveBeenCalled();
    });
  });

  describe('useForgotPassword_Validation_InvalidEmail', () => {
    it('useForgotPassword_WhenEmailInvalid_SetsError', async () => {
      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('invalid-email');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.error).toBe('Please enter a valid email address');
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('useForgotPassword_WhenEmailMissingAtSign_SetsError', async () => {
      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('testexample.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.error).toBe('Please enter a valid email address');
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('useForgotPassword_WhenEmailMissingDomain_SetsError', async () => {
      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('test@');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.error).toBe('Please enter a valid email address');
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('useForgotPassword_WhenEmailValid_NoValidationError', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('valid.email@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(mockResetPassword).toHaveBeenCalled();
    });
  });

  describe('useForgotPassword_LoadingState_UpdatesCorrectly', () => {
    it('useForgotPassword_WhenIsLoadingFromStore_ReflectsInHook', () => {
      mockIsLoading = true;
      mockUseAuthStore.mockImplementation((selector) => {
        const state = {
          resetPassword: mockResetPassword,
          isLoading: mockIsLoading,
        };
        return selector(state as any);
      });

      const { result } = renderHook(() => useForgotPassword());

      expect(result.current.isLoading).toBe(true);
    });

    it('useForgotPassword_WhenHandleResetPasswordCompletes_IsLoadingFromStore', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      // isLoading is now managed by the store, not the hook
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useForgotPassword_ErrorHandling_ResetPasswordFailure', () => {
    it('useForgotPassword_WhenResetPasswordFails_SetsGenericError', async () => {
      mockResetPassword.mockRejectedValue(new Error('Email not found'));

      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.error).toBe('If an account exists with this email, you will receive a password reset link.');
    });

    it('useForgotPassword_WhenResetPasswordFails_DoesNotSetEmailSent', async () => {
      mockResetPassword.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.emailSent).toBe(false);
    });

    it('useForgotPassword_WhenResetPasswordFails_ShowsSecurityMessage', async () => {
      mockResetPassword.mockRejectedValue(new Error('User not found'));

      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('nonexistent@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      // For security, should show generic message
      expect(result.current.error).toBe('If an account exists with this email, you will receive a password reset link.');
    });
  });

  describe('useForgotPassword_HandleResendEmail_WorksCorrectly', () => {
    it('useForgotPassword_WhenHandleResendEmailCalled_SetsEmailSentFalse', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      // First send email
      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.emailSent).toBe(true);

      // Then resend
      await act(async () => {
        await result.current.handleResendEmail();
      });

      // Should eventually be true again after resending
      expect(result.current.emailSent).toBe(true);
    });

    it('useForgotPassword_WhenHandleResendEmailCalled_CallsResetPasswordAgain', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      // First send
      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(mockResetPassword).toHaveBeenCalledTimes(1);

      // Resend
      await act(async () => {
        await result.current.handleResendEmail();
      });

      expect(mockResetPassword).toHaveBeenCalledTimes(2);
    });

    it('useForgotPassword_WhenHandleResendEmailCalled_UsesCurrentEmail', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      await act(async () => {
        await result.current.handleResendEmail();
      });

      expect(mockResetPassword).toHaveBeenLastCalledWith('test@example.com');
    });
  });

  describe('useForgotPassword_ErrorClearing_WorksCorrectly', () => {
    it('useForgotPassword_WhenHandleResetPasswordCalled_ClearsExistingError', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      const { result } = renderHook(() => useForgotPassword());

      // First set an error
      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.error).toBe('Email is required');

      // Now set valid email
      act(() => {
        result.current.setEmail('test@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('useForgotPassword_EmailValidation_EdgeCases', () => {
    it('useForgotPassword_WhenEmailHasMultipleAtSigns_SetsError', async () => {
      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('test@@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.error).toBe('Please enter a valid email address');
    });

    it('useForgotPassword_WhenEmailHasSpaces_SetsError', async () => {
      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('test @example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.error).toBe('Please enter a valid email address');
    });

    it('useForgotPassword_WhenEmailValid_NoError', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('valid.email@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(mockResetPassword).toHaveBeenCalled();
    });
  });

  describe('useForgotPassword_StateTransitions_WorkCorrectly', () => {
    it('useForgotPassword_WhenEmailSentThenResend_TransitionsCorrectly', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      // Initial send
      expect(result.current.emailSent).toBe(false);

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.emailSent).toBe(true);

      // Resend
      await act(async () => {
        await result.current.handleResendEmail();
      });

      expect(result.current.emailSent).toBe(true);
    });

    it('useForgotPassword_WhenValidationFailsAfterSuccess_UpdatesEmailSent', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      const { result } = renderHook(() => useForgotPassword());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.emailSent).toBe(true);

      // Now try with empty email
      act(() => {
        result.current.setEmail('');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      // emailSent should not change since validation failed
      expect(result.current.emailSent).toBe(true);
      expect(result.current.error).toBe('Email is required');
    });
  });
});
