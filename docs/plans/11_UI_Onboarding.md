# Plan 11: Onboarding UI

## Summary

This plan implements the onboarding flow for new users after successful registration. The flow includes welcome screens explaining the app's features, requesting necessary permissions (health data, notifications), and completing initial profile setup. This creates a smooth first-time user experience.

## Screens

### 1. Welcome Screen 1 (App Introduction)
### 2. Welcome Screen 2 (Features Overview)
### 3. Welcome Screen 3 (Social Features)
### 4. Permissions Screen (Health & Notifications)
### 5. Profile Setup Screen
### 6. Preferences Setup Screen

---

## 1. Welcome Screen 1 - App Introduction

### Screen Purpose
Introduce users to the Walking App and its core purpose.

### ASCII Wireframe

```
┌─────────────────────────────────────┐
│                 Skip →              │
│                                     │
│                                     │
│            🚶‍♂️🚶‍♀️                   │
│         Walking App                 │
│                                     │
│      Track Your Steps               │
│                                     │
│   Keep track of your daily          │
│   walking activity and reach        │
│   your fitness goals                │
│                                     │
│                                     │
│                                     │
│         ○ ● ○ ○                     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │          Next               │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### Components

- `SafeAreaView` (screen container)
- `Image` or emoji (large illustration)
- `Text` (title and description)
- `Button` (Next)
- `TouchableOpacity` (Skip)
- Pagination dots indicator

### Navigation

**From:** Register screen (after successful signup)

**To:** Welcome Screen 2 (via Next) or Permissions Screen (via Skip)

---

## 2. Welcome Screen 2 - Features Overview

### ASCII Wireframe

```
┌─────────────────────────────────────┐
│                 Skip →              │
│                                     │
│                                     │
│            📊                       │
│                                     │
│      Daily Insights                 │
│                                     │
│   View your progress with           │
│   detailed charts and               │
│   statistics                        │
│                                     │
│                                     │
│                                     │
│         ○ ○ ● ○                     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │          Next               │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

---

## 3. Welcome Screen 3 - Social Features

### ASCII Wireframe

