import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

/**
 * Supabase Client - For Real-time Subscriptions and Google OAuth ONLY
 *
 * IMPORTANT: This client is configured for minimal functionality:
 * - All data operations go through WalkingApp.Api (backend)
 * - All authentication (login, register, logout, token refresh) goes through authApi.ts
 * - Token storage is handled by tokenStorage.ts (not Supabase's built-in storage)
 *
 * This client is ONLY used for:
 * 1. Real-time subscriptions (channel listeners for live updates)
 * 2. Google OAuth flow (signInWithOAuth, setSession)
 *
 * For authentication operations, use:
 * - authApi.login() / authApi.register() / authApi.logout() / authApi.changePassword()
 * - tokenStorage.getAccessToken() / tokenStorage.setTokens()
 * - useAuthStore for auth state management
 *
 * For data operations, use services in services/api/ which call the backend API.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false, // We handle token refresh via authApi.refreshToken()
    persistSession: false, // We handle session persistence via tokenStorage
    detectSessionInUrl: false, // Not needed for React Native
  },
});

/**
 * Sign in with Google OAuth (browser-based)
 *
 * This is the ONLY auth flow that should use Supabase directly because:
 * - Google OAuth requires browser-based authentication
 * - Supabase handles the OAuth flow and returns tokens in the redirect URL
 * - After successful OAuth, caller extracts tokens and calls setSession()
 *
 * Opens browser for authentication, returns URL with tokens in fragment.
 * Caller must extract tokens from redirect URL and call supabase.auth.setSession().
 *
 * NOTE: After Google OAuth, the app should ideally exchange the Supabase session
 * for backend-issued tokens. This is a TODO for full backend auth integration.
 */
export const signInWithGoogleOAuth = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'walkingapp://',
      skipBrowserRedirect: false,
    },
  });

  if (error) throw error;
  return data;
};
