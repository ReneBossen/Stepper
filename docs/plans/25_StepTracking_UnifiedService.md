# Plan: Unified Step Tracking Service

## Overview

This plan covers the unified step tracking service that orchestrates all step data sources (HealthKit, Google Fit, manual entry) and provides a consistent interface for the rest of the app. This service is the central coordinator for step tracking functionality.

## Goals

1. Provide a platform-agnostic interface for health data access
2. Detect platform and select appropriate health data provider
3. Orchestrate on-demand sync (manual trigger)
4. Manage sync state and last sync timestamps
5. Coordinate with background sync service
6. Update Zustand store with synced data
7. Handle health tracking enable/disable flows

## Non-Goals

- Implement platform-specific health APIs (covered in HealthKit/Google Fit plans)
- Implement background task scheduling (covered in background sync plan)
- Implement manual entry UI (covered in manual entry plan)
- Handle offline queuing (sync only when online)

## Technical Approach

### 1. Service Architecture

```
                    +------------------------+
                    |     App Components     |
                    |  (Screens, Settings)   |
                    +------------------------+
                              |
                              v
                    +------------------------+
                    | Unified Step Tracking  |
                    |       Service          |
                    +------------------------+
                    /           |            \
                   v            v             v
         +-----------+  +-----------+  +-------------+
         | HealthKit |  | Google Fit|  |   Manual    |
         |  Service  |  |  Service  |  |   Entry     |
         +-----------+  +-----------+  +-------------+
         (iOS only)    (Android only)  (All platforms)
                   \            |             /
                    v           v            v
                    +------------------------+
                    |      Steps API         |
                    |      (Backend)         |
                    +------------------------+
```

### 2. Platform Detection

```typescript
import { Platform } from 'react-native';

type HealthPlatform = 'ios' | 'android' | 'unsupported';

function getHealthPlatform(): HealthPlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'unsupported';  // Web, etc.
}
```

### 3. Health Data Provider Interface

All health services implement this common interface:

```typescript
interface HealthDataProvider {
  /**
   * Check if health tracking is available on this device
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get current authorization status
   */
  getAuthorizationStatus(): Promise<AuthorizationStatus>;

  /**
   * Request authorization from user
   */
  requestAuthorization(): Promise<AuthorizationStatus>;

  /**
   * Get step data for a date range
   */
  getStepData(startDate: Date, endDate: Date): Promise<DailyStepData[]>;

  /**
   * Disconnect/revoke access (Google Fit only, no-op for HealthKit)
   */
  disconnect(): Promise<void>;
}

type AuthorizationStatus =
  | 'not_determined'  // Never asked
  | 'authorized'      // Permission granted
  | 'denied'          // Permission denied
  | 'not_available';  // Platform doesn't support

interface DailyStepData {
  date: string;           // YYYY-MM-DD
  stepCount: number;
  distanceMeters: number;
  source: 'healthkit' | 'googlefit';
}
```

### 4. Unified Service Interface

```typescript
interface UnifiedStepTrackingService {
  /**
   * Initialize the service - call on app startup
   */
  initialize(): Promise<void>;

  /**
   * Check if health tracking is available on this platform
   */
  isHealthTrackingAvailable(): Promise<boolean>;

  /**
   * Check if health tracking is currently enabled by user
   */
  isHealthTrackingEnabled(): Promise<boolean>;

  /**
   * Get current health authorization status
   */
  getHealthAuthorizationStatus(): Promise<AuthorizationStatus>;

  /**
   * Enable health tracking (requests permission if needed)
   */
  enableHealthTracking(): Promise<EnableResult>;

  /**
   * Disable health tracking (revokes access, deletes synced data)
   */
  disableHealthTracking(): Promise<void>;

  /**
   * Trigger an on-demand sync (manual refresh)
   */
  syncNow(): Promise<SyncResult>;

  /**
   * Get sync state information
   */
  getSyncState(): Promise<SyncState>;

  /**
   * Get the appropriate source string for current platform
   */
  getHealthSource(): 'healthkit' | 'googlefit' | null;
}

interface EnableResult {
  success: boolean;
  status: AuthorizationStatus;
  message?: string;
}

interface SyncResult {
  success: boolean;
  entriesSynced: number;
  errors?: string[];
}

interface SyncState {
  isEnabled: boolean;
  lastSyncTimestamp: string | null;
  lastSyncStatus: 'success' | 'failed' | 'never';
  platform: HealthPlatform;
}
```

### 5. Service Factory