```
┌─────────────────────────────────────┐
│                 Skip →              │
│                                     │
│                                     │
│            👥                       │
│                                     │
│      Connect & Compete              │
│                                     │
│   Add friends and join              │
│   groups to compete on              │
│   leaderboards                      │
│                                     │
│                                     │
│                                     │
│         ○ ○ ○ ●                     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │       Get Started           │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### Navigation

**To:** Permissions Screen (via "Get Started")

---

## 4. Permissions Screen

### Screen Purpose
Request necessary permissions for the app to function properly.

### ASCII Wireframe

```
┌─────────────────────────────────────┐
│  ← Back                             │
│                                     │
│      We Need Permissions            │
│                                     │
│   To provide the best experience    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  🏃  Activity & Motion       │   │
│  │                              │   │
│  │  Track your daily steps      │   │
│  │  and distance                │   │
│  │                              │   │
│  │          [Allow]             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  🔔  Notifications           │   │
│  │                              │   │
│  │  Get updates on friend       │   │
│  │  requests and achievements   │   │
│  │                              │   │
│  │          [Allow]             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │       Continue              │   │
│  └─────────────────────────────┘   │
│                                     │
│         Skip for now                │
│                                     │
└─────────────────────────────────────┘
```

### Components

**React Native Paper:**
- `Card` (for each permission)
- `Button` (Continue, Allow buttons)
- `Text` (descriptions)

**Expo:**
- `expo-sensors` / `expo-health` (for activity permission)
- `expo-notifications` (for notification permission)

### Interactions

1. **Allow Activity Permission**:
   - Call `requestPermissionsAsync()` from expo-sensors
   - Update card to show "Granted" status
   - Enable continue button when granted

2. **Allow Notifications Permission**:
   - Call `requestPermissionsAsync()` from expo-notifications
   - Register push token if granted
   - Update card status

3. **Continue Button**:
   - Check if activity permission granted (required)
   - Navigate to Profile Setup
   - If activity denied, show error message

4. **Skip for Now**:
   - Navigate to Profile Setup
   - Show warning that some features won't work

### State Management

**Local State:**
- `activityPermissionStatus: 'granted' | 'denied' | 'undetermined'`
- `notificationPermissionStatus: 'granted' | 'denied' | 'undetermined'`

---

## 5. Profile Setup Screen

### Screen Purpose
Allow users to set up their basic profile information.

### ASCII Wireframe

```
┌─────────────────────────────────────┐
│  ← Back                             │
│                                     │
│      Set Up Your Profile            │
│                                     │
│                                     │
│         ┌─────────┐                 │
│         │         │                 │
│         │   👤    │  📷             │
│         │         │                 │
│         └─────────┘                 │
│       Add Profile Photo             │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Display Name                │   │
│  │ John Doe                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Bio (Optional)              │   │
│  │ Love walking and staying    │   │
│  │ active!                     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │       Continue              │   │
│  └─────────────────────────────┘   │
│                                     │
│         Skip for now                │
│                                     │
└─────────────────────────────────────┘
```

### Components

**React Native Paper:**
- `Avatar.Image` (profile photo)
- `IconButton` (camera icon)
- `TextInput` (display name, bio)
- `Button` (Continue)

**Expo:**
- `expo-image-picker` (for selecting/taking photo)

### API Calls

```typescript
// Update user profile
PUT /api/users/me
{
  displayName: string,
  avatarUrl?: string,
  bio?: string
}
```

### Interactions

1. **Profile Photo Button**:
   - Show action sheet: Take Photo / Choose from Library
   - Use expo-image-picker
   - Upload image to Supabase Storage
   - Update avatar URL in profile

2. **Display Name Input**:
   - Validate 2-50 characters
   - Show character count

3. **Bio Input** (optional):
   - Max 200 characters
   - Show character count
   - Multiline input

4. **Continue Button**:
   - Validate display name
   - Call API to update profile
   - Navigate to Preferences Setup

5. **Skip for Now**:
   - Navigate to Preferences Setup with defaults

### State Management

**Local State:**
- `displayName: string`
- `bio: string`
- `avatarUrl: string | null`
- `isUploading: boolean`

**Global State:**
- Update `userStore` with profile data

---

## 6. Preferences Setup Screen

### Screen Purpose
Configure initial user preferences for units, goals, and privacy.

### ASCII Wireframe

```
┌─────────────────────────────────────┐
│  ← Back                             │
│                                     │
│      Set Your Preferences           │
│                                     │
│  Units                              │
│  ┌──────────┐  ┌──────────┐        │
│  │ Metric ✓ │  │ Imperial │        │
│  └──────────┘  └──────────┘        │
│                                     │
│  Daily Step Goal                    │
│  ┌─────────────────────────────┐   │
│  │ 10,000                      │   │
│  └─────────────────────────────┘   │
│  ────────○──────────                │
│  5K              20K                │
│                                     │
│  Privacy                            │
│  Who can find you?                  │
│  ┌─────────────────────────────┐   │
│  │ Everyone              ▼     │   │
│  └─────────────────────────────┘   │
│                                     │
│  Who can see your steps?            │
│  ┌─────────────────────────────┐   │
│  │ Everyone              ▼     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      Finish Setup           │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### Components

**React Native Paper:**
- `SegmentedButtons` (units selection)
- `TextInput` (step goal)
- `Slider` (step goal slider)
- `Select` / `Menu` (privacy dropdowns)
- `Button` (Finish Setup)

### API Calls

```typescript
// Update user preferences
PUT /api/users/me/preferences
{
  units: 'metric' | 'imperial',
  dailyStepGoal: number,
  privacy: {
    findMe: 'everyone' | 'friends_of_friends' | 'nobody',
    showSteps: 'everyone' | 'friends_of_friends' | 'nobody'
  }
}
```

