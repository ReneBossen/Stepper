import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const SUPABASE_URL: string = extra.supabaseUrl ?? '';
export const SUPABASE_ANON_KEY: string = extra.supabaseAnonKey ?? '';
export const API_BASE_URL: string = extra.apiBaseUrl ?? 'http://localhost:5000';
export const GOOGLE_WEB_CLIENT_ID: string = extra.googleWebClientId ?? '';
export const POSTHOG_API_KEY: string = extra.posthogApiKey ?? '';
export const POSTHOG_HOST: string = extra.posthogHost ?? 'https://us.i.posthog.com';
