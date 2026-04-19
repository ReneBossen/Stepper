import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Stepper',
  slug: 'stepper',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/StepperIcon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    icon: './assets/StepperIcon.png',
    bundleIdentifier: 'com.stepper.mobile',
    associatedDomains: ['applinks:stepper.com'],
    infoPlist: {
      NSHealthShareUsageDescription:
        'Stepper needs access to your health data to automatically track your daily steps from Apple Health.',
      NSHealthUpdateUsageDescription:
        'Stepper needs permission to save step data.',
      UIBackgroundModes: ['processing'],
      BGTaskSchedulerPermittedIdentifiers: ['STEP_SYNC_TASK'],
      ITSAppUsesNonExemptEncryption: false,
    },
    entitlements: {
      'com.apple.developer.healthkit': true,
      'com.apple.developer.healthkit.background-delivery': true,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/StepperIcon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.stepper.mobile',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'stepper.com',
            pathPrefix: '/',
          },
          {
            scheme: 'stepper',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    permissions: ['android.permission.ACTIVITY_RECOGNITION'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  scheme: 'stepper',
  runtimeVersion: {
    policy: 'fingerprint',
  },
  updates: {
    url: 'https://u.expo.dev/c3cc51f2-9e6f-4840-9536-b013d859849e',
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
  },
  plugins: [
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 26,
          usesCleartextTraffic: true,
        },
      },
    ],
    'expo-secure-store',
    'expo-web-browser',
    [
      '@kingstinct/react-native-healthkit',
      {
        NSHealthShareUsageDescription:
          'Stepper needs access to your health data to automatically track your daily steps from Apple Health.',
        NSHealthUpdateUsageDescription:
          'Stepper needs permission to save step data.',
        background: true,
      },
    ],
    [
      'react-native-health-connect',
      {
        requestPermissionsRationale:
          'Stepper needs access to your health data to automatically track your daily steps.',
      },
    ],
    './plugins/withHealthConnectPermissions',
    '@react-native-community/datetimepicker',
    'expo-background-task',
    'expo-localization',
  ],
  extra: {
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:5000',
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID ?? '',
    posthogApiKey: process.env.POSTHOG_API_KEY ?? '',
    posthogHost: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
    eas: {
      projectId: 'c3cc51f2-9e6f-4840-9536-b013d859849e',
    },
  },
  owner: 'bossen',
});
