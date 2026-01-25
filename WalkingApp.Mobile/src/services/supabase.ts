import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

/**
 * Supabase Client - For Real-time Subscriptions and Direct Database Access ONLY
 *
 * IMPORTANT: This client is configured for minimal auth handling because:
 * - All authentication (login, register, logout, token refresh) goes through authApi.ts
 * - Token storage is handled by tokenStorage.ts (not Supabase's built-in storage)
 * - This client is primarily used for:
 *   1. Real-time subscriptions (channel listeners)
 *   2. Direct database queries (until APIs migrate to .NET backend)
 *   3. Google OAuth flow (signInWithOAuth, setSession)
 *   4. Legacy operations that still require Supabase auth (getUser for user ID)
 *
 * For authentication operations, use:
 * - authApi.login() / authApi.register() / authApi.logout()
 * - tokenStorage.getAccessToken() / tokenStorage.setTokens()
 * - useAuthStore for auth state management
 *
 * TODO: As APIs migrate to .NET backend, reduce usage of supabase.auth.getUser()
 * TODO: Eventually this client will only be used for real-time subscriptions
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
