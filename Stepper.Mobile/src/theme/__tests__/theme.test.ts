// Mock dependencies before imports
jest.mock('react-native-paper', () => ({
  MD3LightTheme: {
    colors: { backdrop: 'rgba(0,0,0,0.5)' },
    fonts: {},
    roundness: 4,
  },
  MD3DarkTheme: {
    colors: { backdrop: 'rgba(0,0,0,0.7)' },
    fonts: {},
    roundness: 4,
  },
}));

jest.mock('@react-navigation/native', () => ({
  DefaultTheme: {
    dark: false,
    colors: {
      primary: 'rgb(0, 122, 255)',
      background: 'rgb(242, 242, 242)',
      card: 'rgb(255, 255, 255)',
      text: 'rgb(28, 28, 30)',
      border: 'rgb(216, 216, 216)',
      notification: 'rgb(255, 59, 48)',
    },
  },
  DarkTheme: {
    dark: true,
    colors: {
      primary: 'rgb(10, 132, 255)',
      background: 'rgb(1, 1, 1)',
      card: 'rgb(18, 18, 18)',
      text: 'rgb(229, 229, 231)',
      border: 'rgb(39, 39, 41)',
      notification: 'rgb(255, 69, 58)',
    },
  },
}));

import {
  lightTheme,
  darkTheme,
  lightNavigationTheme,
  darkNavigationTheme
} from '../theme';
import { colors } from '../colors';

