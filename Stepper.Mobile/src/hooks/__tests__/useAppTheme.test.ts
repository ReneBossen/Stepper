import { renderHook } from '@testing-library/react-native';
import { useColorScheme } from 'react-native';
import { useAppTheme } from '../useAppTheme';
import { useUserStore } from '@store/userStore';
import { lightTheme, darkTheme, lightNavigationTheme, darkNavigationTheme } from '@theme/theme';

// Mock dependencies
jest.mock('react-native', () => ({
  useColorScheme: jest.fn(),
}));

jest.mock('@store/userStore', () => ({
  useUserStore: jest.fn(),
}));

jest.mock('@theme/theme', () => ({
  lightTheme: { colors: { primary: '#4CAF50' }, roundness: 8 },
  darkTheme: { colors: { primary: '#81C784' }, roundness: 8 },
  lightNavigationTheme: { dark: false, colors: { primary: '#4CAF50' } },
  darkNavigationTheme: { dark: true, colors: { primary: '#81C784' } },
}));

const mockUseColorScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;
const mockUseUserStore = useUserStore as unknown as jest.MockedFunction<any>;

describe('useAppTheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('system theme preference', () => {
    it('should use light theme when system is light and preference is system', () => {
      mockUseColorScheme.mockReturnValue('light');
      mockUseUserStore.mockImplementation((selector: any) =>
        selector({ themePreference: 'system' })
      );

      const { result } = renderHook(() => useAppTheme());

      expect(result.current.paperTheme).toEqual(lightTheme);
      expect(result.current.navigationTheme).toEqual(lightNavigationTheme);
      expect(result.current.isDark).toBe(false);
    });

    it('should use dark theme when system is dark and preference is system', () => {
      mockUseColorScheme.mockReturnValue('dark');
      mockUseUserStore.mockImplementation((selector: any) =>
        selector({ themePreference: 'system' })
      );

      const { result } = renderHook(() => useAppTheme());

      expect(result.current.paperTheme).toEqual(darkTheme);
      expect(result.current.navigationTheme).toEqual(darkNavigationTheme);
      expect(result.current.isDark).toBe(true);
    });

    it('should default to system preference when themePreference is not set', () => {
      mockUseColorScheme.mockReturnValue('light');
      mockUseUserStore.mockImplementation((selector: any) =>
        selector({ themePreference: undefined })
      );

      const { result } = renderHook(() => useAppTheme());

      // Default themePreference should be 'system'
      expect(result.current.paperTheme).toEqual(lightTheme);
      expect(result.current.navigationTheme).toEqual(lightNavigationTheme);
      expect(result.current.isDark).toBe(false);
    });
  });

  describe('explicit light theme preference', () => {
    it('should use light theme when preference is light regardless of system', () => {
      mockUseColorScheme.mockReturnValue('dark');
      mockUseUserStore.mockImplementation((selector: any) =>
        selector({ themePreference: 'light' })
      );

      const { result } = renderHook(() => useAppTheme());

      expect(result.current.paperTheme).toEqual(lightTheme);
      expect(result.current.navigationTheme).toEqual(lightNavigationTheme);
      expect(result.current.isDark).toBe(false);
    });

    it('should override system dark mode when explicitly set to light', () => {
      mockUseColorScheme.mockReturnValue('dark');
      mockUseUserStore.mockImplementation((selector: any) =>
        selector({ themePreference: 'light' })
      );

      const { result } = renderHook(() => useAppTheme());

      expect(result.current.isDark).toBe(false);
    });
  });

  describe('explicit dark theme preference', () => {
    it('should use dark theme when preference is dark regardless of system', () => {
      mockUseColorScheme.mockReturnValue('light');
      mockUseUserStore.mockImplementation((selector: any) =>
        selector({ themePreference: 'dark' })
      );

      const { result } = renderHook(() => useAppTheme());

      expect(result.current.paperTheme).toEqual(darkTheme);
      expect(result.current.navigationTheme).toEqual(darkNavigationTheme);
      expect(result.current.isDark).toBe(true);
    });

    it('should override system light mode when explicitly set to dark', () => {
      mockUseColorScheme.mockReturnValue('light');
      mockUseUserStore.mockImplementation((selector: any) =>
        selector({ themePreference: 'dark' })
      );

      const { result } = renderHook(() => useAppTheme());

      expect(result.current.isDark).toBe(true);
    });
  });

  describe('return value structure', () => {
    it('should return all required properties', () => {
      mockUseColorScheme.mockReturnValue('light');
      mockUseUserStore.mockImplementation((selector: any) =>
        selector({ themePreference: 'system' })
      );

      const { result } = renderHook(() => useAppTheme());

      expect(result.current).toHaveProperty('paperTheme');
      expect(result.current).toHaveProperty('navigationTheme');
      expect(result.current).toHaveProperty('isDark');
    });

    it('should return boolean for isDark', () => {
      mockUseColorScheme.mockReturnValue('light');
      mockUseUserStore.mockImplementation((selector: any) =>
        selector({ themePreference: 'system' })
      );

      const { result } = renderHook(() => useAppTheme());

      expect(typeof result.current.isDark).toBe('boolean');
    });

    it('should return theme objects with required properties', () => {
      mockUseColorScheme.mockReturnValue('light');
      mockUseUserStore.mockImplementation((selector: any) =>
        selector({ themePreference: 'system' })
      );

      const { result } = renderHook(() => useAppTheme());

      expect(result.current.paperTheme).toHaveProperty('colors');
      expect(result.current.navigationTheme).toHaveProperty('colors');
    });
  });

  describe('edge cases', () => {
    it('should handle null system color scheme', () => {
      mockUseColorScheme.mockReturnValue(null);
      mockUseUserStore.mockImplementation((selector: any) =>
        selector({ themePreference: 'system' })
      );

      const { result } = renderHook(() => useAppTheme());

      // Should default to light theme when system is null
      expect(result.current.paperTheme).toEqual(lightTheme);
      expect(result.current.isDark).toBe(false);
    });
  });

  describe('theme switching', () => {
    it('should switch from light to dark when preference changes', () => {
      mockUseColorScheme.mockReturnValue('light');
      const mockSelector = jest.fn((selector: any) =>
        selector({ themePreference: 'light' })
      );
      mockUseUserStore.mockImplementation(mockSelector);

      const { result, rerender } = renderHook(() => useAppTheme());

      expect(result.current.isDark).toBe(false);

      // Change preference to dark
      mockSelector.mockImplementation((selector: any) =>
        selector({ themePreference: 'dark' })
      );

      rerender({});

      expect(result.current.isDark).toBe(true);
    });

    it('should react to system theme changes when preference is system', () => {
      mockUseColorScheme.mockReturnValue('light');
      mockUseUserStore.mockImplementation((selector: any) =>
        selector({ themePreference: 'system' })
      );

      const { result, rerender } = renderHook(() => useAppTheme());

      expect(result.current.isDark).toBe(false);

      // System changes to dark
      mockUseColorScheme.mockReturnValue('dark');

      rerender({});

      expect(result.current.isDark).toBe(true);
    });
  });

  describe('performance', () => {
    it('should use zustand selector for efficient state access', () => {
      mockUseColorScheme.mockReturnValue('light');
      const selectorFn = jest.fn((selector: any) =>
        selector({ themePreference: 'system' })
      );
      mockUseUserStore.mockImplementation(selectorFn);

      renderHook(() => useAppTheme());

      expect(selectorFn).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});
