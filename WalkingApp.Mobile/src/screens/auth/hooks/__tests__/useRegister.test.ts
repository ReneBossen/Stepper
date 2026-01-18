import { renderHook, act } from '@testing-library/react-native';
import { useRegister } from '../useRegister';
import { useAuthStore } from '@store/authStore';

// Mock the auth store
jest.mock('@store/authStore');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<any>;

describe('useRegister', () => {
  const mockSignUp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockImplementation((selector: any) => {
      const state = {
        signUp: mockSignUp,
        isLoading: false,
      };
      return selector(state);
    });
  });

  describe('useRegister_InitialState_IsCorrect', () => {
    it('useRegister_WhenInitialized_HasEmptyDisplayName', () => {
      const { result } = renderHook(() => useRegister());

      expect(result.current.displayName).toBe('');
    });

    it('useRegister_WhenInitialized_HasEmptyEmail', () => {
      const { result } = renderHook(() => useRegister());

      expect(result.current.email).toBe('');
    });

    it('useRegister_WhenInitialized_HasEmptyPassword', () => {
      const { result } = renderHook(() => useRegister());

      expect(result.current.password).toBe('');
    });

    it('useRegister_WhenInitialized_HasEmptyConfirmPassword', () => {
      const { result } = renderHook(() => useRegister());

      expect(result.current.confirmPassword).toBe('');
    });

    it('useRegister_WhenInitialized_AgreedToTermsIsFalse', () => {
      const { result } = renderHook(() => useRegister());

      expect(result.current.agreedToTerms).toBe(false);
    });

    it('useRegister_WhenInitialized_ShowPasswordIsFalse', () => {
      const { result } = renderHook(() => useRegister());

      expect(result.current.showPassword).toBe(false);
    });

    it('useRegister_WhenInitialized_ShowConfirmPasswordIsFalse', () => {
      const { result } = renderHook(() => useRegister());

      expect(result.current.showConfirmPassword).toBe(false);
    });

    it('useRegister_WhenInitialized_ErrorIsNull', () => {
      const { result } = renderHook(() => useRegister());

      expect(result.current.error).toBeNull();
    });

    it('useRegister_WhenInitialized_RegistrationSuccessIsFalse', () => {
      const { result } = renderHook(() => useRegister());

      expect(result.current.registrationSuccess).toBe(false);
    });
  });

  describe('useRegister_StateSetters_UpdateCorrectly', () => {
    it('useRegister_WhenSetDisplayNameCalled_UpdatesDisplayName', () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
      });

      expect(result.current.displayName).toBe('John Doe');
    });

    it('useRegister_WhenSetEmailCalled_UpdatesEmail', () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      expect(result.current.email).toBe('test@example.com');
    });

    it('useRegister_WhenSetPasswordCalled_UpdatesPassword', () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setPassword('password123');
      });

      expect(result.current.password).toBe('password123');
    });

    it('useRegister_WhenSetConfirmPasswordCalled_UpdatesConfirmPassword', () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setConfirmPassword('password123');
      });

      expect(result.current.confirmPassword).toBe('password123');
    });

    it('useRegister_WhenSetAgreedToTermsCalled_UpdatesAgreedToTerms', () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setAgreedToTerms(true);
      });

      expect(result.current.agreedToTerms).toBe(true);
    });
  });

  describe('useRegister_PasswordVisibility_TogglesCorrectly', () => {
    it('useRegister_WhenTogglePasswordVisibilityCalled_TogglesShowPassword', () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.togglePasswordVisibility();
      });

      expect(result.current.showPassword).toBe(true);

      act(() => {
        result.current.togglePasswordVisibility();
      });

      expect(result.current.showPassword).toBe(false);
    });

    it('useRegister_WhenToggleConfirmPasswordVisibilityCalled_TogglesShowConfirmPassword', () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.toggleConfirmPasswordVisibility();
      });

      expect(result.current.showConfirmPassword).toBe(true);

      act(() => {
        result.current.toggleConfirmPasswordVisibility();
      });

      expect(result.current.showConfirmPassword).toBe(false);
    });
  });

  describe('useRegister_HandleRegister_WithValidData', () => {
    it('useRegister_WhenHandleRegisterCalledWithValidData_CallsSignUp', async () => {
      mockSignUp.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123', 'John Doe');
    });

    it('useRegister_WhenHandleRegisterSucceeds_SetsRegistrationSuccess', async () => {
      mockSignUp.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.registrationSuccess).toBe(true);
    });

    it('useRegister_WhenHandleRegisterCalled_TrimsAndLowercasesEmail', async () => {
      mockSignUp.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setEmail('  TEST@EXAMPLE.COM  ');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123', 'John Doe');
    });

    it('useRegister_WhenHandleRegisterCalled_TrimsDisplayName', async () => {
      mockSignUp.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('  John Doe  ');
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123', 'John Doe');
    });
  });

  describe('useRegister_Validation_DisplayName', () => {
    it('useRegister_WhenDisplayNameEmpty_SetsError', async () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.error).toBe('Display name is required');
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('useRegister_WhenDisplayNameTooShort_SetsError', async () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('J');
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.error).toContain('Display name must be 2-50 characters');
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('useRegister_WhenDisplayNameTooLong_SetsError', async () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('A'.repeat(51));
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.error).toContain('Display name must be 2-50 characters');
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('useRegister_WhenDisplayNameHasInvalidCharacters_SetsError', async () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John@Doe!');
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.error).toContain('Display name must be 2-50 characters');
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('useRegister_WhenDisplayNameValid_NoError', async () => {
      mockSignUp.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName("John O'Doe-Smith");
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(mockSignUp).toHaveBeenCalled();
    });
  });

  describe('useRegister_Validation_Email', () => {
    it('useRegister_WhenEmailEmpty_SetsError', async () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.error).toBe('Email is required');
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('useRegister_WhenEmailInvalid_SetsError', async () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setEmail('invalid-email');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.error).toBe('Please enter a valid email address');
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  describe('useRegister_Validation_Password', () => {
    it('useRegister_WhenPasswordEmpty_SetsError', async () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setEmail('test@example.com');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.error).toBe('Password is required');
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('useRegister_WhenPasswordTooShort_SetsError', async () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setEmail('test@example.com');
        result.current.setPassword('pass12');
        result.current.setConfirmPassword('pass12');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.error).toContain('Password must be at least 8 characters');
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('useRegister_WhenPasswordNoLetters_SetsError', async () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setEmail('test@example.com');
        result.current.setPassword('12345678');
        result.current.setConfirmPassword('12345678');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.error).toContain('Password must be at least 8 characters and contain both letters and numbers');
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('useRegister_WhenPasswordNoNumbers_SetsError', async () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setEmail('test@example.com');
        result.current.setPassword('password');
        result.current.setConfirmPassword('password');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.error).toContain('Password must be at least 8 characters and contain both letters and numbers');
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  describe('useRegister_Validation_PasswordMatch', () => {
    it('useRegister_WhenPasswordsDoNotMatch_SetsError', async () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password456');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.error).toBe('Passwords do not match');
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('useRegister_WhenPasswordsMatch_NoError', async () => {
      mockSignUp.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(mockSignUp).toHaveBeenCalled();
    });
  });

  describe('useRegister_Validation_TermsAgreement', () => {
    it('useRegister_WhenTermsNotAgreed_SetsError', async () => {
      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.error).toBe('You must agree to the Terms of Service and Privacy Policy');
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('useRegister_WhenTermsAgreed_NoError', async () => {
      mockSignUp.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(mockSignUp).toHaveBeenCalled();
    });
  });

  describe('useRegister_ErrorHandling_SignUpFailure', () => {
    it('useRegister_WhenSignUpFails_SetsError', async () => {
      mockSignUp.mockRejectedValue(new Error('Email already exists'));

      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.error).toBe('Email already exists');
      expect(result.current.registrationSuccess).toBe(false);
    });

    it('useRegister_WhenSignUpFailsWithoutMessage_SetsDefaultError', async () => {
      mockSignUp.mockRejectedValue(new Error());

      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.error).toBe('Registration failed. Please try again.');
    });
  });

  describe('useRegister_ErrorClearing_WorksCorrectly', () => {
    it('useRegister_WhenHandleRegisterCalled_ClearsExistingError', async () => {
      mockSignUp.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRegister());

      // First set an error
      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('different');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.error).toBe('Passwords do not match');

      // Now fix the error
      act(() => {
        result.current.setConfirmPassword('password123');
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.error).toBeNull();
    });

    it('useRegister_WhenHandleRegisterCalled_ResetsRegistrationSuccess', async () => {
      mockSignUp.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRegister());

      act(() => {
        result.current.setDisplayName('John Doe');
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
        result.current.setConfirmPassword('password123');
        result.current.setAgreedToTerms(true);
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.registrationSuccess).toBe(true);

      // Call again with invalid data
      act(() => {
        result.current.setPassword('short');
      });

      await act(async () => {
        await result.current.handleRegister();
      });

      expect(result.current.registrationSuccess).toBe(false);
    });
  });
});
