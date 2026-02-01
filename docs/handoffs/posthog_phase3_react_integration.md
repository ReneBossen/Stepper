# Phase 3 Handoff: PostHog React Integration

## Summary

Implemented React hooks for the PostHog analytics integration, providing a convenient and type-safe interface for tracking events, managing consent, and checking feature flags in React components.

## Files Created

### 1. `Stepper.Mobile/src/hooks/useAnalytics.ts`

A comprehensive React hook for analytics tracking that wraps the analytics store.

**API:**
```typescript
const {
  // Tracking
  track,              // (event, properties?) => void - Type-safe event tracking
  identify,           // (userId, properties?) => void - Identify user
  reset,              // () => void - Reset identity (logout)

  // User Properties
  setUserProperties,  // (properties) => void - Update user properties

  // Consent
  hasConsent,         // boolean - Current consent state
  grantConsent,       // () => Promise<void> - Grant consent
  revokeConsent,      // () => Promise<void> - Revoke consent

  // Feature Flags
  isFeatureFlagEnabled, // (flag) => boolean | undefined

  // State
  isInitialized,      // boolean - Is analytics initialized
  isInitializing,     // boolean - Is initialization in progress
  error,              // string | null - Error message
  clearError,         // () => void - Clear error state
  initialize,         // () => Promise<void> - Manual initialization
  flush,              // () => Promise<void> - Flush queued events
  reloadFeatureFlags, // () => Promise<void> - Reload flags from server
} = useAnalytics();
```

**Key Features:**
- Full type safety for all 54 analytics events via `EventPropertiesMap`
- Memoized callbacks to prevent unnecessary re-renders
- Uses selectors from `analyticsStore` for efficient updates
- Comprehensive JSDoc documentation with examples

### 2. `Stepper.Mobile/src/hooks/useFeatureFlag.ts`

Specialized hooks for feature flag management.

**Hooks provided:**

1. **`useFeatureFlag(flag, defaultValue?)`** - Basic feature flag check
   ```typescript
   const isEnabled = useFeatureFlag('new-feature-experiment');
   const showBeta = useFeatureFlag('beta-features', true);
   ```

2. **`useFeatureFlags(flags, defaultValues?)`** - Multiple flags at once
   ```typescript
   const flags = useFeatureFlags(
     ['new-dashboard', 'social-features'],
     { 'social-features': true }
   );
   // flags['new-dashboard'] => boolean
   // flags['social-features'] => boolean
   ```

3. **`useFeatureFlagWithState(flag, defaultValue?)`** - With loading state
   ```typescript
   const { isEnabled, isLoading, refresh } = useFeatureFlagWithState('premium');
   ```

4. **`useFeatureFlagRefreshOnUserChange(userId)`** - Auto-refresh on user change
   ```typescript
   // Automatically reloads flags when userId changes
   useFeatureFlagRefreshOnUserChange(currentUserId);
   ```

**Key Features:**
- Support for default values when PostHog is unavailable
- Caches flag values with memoization
- Loading state tracking for async operations
- Automatic refresh on user identity change

### 3. `Stepper.Mobile/src/hooks/index.ts`

Updated exports file including all new hooks:
- `useAnalytics` and `UseAnalyticsResult` type
- `useFeatureFlag`, `useFeatureFlags`, `useFeatureFlagWithState`, `useFeatureFlagRefreshOnUserChange`
- `FeatureFlagsResult` type

## Type Safety

The `track` function is fully type-safe:

```typescript
// Compiles - correct event and properties
track('screen_viewed', { screen_name: 'Home' });
track('daily_goal_achieved', { goal: 10000, actual_steps: 12345 });

// TypeScript errors:
track('screen_viewed', { wrong_prop: 'value' }); // Error: wrong properties
track('unknown_event', {}); // Error: unknown event
```

## Dependencies

The hooks depend on:
- `@store/analyticsStore` - The Zustand store from Phase 1
- `@services/analytics/analyticsTypes` - Type definitions from Phase 1

No new packages required.

## Verification

- [x] TypeScript compiles without errors (`npx tsc --noEmit`)
- [x] All existing tests pass (114 tests in hooks directory)
- [x] Hooks follow existing patterns in the codebase
- [x] Callbacks are memoized with `useCallback`
- [x] Return objects are memoized with `useMemo`
- [x] Comprehensive JSDoc documentation included
- [x] Examples provided for each hook

## Usage Examples

### Basic Screen Tracking
```tsx
function HomeScreen() {
  const { track } = useAnalytics();

  useEffect(() => {
    track('screen_viewed', { screen_name: 'Home' });
  }, [track]);

  return <View>...</View>;
}
```

### Feature Flag Gating
```tsx
function Dashboard() {
  const showNewFeature = useFeatureFlag('new-dashboard-experiment');

  return (
    <View>
      {showNewFeature ? <NewDashboard /> : <LegacyDashboard />}
    </View>
  );
}
```

### Consent Management
```tsx
function PrivacySettings() {
  const { hasConsent, grantConsent, revokeConsent } = useAnalytics();

  return (
    <Switch
      value={hasConsent}
      onValueChange={(value) => value ? grantConsent() : revokeConsent()}
    />
  );
}
```

### User Identification
```tsx
function AuthProvider({ children }) {
  const { identify, reset } = useAnalytics();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user) {
      identify(user.id, {
        daily_step_goal: user.daily_goal,
        friend_count: user.friends?.length ?? 0,
      });
    } else {
      reset();
    }
  }, [user, identify, reset]);

  return children;
}
```

## Next Steps

Phase 3 (React Integration) is complete. The next phases are:

- **Phase 4**: Event Integration - Add tracking calls throughout the app
- **Phase 5**: User Properties - Set device/app properties on initialization
- **Phase 6**: Consent UI - Add consent prompt and settings screen

---

**Handoff to**: Tester Agent (for test coverage) or continue to Phase 4
**Date**: 2026-01-29