### Interactions

1. **Units Selection**:
   - Toggle between Metric (km) and Imperial (miles)
   - Update local state

2. **Step Goal Slider**:
   - Range: 1,000 - 50,000
   - Default: 10,000
   - Snap to 1,000 increments
   - Show current value above slider

3. **Privacy Dropdowns**:
   - Options: Everyone, Friends of Friends, Nobody
   - Default: Everyone

4. **Finish Setup Button**:
   - Save all preferences to backend
   - Update global preferences store
   - Show success animation
   - Navigate to Main App (Home Screen)
   - Mark onboarding as complete

### State Management

**Local State:**
- `units: 'metric' | 'imperial'`
- `dailyStepGoal: number`
- `privacyFindMe: PrivacyLevel`
- `privacyShowSteps: PrivacyLevel`
- `isSaving: boolean`

**Global State:**
- Update `userStore.preferences`
- Set `onboardingCompleted: true` in AsyncStorage

---

## Implementation Details

### File Structure

```
src/screens/onboarding/
├── WelcomeCarousel.tsx          # Screens 1-3 in swipeable carousel
├── PermissionsScreen.tsx         # Screen 4
├── ProfileSetupScreen.tsx        # Screen 5
├── PreferencesSetupScreen.tsx    # Screen 6
├── components/
│   ├── OnboardingLayout.tsx
│   ├── WelcomeSlide.tsx
│   ├── PermissionCard.tsx
│   └── ProfilePhotoUploader.tsx
└── hooks/
    ├── useOnboarding.ts
    └── usePermissions.ts
```

### Navigation Flow

```
AuthNavigator (Register)
    ↓
WelcomeCarousel (Screens 1-3)
    ↓
PermissionsScreen
    ↓
ProfileSetupScreen
    ↓
PreferencesSetupScreen
    ↓
MainNavigator (Home Screen)
```

### Persistence

```typescript
// Store onboarding completion status
await AsyncStorage.setItem('@onboarding_completed', 'true');

// Check on app launch
const hasCompletedOnboarding = await AsyncStorage.getItem('@onboarding_completed');
```

### Skip Logic

- Users can skip any step except activity permissions
- Skipped steps use default values
- Users can complete skipped steps later in Settings

## Dependencies

**Required from Previous Plans:**
- Plan 9: Frontend setup with navigation
- Plan 10: Auth screens for registration flow

**Expo Packages:**
- `expo-sensors` or `expo-health` - Activity tracking permissions
- `expo-notifications` - Push notification permissions
- `expo-image-picker` - Profile photo selection
- `@react-native-async-storage/async-storage` - Onboarding status

**Backend APIs:**
- `PUT /api/users/me` - Update profile
- `PUT /api/users/me/preferences` - Update preferences
- `POST /api/notifications/push-token` - Register push token

## Acceptance Criteria

- [ ] Welcome carousel shows 3 slides with pagination
- [ ] Users can skip welcome screens
- [ ] Permissions screen requests activity and notification access
- [ ] Activity permission is required to continue
- [ ] Profile setup allows photo upload
- [ ] Display name is validated
- [ ] Preferences screen sets units, goal, and privacy
- [ ] Step goal slider works smoothly
- [ ] Finish button saves all data and navigates to main app
- [ ] Onboarding completion is persisted
- [ ] Returning users skip onboarding
- [ ] All screens are responsive
- [ ] Loading states shown during API calls

## Accessibility

- Welcome slides announce content changes
- Permission cards clearly explain why needed
- Form inputs have proper labels
- Slider has accessible values
- All touch targets are 44x44 minimum
- Support for screen readers

## Testing

**Component Tests:**
- Welcome carousel swipe works
- Permission requests trigger correctly
- Profile photo upload works
- Preferences are saved correctly

**Integration Tests:**
- Complete onboarding flow from start to finish
- Skip flow uses default values
- Onboarding completion prevents re-showing
