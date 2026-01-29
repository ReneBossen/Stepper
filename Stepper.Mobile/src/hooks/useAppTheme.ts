import { useColorScheme } from 'react-native';
import { useUserStore } from '@store/userStore';
import { lightTheme, darkTheme, lightNavigationTheme, darkNavigationTheme } from '@theme/theme';

export const useAppTheme = () => {
  const systemColorScheme = useColorScheme();
  // Theme preference is now stored directly in the store, not in user_preferences table
  const themePreference = useUserStore((state) => state.themePreference);

  // Determine effective theme
  const effectiveTheme =
    themePreference === 'system' ? systemColorScheme : themePreference;

  const isDark = effectiveTheme === 'dark';

  return {
    paperTheme: isDark ? darkTheme : lightTheme,
    navigationTheme: isDark ? darkNavigationTheme : lightNavigationTheme,
    isDark,
  };
};
