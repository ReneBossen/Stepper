import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Expo SecureStore adapter for Supabase auth storage
 * Provides secure token storage on both iOS and Android
 */
export const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('SecureStore getItem error:', error);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStore setItem error:', error);
      throw error;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
      throw error;
    }
  },
};

/**
 * Check if secure storage is available on the device
 */
export const isSecureStoreAvailable = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      return false;
    }
    await SecureStore.setItemAsync('test', 'test');
    await SecureStore.deleteItemAsync('test');
    return true;
  } catch {
    return false;
  }
};
