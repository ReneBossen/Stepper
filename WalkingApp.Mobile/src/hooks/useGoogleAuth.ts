import { useState, useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID } from '@env';

// Complete the web browser authentication session
WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthResponse {
  idToken?: string;
  accessToken?: string;
}

export const useGoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID, // Use Android OAuth client ID
    redirectUri: makeRedirectUri({
      scheme: 'walkingapp',
    }),
  });

  useEffect(() => {
    if (response?.type === 'error') {
      setError(response.error?.message || 'Google authentication failed');
      setIsLoading(false);
    }
  }, [response]);

  const signInWithGoogle = async (): Promise<GoogleAuthResponse | null> => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await promptAsync();

      if (result.type === 'success') {
        const { authentication } = result;
        setIsLoading(false);

        if (!authentication?.idToken) {
          setError('Failed to retrieve authentication token from Google');
          return null;
        }

        return {
          idToken: authentication.idToken,
          accessToken: authentication.accessToken,
        };
      }

      if (result.type === 'cancel') {
        setIsLoading(false);
        return null;
      }

      if (result.type === 'error') {
        setError(result.error?.message || 'Google authentication failed');
        setIsLoading(false);
        return null;
      }

      setIsLoading(false);
      return null;
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setIsLoading(false);
      return null;
    }
  };

  return {
    signInWithGoogle,
    isLoading,
    error,
    request,
  };
};
