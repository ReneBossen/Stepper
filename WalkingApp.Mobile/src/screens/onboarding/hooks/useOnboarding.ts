import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@onboarding_completed';

export interface OnboardingHook {
  markOnboardingComplete: () => Promise<void>;
  checkOnboardingStatus: () => Promise<boolean>;
}

export function useOnboarding(): OnboardingHook {
  const markOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (error) {
      console.error('Failed to mark onboarding as complete:', error);
    }
  };

  const checkOnboardingStatus = async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      return false;
    }
  };

  return {
    markOnboardingComplete,
    checkOnboardingStatus,
  };
}
