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
