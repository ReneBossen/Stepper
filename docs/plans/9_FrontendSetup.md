# Plan 9: Frontend Setup and Android Emulator

## Summary

This plan establishes the frontend foundation for the Walking App using Expo with React Native and TypeScript. It covers project initialization, Android emulator setup, Supabase client configuration, navigation structure, state management, theming, and environment configuration. This plan creates the scaffolding for all future frontend feature implementations.

## Affected Feature Slices

- **Frontend (New)**: Complete Expo project setup
- **Common**: Environment configuration shared with backend

## Project Structure

```
WalkingApp.Mobile/
├── app.json                    # Expo configuration
├── App.tsx                     # Entry point
├── package.json                # Dependencies
├── .env.example                # Environment template
│
├── src/
│   ├── components/             # Shared UI components
│   ├── screens/                # Screen components by feature
│   │   ├── auth/
│   │   ├── home/
│   │   ├── steps/
│   │   ├── friends/
│   │   ├── groups/
│   │   └── settings/
│   │
│   ├── navigation/             # Navigation configuration
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── MainNavigator.tsx
│   │   └── TabNavigator.tsx
│   │
│   ├── store/                  # State management (Zustand)
│   │   ├── authStore.ts
│   │   ├── userStore.ts
│   │   ├── stepsStore.ts
│   │   ├── friendsStore.ts
│   │   └── groupsStore.ts
│   │
│   ├── services/               # API and external services
│   │   ├── supabase.ts
│   │   └── api/
│   │       ├── authApi.ts
│   │       ├── usersApi.ts
│   │       ├── stepsApi.ts
│   │       └── friendsApi.ts
│   │
│   ├── hooks/                  # Custom React hooks
│   ├── theme/                  # Theming configuration
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   └── config/                 # App configuration
│
└── assets/                     # Static assets
```

## Implementation Steps

### 1. Project Initialization

1. **Create Expo project with TypeScript**:
   ```bash
   npx create-expo-app@latest WalkingApp.Mobile --template expo-template-blank-typescript
   cd WalkingApp.Mobile
   ```

2. **Configure app.json**:
   ```json
   {
     "expo": {
       "name": "Walking App",
       "slug": "walking-app",
       "scheme": "walkingapp",
       "android": {
         "package": "com.walkingapp.mobile"
       }
     }
   }
   ```

3. **Configure TypeScript with path aliases**

### 2. Android Emulator Setup

4. **Document Android Studio installation**:
   - Download Android Studio
   - Install Android SDK (API 34)
   - Configure AVD (Android Virtual Device)
   - Set up environment variables

5. **Create test device**: Pixel 7 with Android 14

### 3. Install Dependencies

6. **Install core dependencies**:
   ```bash
   # Navigation
   npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs

   # Supabase
   npm install @supabase/supabase-js
   npx expo install expo-secure-store

   # State Management
   npm install zustand

   # UI Components (React Native Paper)
   npm install react-native-paper react-native-vector-icons

   # Environment Variables
   npm install react-native-dotenv

   # Storage
   npx expo install @react-native-async-storage/async-storage
   ```

### 4. Supabase Client Configuration

7. **Create Supabase client** (src/services/supabase.ts):
   ```typescript
   import { createClient } from '@supabase/supabase-js';
   import * as SecureStore from 'expo-secure-store';

   const ExpoSecureStoreAdapter = {
     getItem: async (key: string) => SecureStore.getItemAsync(key),
     setItem: async (key: string, value: string) =>
       SecureStore.setItemAsync(key, value),
     removeItem: async (key: string) =>
       SecureStore.deleteItemAsync(key),
   };

   export const supabase = createClient(
     SUPABASE_URL,
     SUPABASE_ANON_KEY,
     {
       auth: {
         storage: ExpoSecureStoreAdapter,
         autoRefreshToken: true,
         persistSession: true,
       },
     }
   );
   ```

### 5. State Management (Zustand)

8. **Create auth store** (src/store/authStore.ts):
   ```typescript
   import { create } from 'zustand';
   import { Session, User } from '@supabase/supabase-js';

   interface AuthState {
     session: Session | null;
     user: User | null;
     isAuthenticated: boolean;
     signIn: (email: string, password: string) => Promise<void>;
     signOut: () => Promise<void>;
     initialize: () => Promise<void>;
   }

   export const useAuthStore = create<AuthState>((set) => ({
     // Implementation
   }));
   ```

9. **Create stores for**: users, steps, friends, groups, notifications