```typescript
// Factory to get the appropriate health provider
function createHealthDataProvider(): HealthDataProvider | null {
  const platform = getHealthPlatform();

  switch (platform) {
    case 'ios':
      return new HealthKitService();
    case 'android':
      return new GoogleFitService();
    default:
      return null;  // No health provider available
  }
}
```

### 6. State Management Integration

The unified service updates the Zustand store after sync:

```typescript
// In stepsStore.ts - new actions
interface StepsState {
  // ... existing state ...

  // New sync-related state
  syncState: SyncState;
  isSyncing: boolean;
  syncError: string | null;

  // New actions
  setSyncState: (state: SyncState) => void;
  syncFromHealth: () => Promise<void>;
  refreshAfterSync: () => Promise<void>;
}
```

### 7. On-Demand Sync Flow

```
User triggers sync (pull-to-refresh, settings button, etc.)
    |
    v
unifiedService.syncNow()
    |
    v
Check if health tracking is enabled
    |
    +---> Not enabled: Return early (nothing to sync)
    |
    v
Get health data provider for platform
    |
    v
Calculate date range (last sync -> today, or 30 days for first sync)
    |
    v
Query health data provider
    |
    +---> Error: Return failure, log error
    |
    v
Transform to sync format
    |
    v
Call backend: PUT /api/v1/steps/sync
    |
    +---> Error: Return failure, keep retry state
    |
    v
Update last sync timestamp
    |
    v
Trigger store refresh (fetchTodaySteps, fetchStats)
    |
    v
Return success
```

### 8. Enable/Disable Health Tracking Flow

**Enable Flow**:
```
User enables health tracking
    |
    v
Check if platform supports health tracking
    |
    +---> Not available: Show message, return
    |
    v
Request authorization from health provider
    |
    +---> Denied: Show manual entry option, return
    |
    v
Save preference (enabled = true)
    |
    v
Trigger initial sync (last 30 days)
    |
    v
Register background sync task
    |
    v
Return success
```

**Disable Flow**:
```
User disables health tracking
    |
    v
Show confirmation: "This will remove your synced health data"
    |
    +---> User cancels: Return
    |
    v
Call backend: DELETE /api/v1/steps/source/{source}
    |
    v
Disconnect from health provider (Google Fit) or note revocation (HealthKit)
    |
    v
Save preference (enabled = false)
    |
    v
Unregister background sync task
    |
    v
Refresh store data
    |
    v
Show success message
```

### 9. Persistence

Store sync preferences and state:

```typescript
// Keys for AsyncStorage
const STORAGE_KEYS = {
  HEALTH_TRACKING_ENABLED: '@stepper/health_tracking_enabled',
  LAST_SYNC_TIMESTAMP: '@stepper/last_sync_timestamp',
  LAST_SYNC_STATUS: '@stepper/last_sync_status',
};
```

### 10. Settings Screen Integration

The Settings screen uses the unified service:

```typescript
// In Settings screen
const {
  isHealthTrackingAvailable,
  isHealthTrackingEnabled,
  enableHealthTracking,
  disableHealthTracking,
  getSyncState,
} = useStepTracking();  // Hook wrapping unified service
```

## Data Flow Diagram

```
+------------------+     +------------------+     +------------------+
|   Home Screen    |     | Steps History    |     |    Settings      |
+------------------+     +------------------+     +------------------+
         |                       |                       |
         v                       v                       v
+------------------------------------------------------------------+
|                    useStepTracking() Hook                         |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                 Unified Step Tracking Service                     |
|  - Platform detection                                             |
|  - Provider selection                                             |
|  - Sync orchestration                                             |
|  - State management                                               |
+------------------------------------------------------------------+
         |                       |                       |
         v                       v                       v
+------------------+     +------------------+     +------------------+
| HealthKitService |     | GoogleFitService |     |   stepsStore     |
|    (iOS)         |     |   (Android)      |     |   (Zustand)      |
+------------------+     +------------------+     +------------------+
         |                       |                       |
         v                       v                       v
+------------------------------------------------------------------+
|                         Steps API                                 |
|  - POST /api/v1/steps (manual entry)                             |
|  - PUT /api/v1/steps/sync (bulk sync)                            |
|  - DELETE /api/v1/steps/source/{source} (revoke cleanup)         |
+------------------------------------------------------------------+
```

## File Structure

