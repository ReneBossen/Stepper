import { SUPABASE_URL, SUPABASE_ANON_KEY, API_BASE_URL } from '@env';

export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};

export const apiConfig = {
  baseUrl: API_BASE_URL,
  timeout: 30000, // 30 seconds
};

/**
 * Validate that required environment variables are set
 */
export const validateConfig = (): boolean => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing required Supabase configuration');
    return false;
  }

  if (!API_BASE_URL) {
    console.warn('API_BASE_URL not set, API calls may fail');
  }

  return true;
};