### 6. Navigation Setup

10. **Create root navigator** with authentication flow:
    - Auth stack: Login, Register
    - Main stack: Bottom tabs + modals

11. **Create tab navigator** with 5 tabs:
    - Home, Steps, Friends, Groups, Settings

12. **Configure deep linking** for invite codes and friend requests

### 7. Theme Setup (React Native Paper)

13. **Create theme configuration**:
    ```typescript
    export const lightTheme = {
      colors: {
        primary: '#4CAF50',        // Green for activity
        secondary: '#2196F3',
        background: '#FAFAFA',
        surface: '#FFFFFF',
      },
    };

    export const darkTheme = {
      colors: {
        primary: '#81C784',
        secondary: '#64B5F6',
        background: '#121212',
        surface: '#1E1E1E',
      },
    };
    ```

### 8. Environment Configuration

14. **Create .env.example**:
    ```
    SUPABASE_URL=https://your-project.supabase.co
    SUPABASE_ANON_KEY=your-anon-key
    API_BASE_URL=http://localhost:5000/api
    ```

15. **Configure environment loading** via expo-constants

### 9. App Entry Point

16. **Create App.tsx**:
    ```typescript
    import { Provider as PaperProvider } from 'react-native-paper';
    import { SafeAreaProvider } from 'react-native-safe-area-context';
    import RootNavigator from '@navigation/RootNavigator';

    export default function App() {
      const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;

      return (
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <RootNavigator />
          </PaperProvider>
        </SafeAreaProvider>
      );
    }
    ```

17. **Configure babel for path aliases and environment variables**

## Dependencies

### Frontend (npm)

| Package | Version | Justification |
|---------|---------|---------------|
| @supabase/supabase-js | ^2.x | Supabase client for auth and data |
| @react-navigation/native | ^6.x | Navigation framework |
| zustand | ^4.x | Lightweight state management |
| react-native-paper | ^5.x | Material Design UI components |
| expo-secure-store | Latest | Secure storage for tokens |
| @react-native-async-storage/async-storage | Latest | Async storage |

### Why Zustand over Context API
- Simpler API with less boilerplate
- Better performance (no unnecessary re-renders)
- TypeScript-first design
- Smaller bundle size

### Why React Native Paper over NativeWind
- Material Design 3 out of the box
- Comprehensive component library
- Built-in theme support (light/dark)
- Better suited for data-driven apps

## Database Changes

No direct database changes. Frontend consumes existing backend APIs.

## Tests

**Unit Tests** (using Jest):
- authStore - Test signIn/signOut
- supabase client - Test configuration

**Component Tests** (React Native Testing Library):
- RootNavigator - Test auth flow
- TabNavigator - Test tab navigation

**Integration Tests**:
- Deep linking routes correctly
- Theme switching works

## Acceptance Criteria

- [ ] Expo project created with TypeScript template
- [ ] Android emulator setup documented and working
- [ ] Supabase client configured with secure token storage
- [ ] React Navigation configured (stack + tabs)
- [ ] Zustand stores created for all features
- [ ] React Native Paper theme configured (light/dark)
- [ ] Environment variables configured via .env
- [ ] Path aliases configured
- [ ] Deep linking configured
- [ ] App entry point properly structured
- [ ] Project structure follows recommended organization

## Risks and Open Questions

| Risk/Question | Mitigation/Answer |
|--------------|-------------------|
| Expo SDK version compatibility | Pin SDK version, test upgrades |
| Android emulator performance | Recommend hardware acceleration |
| Supabase token storage security | Use expo-secure-store |
| State persistence across restarts | Use Zustand persist middleware |
| Deep link handling when app closed | Configure intent filters |
| Environment variable security | Never commit .env |

## Android Emulator Setup Guide

### Prerequisites
1. Download Android Studio from https://developer.android.com/studio
2. During installation, select "Android Virtual Device"

### Configure Android SDK
1. Open Android Studio
2. Go to Tools > SDK Manager
3. Install Android 14.0 (API 34)
4. Install SDK Tools: Build-Tools, Emulator, Platform-Tools

### Create AVD
1. Tools > Device Manager
2. Create Device > Pixel 7
3. Select API 34 system image
4. Configure: 2048 MB RAM, 2048 MB storage
5. Name: WalkingApp_Test

### Running
```bash
# Start emulator
emulator -avd WalkingApp_Test

# Start Expo
npx expo start

# Press 'a' to open on Android
```
