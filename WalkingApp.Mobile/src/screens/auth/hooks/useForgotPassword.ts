import { useState } from 'react';
import { useAuthStore } from '@store/authStore';

export const useForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPassword = useAuthStore((state) => state.resetPassword);
  const isLoading = useAuthStore((state) => state.isLoading);

  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const handleResetPassword = async () => {
    setError(null);

    // Validate email
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await resetPassword(email.trim().toLowerCase());
      setEmailSent(true);
    } catch {
      // For security, show generic message even if email doesn't exist
      // We intentionally don't expose the actual error message
      setError('If an account exists with this email, you will receive a password reset link.');
    }
  };

  const handleResendEmail = async () => {
    setEmailSent(false);
    await handleResetPassword();
  };

  return {
    email,
    setEmail,
    isLoading,
    emailSent,
    error,
    handleResetPassword,
    handleResendEmail,
  };
};
