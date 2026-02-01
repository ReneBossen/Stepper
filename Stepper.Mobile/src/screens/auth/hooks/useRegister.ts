import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@store/authStore';
import { getErrorMessage } from '@utils/errorUtils';
import { track } from '@services/analytics';

export interface FieldErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: boolean;
}

export const useRegister = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const hasTrackedStart = useRef(false);

  const signUp = useAuthStore((state) => state.signUp);
  const isLoading = useAuthStore((state) => state.isLoading);

  // Track registration_started when the user first interacts with the form
  useEffect(() => {
    if (!hasTrackedStart.current && (displayName || email || password)) {
      track('registration_started', {});
      hasTrackedStart.current = true;
    }
  }, [displayName, email, password]);

  const validateDisplayName = (name: string): boolean => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return false;
    }
    // Check for special characters (allow letters, numbers, spaces, hyphens, apostrophes)
    const nameRegex = /^[a-zA-Z0-9\s\-']+$/;
    return nameRegex.test(trimmedName);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    // Must be at least 8 characters and contain both letters and numbers
    if (password.length < 8) {
      return false;
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return hasLetter && hasNumber;
  };

  const clearFieldError = useCallback((field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (prev[field] === undefined) return prev;
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const resetForm = useCallback(() => {
    setDisplayName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setAgreedToTerms(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError(null);
    setFieldErrors({});
    setRegistrationSuccess(false);
    hasTrackedStart.current = false;
  }, []);

  const handleRegister = async () => {
    setError(null);
    setFieldErrors({});
    setRegistrationSuccess(false);

    const newFieldErrors: FieldErrors = {};

    // Validate display name
    if (!displayName.trim()) {
      const errorMsg = 'Display name is required';
      newFieldErrors.displayName = errorMsg;
      setError(errorMsg);
      setFieldErrors(newFieldErrors);
      track('validation_error', { field: 'display_name', error_message: errorMsg });
      return;
    }

    if (!validateDisplayName(displayName)) {
      const errorMsg = 'Display name must be 2-50 characters and contain only letters, numbers, spaces, hyphens, or apostrophes';
      newFieldErrors.displayName = errorMsg;
      setError(errorMsg);
      setFieldErrors(newFieldErrors);
      track('validation_error', { field: 'display_name', error_message: errorMsg });
      return;
    }

    // Validate email
    if (!email.trim()) {
      const errorMsg = 'Email is required';
      newFieldErrors.email = errorMsg;
      setError(errorMsg);
      setFieldErrors(newFieldErrors);
      track('validation_error', { field: 'email', error_message: errorMsg });
      return;
    }

    if (!validateEmail(email)) {
      const errorMsg = 'Please enter a valid email address';
      newFieldErrors.email = errorMsg;
      setError(errorMsg);
      setFieldErrors(newFieldErrors);
      track('validation_error', { field: 'email', error_message: errorMsg });
      return;
    }

    // Validate password
    if (!password) {
      const errorMsg = 'Password is required';
      newFieldErrors.password = errorMsg;
      setError(errorMsg);
      setFieldErrors(newFieldErrors);
      track('validation_error', { field: 'password', error_message: errorMsg });
      return;
    }

    if (!validatePassword(password)) {
      const errorMsg = 'Password must be at least 8 characters and contain both letters and numbers';
      newFieldErrors.password = errorMsg;
      setError(errorMsg);
      setFieldErrors(newFieldErrors);
      track('validation_error', { field: 'password', error_message: errorMsg });
      return;
    }

    // Validate confirm password
    if (password !== confirmPassword) {
      const errorMsg = 'Passwords do not match';
      newFieldErrors.confirmPassword = errorMsg;
      setError(errorMsg);
      setFieldErrors(newFieldErrors);
      track('validation_error', { field: 'confirm_password', error_message: errorMsg });
      return;
    }

    // Validate terms agreement
    if (!agreedToTerms) {
      const errorMsg = 'You must agree to the Terms of Service and Privacy Policy';
      newFieldErrors.terms = true;
      setError(errorMsg);
      setFieldErrors(newFieldErrors);
      track('validation_error', { field: 'terms', error_message: errorMsg });
      return;
    }

    try {
      await signUp(email.trim().toLowerCase(), password, displayName.trim());
      setRegistrationSuccess(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'));
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return {
    displayName,
    setDisplayName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    agreedToTerms,
    setAgreedToTerms,
    showPassword,
    showConfirmPassword,
    togglePasswordVisibility,
    toggleConfirmPasswordVisibility,
    isLoading,
    error,
    fieldErrors,
    clearFieldError,
    resetForm,
    registrationSuccess,
    handleRegister,
  };
};
