# Phase 2: Mobile Foundation Handoff

**Feature**: Step Tracking Integration - Mobile Foundation
**Date**: 2026-01-28
**Phase**: 2 of 5
**Status**: COMPLETE

---

## Summary

This phase establishes the mobile foundation for the unified step tracking service. It creates all the types, interfaces, services, and hooks needed to orchestrate health data synchronization from HealthKit (iOS) and Google Fit (Android) in future phases.

---

## Files Created

### 1. Health Service Types and Factory

| File | Purpose |
|------|---------|
| `src/services/health/types.ts` | Core types: `AuthorizationStatus`, `HealthSource`, `DailyStepData`, `HealthDataProvider`, `SyncState`, `EnableResult`, `SyncResult` |
| `src/services/health/healthProviderFactory.ts` | Factory functions: `getHealthPlatform()`, `createHealthDataProvider()`, `getHealthSource()` |
| `src/services/health/index.ts` | Barrel export for health service module |

### 2. Step Tracking Service

| File | Purpose |
|------|---------|
| `src/services/stepTracking/syncStateManager.ts` | Manages persistence of sync state via AsyncStorage |
| `src/services/stepTracking/unifiedStepTrackingService.ts` | Central orchestrator service with singleton instance |
| `src/services/stepTracking/index.ts` | Barrel export for step tracking module |

### 3. React Hook

| File | Purpose |
|------|---------|
| `src/hooks/useStepTracking.ts` | React hook wrapping the unified service with state management |

---

## Files Modified

### 1. `src/services/api/stepsApi.ts`

Added new types and API methods:

```typescript
// New Types
export interface SyncStepsRequest {
  entries: Array<{
    date: string;
    stepCount: number;
    distanceMeters?: number;
    source: string;
  }>;
}

export interface SyncStepsResponse {
  created: number;
  updated: number;
  total: number;
}

export interface DeleteBySourceResponse {
  deletedCount: number;
}

// New Methods
stepsApi.syncSteps(request: SyncStepsRequest): Promise<SyncStepsResponse>
stepsApi.deleteBySource(source: string): Promise<DeleteBySourceResponse>
```

### 2. `src/services/api/index.ts`

Added exports for new types:
- `SyncStepsRequest`
- `SyncStepsResponse`
- `DeleteBySourceResponse`

### 3. `src/store/stepsStore.ts`

Added sync-related state and actions:

```typescript
// New State
isSyncing: boolean;
syncError: string | null;
lastSyncTimestamp: string | null;

// New Actions
setSyncing: (syncing: boolean) => void;
setSyncError: (error: string | null) => void;
setLastSyncTimestamp: (timestamp: string | null) => void;
refreshAfterSync: () => Promise<void>;
```

---

## API Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    useStepTracking Hook                      │
│  (React state management, loading/error handling)           │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              UnifiedStepTrackingService                      │
│  - initialize()                                              │
│  - isHealthTrackingAvailable()                              │
│  - isHealthTrackingEnabled()                                │
│  - getHealthAuthorizationStatus()                           │
│  - enableHealthTracking()                                    │
│  - disableHealthTracking()                                   │
│  - syncNow()                                                 │
│  - getSyncState()                                            │
│  - getHealthSource()                                         │
└────────────────┬───────────────────────┬────────────────────┘
                 │                       │
┌────────────────▼────────┐  ┌───────────▼────────────────────┐
│   SyncStateManager      │  │   HealthDataProvider           │
│   (AsyncStorage)        │  │   (Interface - Phase 3/4)      │
└─────────────────────────┘  └────────────────────────────────┘
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                    ┌─────────▼────────┐  ┌────────▼─────────┐
                    │  HealthKit       │  │  Google Fit      │
                    │  (iOS - Phase 3) │  │  (Android - P4)  │
                    └──────────────────┘  └──────────────────┘
```

---

## Usage Example

```tsx
import { useStepTracking } from '@hooks/useStepTracking';

function HealthSyncSettings() {
  const {
    isAvailable,
    isEnabled,
    isSyncing,
    syncState,
    error,
    healthSource,
    enable,
    disable,
    syncNow,
  } = useStepTracking();

  if (!isAvailable) {
    return <Text>Health tracking is not available on this device</Text>;
  }

  return (
    <View>
      <Switch
        value={isEnabled}
        onValueChange={(value) => (value ? enable() : disable())}
        disabled={isSyncing}
      />
      {syncState?.lastSyncTimestamp && (
        <Text>Last synced: {syncState.lastSyncTimestamp}</Text>
      )}
      {isEnabled && (
        <Button onPress={syncNow} disabled={isSyncing}>
          Sync Now
        </Button>
      )}
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}
```

---

## Backend API Requirements

The mobile code expects these backend endpoints (not yet implemented):

### PUT /steps/sync

Syncs multiple step entries, creating or updating based on date/source uniqueness.

**Request:**
```json
{
  "entries": [
    {
      "date": "2026-01-28",
      "stepCount": 8500,
      "distanceMeters": 6800,
      "source": "healthkit"
    }
  ]
}
```

**Response:**
```json
{
  "created": 5,
  "updated": 2,
  "total": 7
}
```

### DELETE /steps/source/{source}

Deletes all step entries from a specific source.

**Response:**
```json
{
  "deletedCount": 30
}
```

---

## Verification Checklist

- [x] TypeScript compiles without errors (`npx tsc --noEmit`)
- [x] All files created in correct locations
- [x] Follows existing codebase patterns
- [x] Uses `getErrorMessage()` utility for error handling
- [x] Exports properly configured in barrel files
- [x] Health provider factory returns null (placeholder for Phase 3/4)
- [x] Service gracefully handles null provider
- [x] Store updated with sync-related state
- [x] API client methods added for sync operations

---

## Notes for Phase 3 (HealthKit)

The `createHealthDataProvider()` function currently returns `null`. In Phase 3, this will be updated to:

```typescript
export function createHealthDataProvider(): HealthDataProvider | null {
  const platform = getHealthPlatform();
  if (platform === 'ios') {
    return createHealthKitProvider(); // To be implemented
  }
  if (platform === 'android') {
    return createGoogleFitProvider(); // Phase 4
  }
  return null;
}
```

The HealthKit provider will implement the `HealthDataProvider` interface using the `react-native-health` library.

---

## Notes for Backend Engineer

The following API endpoints need to be implemented:

1. **PUT /steps/sync** - Bulk upsert of step entries by date/source
2. **DELETE /steps/source/{source}** - Delete all entries by source

See the "Backend API Requirements" section above for request/response formats.

---

## Handoff

**Next Phase**: Phase 3 - HealthKit Integration (iOS)

The foundation is complete. Phase 3 will:
1. Install and configure `react-native-health`
2. Implement `HealthKitProvider` conforming to `HealthDataProvider` interface
3. Wire up the factory to return the HealthKit provider on iOS
4. Add app.json/Info.plist configurations for HealthKit

**Backend Dependency**: The sync and delete-by-source endpoints should be implemented before full end-to-end testing of the mobile integration.
