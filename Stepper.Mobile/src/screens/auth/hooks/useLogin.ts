import { useState } from 'react';
import { useAuthStore } from '@store/authStore';
import { getErrorMessage } from '@utils/errorUtils';
import { track } from '@services/analytics';

export const useLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useAuthStore((state) => state.signIn);
  const isLoading = useAuthStore((state) => state.isLoading);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleLogin = async () => {
    setError(null);

    // Validate email
    if (!email.trim()) {
      const errorMsg = 'Email is required';
      setError(errorMsg);
      track('validation_error', { field: 'email', error_message: errorMsg });
      return;
    }

    if (!validateEmail(email)) {
      const errorMsg = 'Please enter a valid email address';
      setError(errorMsg);
      track('validation_error', { field: 'email', error_message: errorMsg });
      return;
    }

    // Validate password
    if (!password) {
      const errorMsg = 'Password is required';
      setError(errorMsg);
      track('validation_error', { field: 'password', error_message: errorMsg });
      return;
    }

    if (!validatePassword(password)) {
      const errorMsg = 'Password must be at least 6 characters';
      setError(errorMsg);
      track('validation_error', { field: 'password', error_message: errorMsg });
      return;
    }

    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Invalid email or password'));
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    togglePasswordVisibility,
    isLoading,
    error,
    handleLogin,
  };
};
