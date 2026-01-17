import { MD3LightTheme, MD3DarkTheme, MD3Theme } from 'react-native-paper';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';
import { colors } from './colors';

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...colors.light,
  },
  fonts: {
    ...MD3LightTheme.fonts,
  },
  roundness: 8,
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...colors.dark,
  },
  fonts: {
    ...MD3DarkTheme.fonts,
  },
  roundness: 8,
};

// Navigation theme integration
export const lightNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.light.primary,
    background: colors.light.background,
    card: colors.light.surface,
    text: colors.light.onBackground,
    border: colors.light.outline,
    notification: colors.light.tertiary,
  },
};

export const darkNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.dark.primary,
    background: colors.dark.background,
    card: colors.dark.surface,
    text: colors.dark.onBackground,
    border: colors.dark.outline,
    notification: colors.dark.tertiary,
  },
};
