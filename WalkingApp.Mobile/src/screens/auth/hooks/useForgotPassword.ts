import { useState } from 'react';
import { resetPassword } from '@services/supabase';

export const useForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

    setIsLoading(true);

    try {
      await resetPassword(email.trim().toLowerCase());
      setEmailSent(true);
    } catch (err: any) {
      // For security, show generic message even if email doesn't exist
      setError('If an account exists with this email, you will receive a password reset link.');
    } finally {
      setIsLoading(false);
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