describe('theme', () => {
  describe('lightTheme', () => {
    it('should have MD3 light theme structure', () => {
      expect(lightTheme).toHaveProperty('colors');
      expect(lightTheme).toHaveProperty('fonts');
      expect(lightTheme).toHaveProperty('roundness');
    });

    it('should have correct roundness value', () => {
      expect(lightTheme.roundness).toBe(8);
    });

    it('should include custom colors from colors.light', () => {
      expect(lightTheme.colors.primary).toBe(colors.light.primary);
      expect(lightTheme.colors.secondary).toBe(colors.light.secondary);
      expect(lightTheme.colors.tertiary).toBe(colors.light.tertiary);
      expect(lightTheme.colors.background).toBe(colors.light.background);
      expect(lightTheme.colors.surface).toBe(colors.light.surface);
    });

    it('should have fonts configuration', () => {
      expect(lightTheme.fonts).toBeDefined();
      expect(typeof lightTheme.fonts).toBe('object');
    });

    it('should have elevation colors', () => {
      expect(lightTheme.colors).toHaveProperty('elevation');
      expect(lightTheme.colors.elevation).toHaveProperty('level0');
      expect(lightTheme.colors.elevation).toHaveProperty('level1');
      expect(lightTheme.colors.elevation).toHaveProperty('level2');
      expect(lightTheme.colors.elevation).toHaveProperty('level3');
      expect(lightTheme.colors.elevation).toHaveProperty('level4');
      expect(lightTheme.colors.elevation).toHaveProperty('level5');
    });

    it('should include all MD3 required color properties', () => {
      const requiredColors = [
        'primary',
        'primaryContainer',
        'secondary',
        'secondaryContainer',
        'tertiary',
        'tertiaryContainer',
        'background',
        'surface',
        'surfaceVariant',
        'error',
        'errorContainer',
        'onPrimary',
        'onSecondary',
        'onTertiary',
        'onBackground',
        'onSurface',
        'onError',
      ];

      requiredColors.forEach(color => {
        expect(lightTheme.colors).toHaveProperty(color);
      });
    });
  });

  describe('darkTheme', () => {
    it('should have MD3 dark theme structure', () => {
      expect(darkTheme).toHaveProperty('colors');
      expect(darkTheme).toHaveProperty('fonts');
      expect(darkTheme).toHaveProperty('roundness');
    });

    it('should have correct roundness value', () => {
      expect(darkTheme.roundness).toBe(8);
    });

    it('should include custom colors from colors.dark', () => {
      expect(darkTheme.colors.primary).toBe(colors.dark.primary);
      expect(darkTheme.colors.secondary).toBe(colors.dark.secondary);
      expect(darkTheme.colors.tertiary).toBe(colors.dark.tertiary);
      expect(darkTheme.colors.background).toBe(colors.dark.background);
      expect(darkTheme.colors.surface).toBe(colors.dark.surface);
    });

    it('should have fonts configuration', () => {
      expect(darkTheme.fonts).toBeDefined();
      expect(typeof darkTheme.fonts).toBe('object');
    });

    it('should have elevation colors', () => {
      expect(darkTheme.colors).toHaveProperty('elevation');
      expect(darkTheme.colors.elevation).toHaveProperty('level0');
      expect(darkTheme.colors.elevation).toHaveProperty('level1');
      expect(darkTheme.colors.elevation).toHaveProperty('level2');
      expect(darkTheme.colors.elevation).toHaveProperty('level3');
      expect(darkTheme.colors.elevation).toHaveProperty('level4');
      expect(darkTheme.colors.elevation).toHaveProperty('level5');
    });

    it('should include all MD3 required color properties', () => {
      const requiredColors = [
        'primary',
        'primaryContainer',
        'secondary',
        'secondaryContainer',
        'tertiary',
        'tertiaryContainer',
        'background',
        'surface',
        'surfaceVariant',
        'error',
        'errorContainer',
        'onPrimary',
        'onSecondary',
        'onTertiary',
        'onBackground',
        'onSurface',
        'onError',
      ];

      requiredColors.forEach(color => {
        expect(darkTheme.colors).toHaveProperty(color);
      });
    });

    it('should have different colors from light theme', () => {
      expect(darkTheme.colors.background).not.toBe(lightTheme.colors.background);
      expect(darkTheme.colors.surface).not.toBe(lightTheme.colors.surface);
      expect(darkTheme.colors.onBackground).not.toBe(lightTheme.colors.onBackground);
    });
  });

  describe('theme consistency', () => {
    it('should have same roundness for both themes', () => {
      expect(lightTheme.roundness).toBe(darkTheme.roundness);
    });

    it('should have same structure for both themes', () => {
      const lightKeys = Object.keys(lightTheme).sort();
      const darkKeys = Object.keys(darkTheme).sort();
      expect(lightKeys).toEqual(darkKeys);
    });

    it('should have matching color properties between themes', () => {
      const lightColorKeys = Object.keys(lightTheme.colors).sort();
      const darkColorKeys = Object.keys(darkTheme.colors).sort();
      expect(lightColorKeys).toEqual(darkColorKeys);
    });
  });

  describe('lightNavigationTheme', () => {
    it('should have navigation theme structure', () => {
      expect(lightNavigationTheme).toHaveProperty('colors');
      expect(lightNavigationTheme.colors).toHaveProperty('primary');
      expect(lightNavigationTheme.colors).toHaveProperty('background');
      expect(lightNavigationTheme.colors).toHaveProperty('card');
      expect(lightNavigationTheme.colors).toHaveProperty('text');
      expect(lightNavigationTheme.colors).toHaveProperty('border');
      expect(lightNavigationTheme.colors).toHaveProperty('notification');
    });

    it('should map colors correctly from light theme', () => {
      expect(lightNavigationTheme.colors.primary).toBe(colors.light.primary);
      expect(lightNavigationTheme.colors.background).toBe(colors.light.background);
      expect(lightNavigationTheme.colors.card).toBe(colors.light.surface);
      expect(lightNavigationTheme.colors.text).toBe(colors.light.onBackground);
      expect(lightNavigationTheme.colors.border).toBe(colors.light.outline);
      expect(lightNavigationTheme.colors.notification).toBe(colors.light.tertiary);
    });

    it('should extend DefaultTheme', () => {
      expect(lightNavigationTheme.dark).toBe(false);
    });
  });

  describe('darkNavigationTheme', () => {
    it('should have navigation theme structure', () => {
      expect(darkNavigationTheme).toHaveProperty('colors');
      expect(darkNavigationTheme.colors).toHaveProperty('primary');
      expect(darkNavigationTheme.colors).toHaveProperty('background');
      expect(darkNavigationTheme.colors).toHaveProperty('card');
      expect(darkNavigationTheme.colors).toHaveProperty('text');
      expect(darkNavigationTheme.colors).toHaveProperty('border');
      expect(darkNavigationTheme.colors).toHaveProperty('notification');
    });

    it('should map colors correctly from dark theme', () => {
      expect(darkNavigationTheme.colors.primary).toBe(colors.dark.primary);
      expect(darkNavigationTheme.colors.background).toBe(colors.dark.background);
      expect(darkNavigationTheme.colors.card).toBe(colors.dark.surface);
      expect(darkNavigationTheme.colors.text).toBe(colors.dark.onBackground);
      expect(darkNavigationTheme.colors.border).toBe(colors.dark.outline);
      expect(darkNavigationTheme.colors.notification).toBe(colors.dark.tertiary);
    });

    it('should extend DarkTheme', () => {
      expect(darkNavigationTheme.dark).toBe(true);
    });

    it('should have different colors from light navigation theme', () => {
      expect(darkNavigationTheme.colors.background).not.toBe(lightNavigationTheme.colors.background);
      expect(darkNavigationTheme.colors.text).not.toBe(lightNavigationTheme.colors.text);
      expect(darkNavigationTheme.colors.card).not.toBe(lightNavigationTheme.colors.card);
    });
  });

  describe('navigation theme consistency', () => {
    it('should have matching structure between light and dark navigation themes', () => {
      const lightKeys = Object.keys(lightNavigationTheme.colors).sort();
      const darkKeys = Object.keys(darkNavigationTheme.colors).sort();
      expect(lightKeys).toEqual(darkKeys);
    });

    it('should use tertiary color for notifications in both themes', () => {
      expect(lightNavigationTheme.colors.notification).toBe(colors.light.tertiary);
      expect(darkNavigationTheme.colors.notification).toBe(colors.dark.tertiary);
    });
  });

  describe('integration', () => {
    it('should create coherent theme system', () => {
      // Paper theme and navigation theme should use same color palette
      expect(lightTheme.colors.primary).toBe(lightNavigationTheme.colors.primary);
      expect(darkTheme.colors.primary).toBe(darkNavigationTheme.colors.primary);
    });

    it('should ensure background consistency across theming systems', () => {
      expect(lightTheme.colors.background).toBe(lightNavigationTheme.colors.background);
      expect(darkTheme.colors.background).toBe(darkNavigationTheme.colors.background);
    });

    it('should ensure surface/card consistency', () => {
      expect(lightTheme.colors.surface).toBe(lightNavigationTheme.colors.card);
      expect(darkTheme.colors.surface).toBe(darkNavigationTheme.colors.card);
    });
  });
});
