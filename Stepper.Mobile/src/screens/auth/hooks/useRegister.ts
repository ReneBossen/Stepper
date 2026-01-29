import { useState } from 'react';
import { useAuthStore } from '@store/authStore';
import { getErrorMessage } from '@utils/errorUtils';

export const useRegister = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const signUp = useAuthStore((state) => state.signUp);
  const isLoading = useAuthStore((state) => state.isLoading);

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

  const handleRegister = async () => {
    setError(null);
    setRegistrationSuccess(false);

    // Validate display name
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    if (!validateDisplayName(displayName)) {
      setError('Display name must be 2-50 characters and contain only letters, numbers, spaces, hyphens, or apostrophes');
      return;
    }

    // Validate email
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate password
    if (!password) {
      setError('Password is required');
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters and contain both letters and numbers');
      return;
    }

    // Validate confirm password
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate terms agreement
    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
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
    registrationSuccess,
    handleRegister,
  };
};