```
Stepper.Mobile/src/
  services/
    health/
      types.ts                    # Shared interfaces (HealthDataProvider, etc.)
      healthKitService.ts         # iOS implementation
      googleFitService.ts         # Android implementation
      healthProviderFactory.ts    # Factory for creating providers
    stepTracking/
      unifiedStepTrackingService.ts  # Main unified service
      syncStateManager.ts            # Persistence for sync state
      index.ts                       # Public exports
  hooks/
    useStepTracking.ts            # React hook wrapping unified service
  store/
    stepsStore.ts                 # Updated with sync state
```

## Hook API

```typescript
// useStepTracking.ts
interface UseStepTrackingResult {
  // State
  isAvailable: boolean;
  isEnabled: boolean;
  isSyncing: boolean;
  syncState: SyncState;
  error: string | null;

  // Actions
  enable: () => Promise<EnableResult>;
  disable: () => Promise<void>;
  syncNow: () => Promise<SyncResult>;
  refresh: () => Promise<void>;
}

function useStepTracking(): UseStepTrackingResult {
  // Implementation wraps unified service
  // Manages loading states
  // Provides React-friendly interface
}
```

## Acceptance Criteria

- [ ] Service correctly detects platform (iOS/Android/unsupported)
- [ ] Service selects appropriate health provider for platform
- [ ] isHealthTrackingAvailable returns correct result per platform
- [ ] Enable flow requests authorization correctly
- [ ] Enable flow triggers initial 30-day sync
- [ ] Disable flow deletes synced data from backend
- [ ] Disable flow unregisters background sync
- [ ] On-demand sync fetches and uploads data correctly
- [ ] Sync state persists across app restarts
- [ ] Last sync timestamp updates after successful sync
- [ ] Zustand store updates after sync completes
- [ ] useStepTracking hook provides correct state
- [ ] Settings screen can enable/disable health tracking
- [ ] Pull-to-refresh triggers on-demand sync
- [ ] Error states are handled and surfaced to UI

## Testing Strategy

### Unit Tests
- Test platform detection logic
- Test provider factory returns correct service
- Test sync orchestration logic (mocked providers)
- Test enable/disable flows
- Test state persistence

### Integration Tests
- Test hook integration with service
- Test store updates after sync

### Manual Testing Checklist
- [ ] iOS: Enable health tracking flow
- [ ] iOS: Disable health tracking (verify data deleted)
- [ ] iOS: On-demand sync via pull-to-refresh
- [ ] Android: Enable fitness tracking flow
- [ ] Android: Disable fitness tracking (verify data deleted)
- [ ] Android: On-demand sync via pull-to-refresh
- [ ] Settings shows correct health tracking status
- [ ] Last sync timestamp displays correctly
- [ ] App startup initializes service correctly

## Dependencies

### On Other Plans
- **Plan 21 (HealthKit)**: Provides `HealthKitService` implementation
- **Plan 22 (Google Fit)**: Provides `GoogleFitService` implementation
- **Plan 23 (Background Sync)**: Uses unified service for sync logic
- **Plan 24 (Manual Entry)**: Uses `stepsStore` (updated by this service)

### Backend API Requirements

All required by other plans, summarized here:

1. **Existing**: `POST /api/v1/steps` - Record single entry
2. **New (Plan 21)**: `DELETE /api/v1/steps/source/{source}` - Delete by source
3. **New (Plan 23)**: `PUT /api/v1/steps/sync` - Bulk upsert

## Error Handling

| Scenario | Handling |
|----------|----------|
| Platform unsupported | `isAvailable` returns false, UI hides health options |
| Authorization denied | Return denied status, UI shows manual entry option |
| Sync network error | Return failure, show error message, allow retry |
| Sync API error | Return failure, preserve partial state |
| Provider initialization error | Log error, mark as unavailable |

## Risks and Open Questions

### Risks

1. **State Synchronization**: Multiple components may try to sync simultaneously
   - Mitigation: Use mutex/lock in sync function

2. **Stale State**: UI may show outdated sync state
   - Mitigation: Refresh state on app foreground

### Open Questions

None - all decisions made.

## Implementation Order

Recommended implementation sequence:

1. **Types and interfaces** (`types.ts`) - Define contracts first
2. **Sync state manager** (`syncStateManager.ts`) - Persistence layer
3. **Unified service** (`unifiedStepTrackingService.ts`) - Core logic
4. **React hook** (`useStepTracking.ts`) - React integration
5. **Store updates** (`stepsStore.ts`) - Add sync state
6. **Health providers** - Implement after unified service structure exists

This allows the unified service to be tested with mock providers before real implementations are ready.
