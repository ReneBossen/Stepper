import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@services/supabase';

/**
 * @deprecated This hook is DEPRECATED and will be removed in a future version.
 *
 * DO NOT USE THIS HOOK FOR NEW CODE.
 *
 * Instead, use:
 * - useAuthStore for authentication state and actions (signIn, signUp, signOut)
 * - tokenStorage for direct token access
 * - authApi for authentication API calls
 *
 * This hook was used for direct Supabase auth state management. The app now
 * handles authentication through the .NET backend API, and tokens are stored
 * via tokenStorage instead of Supabase's built-in session persistence.
 *
 * Reason for deprecation:
 * - Authentication now goes through backend API (authApi.ts)
 * - Token storage is handled by tokenStorage.ts
 * - Auth state is managed by useAuthStore
 * - Supabase client is configured with autoRefreshToken: false and persistSession: false
 *
 * This hook may not work correctly with the current Supabase client configuration.
 */
export const useSupabaseAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    user,
    loading,
    signOut: () => supabase.auth.signOut(),
  };
};
