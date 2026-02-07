// Define __DEV__ for tests
global.__DEV__ = true;

// Suppress console warnings in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Mock expo-auth-session
jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: jest.fn(() => [null, null, jest.fn()]),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'stepper://'),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

// Mock expo-application
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {},
    },
    executionEnvironment: 'storeClient',
  },
  ExecutionEnvironment: {
    Bare: 'bare',
    Standalone: 'standalone',
    StoreClient: 'storeClient',
  },
}));

// Mock react-native-health (Apple HealthKit)
jest.mock('react-native-health', () => ({
  default: {
    initHealthKit: jest.fn(),
    isAvailable: jest.fn(),
    getLatestWeight: jest.fn(),
  },
  AppleHealthKit: {
    initHealthKit: jest.fn(),
    isAvailable: jest.fn(),
    getLatestWeight: jest.fn(),
  },
}));

// Mock @kingstinct/react-native-healthconnect (Android Health Connect)
jest.mock('@kingstinct/react-native-healthconnect', () => ({
  initialize: jest.fn(),
  requestPermission: jest.fn(),
  readRecords: jest.fn(),
}), { virtual: true });

// Mock useStepTracking hook
jest.mock('@hooks/useStepTracking', () => ({
  useStepTracking: () => ({
    isEnabled: false,
    hasPermission: false,
    isLoading: false,
    error: null,
    requestPermission: jest.fn(),
    syncSteps: jest.fn(),
    getStepsForDateRange: jest.fn(),
  }),
}));

// Mock @react-native-community/slider
jest.mock('@react-native-community/slider', () => {
  const React = require('react');
  const RN = require('react-native');
  return React.forwardRef((props, ref) =>
    React.createElement(RN.View, {
      ref,
      testID: props.testID,
      ...props,
    })
  );
});

// Mock react-native-paper with compound components
jest.mock('react-native-paper');
jest.doMock('react-native-paper', () => {
  const React = require('react');
  function Dialog({ children, ...props }) {
    return React.createElement('Dialog', props, children);
  }
  Dialog.Title = function DialogTitle({ children, ...props }) {
    return React.createElement('DialogTitle', props, children);
  };
  Dialog.Content = function DialogContent({ children, ...props }) {
    return React.createElement('DialogContent', props, children);
  };
  Dialog.Actions = function DialogActions({ children, ...props }) {
    return React.createElement('DialogActions', props, children);
  };

  const Appbar = {};
  Appbar.Header = function AppbarHeader({ children, ...props }) {
    return React.createElement('AppbarHeader', props, children);
  };
  Appbar.Content = function AppbarContent({ children, ...props }) {
    return React.createElement('AppbarContent', props, children);
  };
  Appbar.Action = function AppbarAction({ onPress, ...props }) {
    return React.createElement('AppbarAction', { ...props, onPress });
  };
  Appbar.BackAction = function AppbarBackAction({ onPress, ...props }) {
    return React.createElement('AppbarBackAction', { ...props, onPress });
  };

  function Card({ children, ...props }) {
    return React.createElement('Card', props, children);
  }
  Card.Content = function CardContent({ children, ...props }) {
    return React.createElement('CardContent', props, children);
  };

  function Text({ children, ...props }) {
    return React.createElement('Text', props, children);
  }

  function TextInput({ children, ...props }) {
    return React.createElement('TextInput', props, children);
  }

  function Button({ children, onPress, ...props }) {
    return React.createElement('Button', { ...props, onPress }, children);
  }

  function Chip({ children, ...props }) {
    return React.createElement('Chip', props, children);
  }

  function ActivityIndicator(props) {
    return React.createElement('ActivityIndicator', props);
  }

  function Searchbar(props) {
    return React.createElement('Searchbar', props);
  }

  function Portal({ children, ...props }) {
    return React.createElement('Portal', props, children);
  }

  function Divider(props) {
    return React.createElement('Divider', props);
  }

  function FAB({ onPress, ...props }) {
    return React.createElement('FAB', { ...props, onPress });
  }

  function useTheme() {
    return {
      colors: {
        primary: '#6200ee',
        secondary: '#03dac6',
        tertiary: '#018786',
        background: '#ffffff',
        surface: '#ffffff',
        surfaceVariant: '#f5f5f5',
        error: '#b00020',
        onPrimary: '#ffffff',
        onSecondary: '#000000',
        onTertiary: '#ffffff',
        onBackground: '#000000',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        outline: '#999999',
      },
      dark: false,
    };
  }

  return {
    Dialog,
    Appbar,
    Text,
    TextInput,
    Button,
    Card,
    Chip,
    ActivityIndicator,
    Searchbar,
    Portal,
    Divider,
    FAB,
    useTheme,
  };
});
