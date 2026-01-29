import { colors } from '../colors';

describe('colors', () => {
  describe('light theme colors', () => {
    it('should have primary color defined', () => {
      expect(colors.light.primary).toBe('#4CAF50');
      expect(colors.light.primaryContainer).toBe('#81C784');
    });

    it('should have secondary color defined', () => {
      expect(colors.light.secondary).toBe('#2196F3');
      expect(colors.light.secondaryContainer).toBe('#64B5F6');
    });

    it('should have tertiary color defined', () => {
      expect(colors.light.tertiary).toBe('#FF9800');
      expect(colors.light.tertiaryContainer).toBe('#FFB74D');
    });

    it('should have background colors defined', () => {
      expect(colors.light.background).toBe('#FAFAFA');
      expect(colors.light.surface).toBe('#FFFFFF');
      expect(colors.light.surfaceVariant).toBe('#F5F5F5');
    });

    it('should have error colors defined', () => {
      expect(colors.light.error).toBe('#F44336');
      expect(colors.light.errorContainer).toBe('#FFCDD2');
    });

    it('should have text colors defined', () => {
      expect(colors.light.onPrimary).toBe('#FFFFFF');
      expect(colors.light.onBackground).toBe('#212121');
      expect(colors.light.onSurface).toBe('#212121');
    });

    it('should have outline colors defined', () => {
      expect(colors.light.outline).toBe('#E0E0E0');
      expect(colors.light.outlineVariant).toBe('#EEEEEE');
    });

    it('should have elevation levels defined', () => {
      expect(colors.light.elevation.level0).toBe('transparent');
      expect(colors.light.elevation.level1).toBe('#FFFFFF');
      expect(colors.light.elevation.level2).toBe('#F5F5F5');
      expect(colors.light.elevation.level3).toBe('#EEEEEE');
      expect(colors.light.elevation.level4).toBe('#E0E0E0');
      expect(colors.light.elevation.level5).toBe('#BDBDBD');
    });

    it('should have all required MD3 color properties', () => {
      expect(colors.light).toHaveProperty('primary');
      expect(colors.light).toHaveProperty('secondary');
      expect(colors.light).toHaveProperty('tertiary');
      expect(colors.light).toHaveProperty('background');
      expect(colors.light).toHaveProperty('surface');
      expect(colors.light).toHaveProperty('error');
      expect(colors.light).toHaveProperty('outline');
      expect(colors.light).toHaveProperty('shadow');
      expect(colors.light).toHaveProperty('inverseSurface');
      expect(colors.light).toHaveProperty('inversePrimary');
    });
  });

  describe('dark theme colors', () => {
    it('should have primary color defined', () => {
      expect(colors.dark.primary).toBe('#81C784');
      expect(colors.dark.primaryContainer).toBe('#388E3C');
    });

    it('should have secondary color defined', () => {
      expect(colors.dark.secondary).toBe('#64B5F6');
      expect(colors.dark.secondaryContainer).toBe('#1976D2');
    });

    it('should have tertiary color defined', () => {
      expect(colors.dark.tertiary).toBe('#FFB74D');
      expect(colors.dark.tertiaryContainer).toBe('#F57C00');
    });

    it('should have background colors defined', () => {
      expect(colors.dark.background).toBe('#121212');
      expect(colors.dark.surface).toBe('#1E1E1E');
      expect(colors.dark.surfaceVariant).toBe('#2C2C2C');
    });

    it('should have error colors defined', () => {
      expect(colors.dark.error).toBe('#EF5350');
      expect(colors.dark.errorContainer).toBe('#B71C1C');
    });

    it('should have text colors defined', () => {
      expect(colors.dark.onPrimary).toBe('#003300');
      expect(colors.dark.onBackground).toBe('#E0E0E0');
      expect(colors.dark.onSurface).toBe('#E0E0E0');
    });

    it('should have outline colors defined', () => {
      expect(colors.dark.outline).toBe('#424242');
      expect(colors.dark.outlineVariant).toBe('#616161');
    });

    it('should have elevation levels defined', () => {
      expect(colors.dark.elevation.level0).toBe('transparent');
      expect(colors.dark.elevation.level1).toBe('#1E1E1E');
      expect(colors.dark.elevation.level2).toBe('#232323');
      expect(colors.dark.elevation.level3).toBe('#252525');
      expect(colors.dark.elevation.level4).toBe('#272727');
      expect(colors.dark.elevation.level5).toBe('#2C2C2C');
    });

    it('should have all required MD3 color properties', () => {
      expect(colors.dark).toHaveProperty('primary');
      expect(colors.dark).toHaveProperty('secondary');
      expect(colors.dark).toHaveProperty('tertiary');
      expect(colors.dark).toHaveProperty('background');
      expect(colors.dark).toHaveProperty('surface');
      expect(colors.dark).toHaveProperty('error');
      expect(colors.dark).toHaveProperty('outline');
      expect(colors.dark).toHaveProperty('shadow');
      expect(colors.dark).toHaveProperty('inverseSurface');
      expect(colors.dark).toHaveProperty('inversePrimary');
    });

    it('should have different background than light theme', () => {
      expect(colors.dark.background).not.toBe(colors.light.background);
      expect(colors.dark.surface).not.toBe(colors.light.surface);
    });

    it('should use lighter primary color than light theme', () => {
      // Dark mode typically uses lighter versions for better contrast
      expect(colors.dark.primary).toBe('#81C784');
      expect(colors.light.primary).toBe('#4CAF50');
    });
  });

  describe('color structure', () => {
    it('should have both light and dark themes', () => {
      expect(colors).toHaveProperty('light');
      expect(colors).toHaveProperty('dark');
    });

    it('should have matching color properties between themes', () => {
      const lightKeys = Object.keys(colors.light).sort();
      const darkKeys = Object.keys(colors.dark).sort();
      expect(lightKeys).toEqual(darkKeys);
    });

    it('should have elevation object with 6 levels', () => {
      expect(Object.keys(colors.light.elevation)).toHaveLength(6);
      expect(Object.keys(colors.dark.elevation)).toHaveLength(6);
    });
  });

  describe('color values', () => {
    it('should use valid hex color format', () => {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;

      // Test some light colors
      expect(colors.light.primary).toMatch(hexColorRegex);
      expect(colors.light.secondary).toMatch(hexColorRegex);
      expect(colors.light.background).toMatch(hexColorRegex);

      // Test some dark colors
      expect(colors.dark.primary).toMatch(hexColorRegex);
      expect(colors.dark.secondary).toMatch(hexColorRegex);
      expect(colors.dark.background).toMatch(hexColorRegex);
    });

    it('should use rgba format for transparent colors', () => {
      expect(colors.light.backdrop).toMatch(/^rgba\(/);
      expect(colors.dark.backdrop).toMatch(/^rgba\(/);
    });
  });

  describe('accessibility considerations', () => {
    it('should have distinct error colors for visibility', () => {
      expect(colors.light.error).toBe('#F44336');
      expect(colors.dark.error).toBe('#EF5350');
    });

    it('should have appropriate text-on-background contrast', () => {
      // Light theme uses dark text on light background
      expect(colors.light.onBackground).toBe('#212121');
      expect(colors.light.background).toBe('#FAFAFA');

      // Dark theme uses light text on dark background
      expect(colors.dark.onBackground).toBe('#E0E0E0');
      expect(colors.dark.background).toBe('#121212');
    });

    it('should have white text on primary buttons', () => {
      expect(colors.light.onPrimary).toBe('#FFFFFF');
    });
  });
});
