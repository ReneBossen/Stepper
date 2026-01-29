import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

// Mock dependencies before imports
jest.mock('@hooks/useAppTheme');
jest.mock('@theme/theme', () => ({
  lightTheme: { colors: {}, roundness: 8 },
  darkTheme: { colors: {}, roundness: 8 },
  lightNavigationTheme: { dark: false, colors: {} },
  darkNavigationTheme: { dark: true, colors: {} },
}));
jest.mock('react-native-paper', () => ({
  PaperProvider: ({ children, theme }: any) => {
    const React = require('react');
    return React.createElement('PaperProvider', { testID: 'paper-provider', theme }, children);
  },
}));
jest.mock('expo-status-bar', () => ({
  StatusBar: ({ style }: any) => {
    const React = require('react');
    return React.createElement('StatusBar', { testID: 'status-bar', style });
  },
}));

// Import after mocks
import { ThemeProvider } from '../ThemeProvider';
import { useAppTheme } from '@hooks/useAppTheme';

const mockUseAppTheme = useAppTheme as jest.MockedFunction<typeof useAppTheme>;

describe('ThemeProvider', () => {
  const mockPaperTheme = {
    colors: { primary: '#4CAF50', background: '#FFFFFF' },
    roundness: 8,
  };

  const mockNavigationTheme = {
    dark: false,
    colors: { primary: '#4CAF50', background: '#FFFFFF' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render children', () => {
      mockUseAppTheme.mockReturnValue({
        paperTheme: mockPaperTheme as any,
        navigationTheme: mockNavigationTheme as any,
        isDark: false,
      });

      const { getByText } = render(
        <ThemeProvider>
          <Text>Test Content</Text>
        </ThemeProvider>
      );

      expect(getByText('Test Content')).toBeDefined();
    });

    it('should render PaperProvider with correct theme', () => {
      mockUseAppTheme.mockReturnValue({
        paperTheme: mockPaperTheme as any,
        navigationTheme: mockNavigationTheme as any,
        isDark: false,
      });

      const { getByTestId } = render(
        <ThemeProvider>
          <Text>Test Content</Text>
        </ThemeProvider>
      );

      const paperProvider = getByTestId('paper-provider');
      expect(paperProvider).toBeDefined();
      expect(paperProvider.props.theme).toEqual(mockPaperTheme);
    });

    it('should render StatusBar component', () => {
      mockUseAppTheme.mockReturnValue({
        paperTheme: mockPaperTheme as any,
        navigationTheme: mockNavigationTheme as any,
        isDark: false,
      });

      const { getByTestId } = render(
        <ThemeProvider>
          <Text>Test Content</Text>
        </ThemeProvider>
      );

      expect(getByTestId('status-bar')).toBeDefined();
    });
  });

  describe('light theme', () => {
    it('should set StatusBar style to dark when theme is light', () => {
      mockUseAppTheme.mockReturnValue({
        paperTheme: mockPaperTheme as any,
        navigationTheme: mockNavigationTheme as any,
        isDark: false,
      });

      const { getByTestId } = render(
        <ThemeProvider>
          <Text>Test Content</Text>
        </ThemeProvider>
      );

      const statusBar = getByTestId('status-bar');
      expect(statusBar.props.style).toBe('dark');
    });

    it('should use light paper theme', () => {
      const lightPaperTheme = {
        colors: { primary: '#4CAF50', background: '#FAFAFA' },
        roundness: 8,
      };

      mockUseAppTheme.mockReturnValue({
        paperTheme: lightPaperTheme as any,
        navigationTheme: mockNavigationTheme as any,
        isDark: false,
      });

      const { getByTestId } = render(
        <ThemeProvider>
          <Text>Test Content</Text>
        </ThemeProvider>
      );

      const paperProvider = getByTestId('paper-provider');
      expect(paperProvider.props.theme.colors.background).toBe('#FAFAFA');
    });
  });

  describe('dark theme', () => {
    it('should set StatusBar style to light when theme is dark', () => {
      const darkPaperTheme = {
        colors: { primary: '#81C784', background: '#121212' },
        roundness: 8,
      };

      const darkNavigationTheme = {
        dark: true,
        colors: { primary: '#81C784', background: '#121212' },
      };

      mockUseAppTheme.mockReturnValue({
        paperTheme: darkPaperTheme as any,
        navigationTheme: darkNavigationTheme as any,
        isDark: true,
      });

      const { getByTestId } = render(
        <ThemeProvider>
          <Text>Test Content</Text>
        </ThemeProvider>
      );

      const statusBar = getByTestId('status-bar');
      expect(statusBar.props.style).toBe('light');
    });

    it('should use dark paper theme', () => {
      const darkPaperTheme = {
        colors: { primary: '#81C784', background: '#121212' },
        roundness: 8,
      };

      const darkNavigationTheme = {
        dark: true,
        colors: { primary: '#81C784', background: '#121212' },
      };

      mockUseAppTheme.mockReturnValue({
        paperTheme: darkPaperTheme as any,
        navigationTheme: darkNavigationTheme as any,
        isDark: true,
      });

      const { getByTestId } = render(
        <ThemeProvider>
          <Text>Test Content</Text>
        </ThemeProvider>
      );

      const paperProvider = getByTestId('paper-provider');
      expect(paperProvider.props.theme.colors.background).toBe('#121212');
    });
  });

  describe('theme switching', () => {
    it('should update StatusBar style when theme changes from light to dark', () => {
      mockUseAppTheme.mockReturnValue({
        paperTheme: mockPaperTheme as any,
        navigationTheme: mockNavigationTheme as any,
        isDark: false,
      });

      const { getByTestId, rerender } = render(
        <ThemeProvider>
          <Text>Test Content</Text>
        </ThemeProvider>
      );

      expect(getByTestId('status-bar').props.style).toBe('dark');

      // Switch to dark theme
      const darkPaperTheme = {
        colors: { primary: '#81C784', background: '#121212' },
        roundness: 8,
      };

      mockUseAppTheme.mockReturnValue({
        paperTheme: darkPaperTheme as any,
        navigationTheme: { dark: true, colors: {} } as any,
        isDark: true,
      });

      rerender(
        <ThemeProvider>
          <Text>Test Content</Text>
        </ThemeProvider>
      );

      expect(getByTestId('status-bar').props.style).toBe('light');
    });

    it('should update PaperProvider theme when theme changes', () => {
      mockUseAppTheme.mockReturnValue({
        paperTheme: mockPaperTheme as any,
        navigationTheme: mockNavigationTheme as any,
        isDark: false,
      });

      const { getByTestId, rerender } = render(
        <ThemeProvider>
          <Text>Test Content</Text>
        </ThemeProvider>
      );

      expect(getByTestId('paper-provider').props.theme).toEqual(mockPaperTheme);

      // Switch to dark theme
      const darkPaperTheme = {
        colors: { primary: '#81C784', background: '#121212' },
        roundness: 8,
      };

      mockUseAppTheme.mockReturnValue({
        paperTheme: darkPaperTheme as any,
        navigationTheme: { dark: true, colors: {} } as any,
        isDark: true,
      });

      rerender(
        <ThemeProvider>
          <Text>Test Content</Text>
        </ThemeProvider>
      );

      expect(getByTestId('paper-provider').props.theme).toEqual(darkPaperTheme);
    });
  });

  describe('children handling', () => {
    it('should render multiple children', () => {
      mockUseAppTheme.mockReturnValue({
        paperTheme: mockPaperTheme as any,
        navigationTheme: mockNavigationTheme as any,
        isDark: false,
      });

      const { getByText } = render(
        <ThemeProvider>
          <Text>First Child</Text>
          <Text>Second Child</Text>
        </ThemeProvider>
      );

      expect(getByText('First Child')).toBeDefined();
      expect(getByText('Second Child')).toBeDefined();
    });

    it('should render nested components', () => {
      mockUseAppTheme.mockReturnValue({
        paperTheme: mockPaperTheme as any,
        navigationTheme: mockNavigationTheme as any,
        isDark: false,
      });

      const NestedComponent = () => <Text>Nested Component</Text>;

      const { getByText } = render(
        <ThemeProvider>
          <NestedComponent />
        </ThemeProvider>
      );

      expect(getByText('Nested Component')).toBeDefined();
    });
  });

  describe('hook integration', () => {
    it('should call useAppTheme hook', () => {
      mockUseAppTheme.mockReturnValue({
        paperTheme: mockPaperTheme as any,
        navigationTheme: mockNavigationTheme as any,
        isDark: false,
      });

      render(
        <ThemeProvider>
          <Text>Test</Text>
        </ThemeProvider>
      );

      expect(mockUseAppTheme).toHaveBeenCalled();
    });

    it('should use theme values from useAppTheme', () => {
      const customTheme = {
        colors: { primary: '#FF0000', background: '#0000FF' },
        roundness: 12,
      };

      mockUseAppTheme.mockReturnValue({
        paperTheme: customTheme as any,
        navigationTheme: mockNavigationTheme as any,
        isDark: false,
      });

      const { getByTestId } = render(
        <ThemeProvider>
          <Text>Test</Text>
        </ThemeProvider>
      );

      expect(getByTestId('paper-provider').props.theme).toEqual(customTheme);
    });
  });

  describe('props interface', () => {
    it('should accept ReactNode children', () => {
      mockUseAppTheme.mockReturnValue({
        paperTheme: mockPaperTheme as any,
        navigationTheme: mockNavigationTheme as any,
        isDark: false,
      });

      const { getByText } = render(
        <ThemeProvider>
          <Text>String child</Text>
        </ThemeProvider>
      );

      expect(getByText('String child')).toBeDefined();
    });
  });
});
