# Phase 4: Background Sync Service - Handoff Document

**Date**: 2026-01-28
**Feature**: Step Tracking Integration - Background Sync
**Agent**: Frontend Engineer

## Summary

Implemented background synchronization for step data using `expo-background-task` (the modern replacement for the deprecated `expo-background-fetch`). The app will now sync step data from health APIs (HealthKit/Google Fit) approximately every 2 hours, even when the app is not actively open.

## Important: Package Selection Update

The original plan specified `expo-background-fetch`, but this package has been **deprecated** by Expo. The implementation uses `expo-background-task` instead, which is the official replacement with improved reliability and API design.

Key differences from the original plan:
- `expo-background-task` uses `BackgroundTaskResult.Success/Failed` instead of `BackgroundFetchResult.NewData/NoData/Failed`
- `minimumInterval` is specified in **minutes** (not seconds)
- iOS requires `UIBackgroundModes: ["processing"]` instead of `["fetch"]`

## Files Created

### 1. `src/services/stepTracking/backgroundSyncTask.ts`

Background task definition and registration functions:

```typescript
// Key exports:
export async function registerBackgroundSync(): Promise<boolean>
export async function unregisterBackgroundSync(): Promise<void>
export async function isBackgroundSyncRegistered(): Promise<boolean>
export async function getBackgroundSyncStatus(): Promise<BackgroundTaskStatus>
export async function triggerBackgroundSyncForTesting(): Promise<boolean>
export const TASK_NAME = 'STEP_SYNC_TASK'
```

The task:
- Is defined at module load time (global scope) as required by Expo
- Checks if health tracking is enabled before syncing
- Initializes the step tracking service if needed
- Calls `unifiedStepTrackingService.syncNow()` to perform the sync
- Returns appropriate result codes to the system

## Files Modified

### 2. `src/services/stepTracking/index.ts`

Added exports for background sync functions:
```typescript
export {
  registerBackgroundSync,
  unregisterBackgroundSync,
  isBackgroundSyncRegistered,
  getBackgroundSyncStatus,
  triggerBackgroundSyncForTesting,
  TASK_NAME as BACKGROUND_SYNC_TASK_NAME,
} from './backgroundSyncTask';
```

### 3. `src/services/stepTracking/unifiedStepTrackingService.ts`

- Added import for background sync functions
- Modified `enableHealthTracking()` to register background sync after saving enabled state
- Modified `disableHealthTracking()` to unregister background sync before cleanup

### 4. `app.json`

- Added `"UIBackgroundModes": ["processing"]` to iOS infoPlist
- `expo-background-task` plugin was auto-added by `npx expo install`

### 5. `index.ts` (app entry point)

Added early import to ensure background task is defined at module load time:
```typescript
import './src/services/stepTracking/backgroundSyncTask';
```

## Configuration Details

### Sync Interval
- **Configured**: 120 minutes (2 hours)
- **Minimum for Android**: 15 minutes (system enforced)
- **Note**: Actual execution timing is controlled by the OS based on battery, network, and usage patterns

### iOS Background Modes
- `processing` - Required for background task execution

### Packages Installed
- `expo-background-task` (auto-added to plugins)
- `expo-task-manager`

## Platform Behavior

### iOS
- Background Tasks API is only available on physical devices (not simulators)
- Task has approximately 30 seconds to complete
- System schedules tasks based on battery, network, and app usage patterns
- User must have Background App Refresh enabled in device settings

### Android
- Uses WorkManager API under the hood
- Minimum interval is 15 minutes (enforced by system)
- Doze mode may delay execution
- Tasks are batched with other background work

## Testing Notes

### Development Testing

Use the testing function in development builds:
```typescript
import { triggerBackgroundSyncForTesting } from '@services/stepTracking';

// Only works in development/debug builds
const triggered = await triggerBackgroundSyncForTesting();
```

### Manual Testing Checklist

- [ ] Enable health tracking and verify background sync is registered (check console logs)
- [ ] Disable health tracking and verify background sync is unregistered
- [ ] Background sync runs while app is backgrounded (requires physical device)
- [ ] Sync works after force-closing and reopening app
- [ ] Disabling health tracking stops background sync

## Manual Actions Required

### MANUAL ACTION REQUIRED

- [ ] Run development build on physical iOS device to test background sync (Background Tasks API unavailable on simulators)
- [ ] Verify Background App Refresh is enabled in iOS device settings
- [ ] Test background sync execution by backgrounding the app and waiting (may take hours for system to trigger)
- [ ] Run EAS build for production testing: `eas build --platform ios` / `eas build --platform android`

## Verification Completed

- [x] TypeScript compiles without errors (`npx tsc --noEmit`)
- [x] Background task is defined at module load time via index.ts import
- [x] Task registers when health tracking is enabled
- [x] Task unregisters when health tracking is disabled
- [x] iOS UIBackgroundModes configured correctly
- [x] expo-background-task plugin added to app.json

## Notes for Future Development

1. **Stale Sync Detection**: The plan mentions showing notifications if sync hasn't run for 24+ hours. This requires additional UI work (notification in home screen, push notification) and is not part of this phase.

2. **HealthKit Background Delivery**: iOS supports HealthKit Background Delivery which can wake the app when new health data is available. This could provide more timely syncs but requires additional implementation.

3. **Battery Optimization**: The current implementation relies on the system's battery management. Additional battery checks could be added if needed.

## Handoff

**Passed to**: Tester Agent for test coverage
