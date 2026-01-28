# Plan: Background Step Sync Service

## Overview

This plan covers the implementation of background synchronization for step data, allowing the app to sync steps from health APIs (HealthKit/Google Fit) even when the app is not actively open. This ensures users see up-to-date step counts when they open the app, even if they haven't used it for days.

**Important**: Background sync is an enhancement for users who have enabled health tracking. Users who use manual entry are not affected by this feature.

## Goals

1. Sync step data automatically on a scheduled basis (approximately every 2 hours)
2. Handle scenarios where the app hasn't been opened for multiple days
3. Efficiently backfill missing data without duplicates
4. Minimize battery and data usage
5. Work within platform-specific background execution constraints
6. Gracefully handle sync failures and retry appropriately

## Non-Goals

- Real-time step updates (too battery-intensive)
- Push notifications for step milestones (separate feature)
- Syncing while device is in low-power mode
- Background sync for manual entry users (not applicable)

## Technical Approach

### 1. Platform Constraints Overview

Background execution on mobile platforms is heavily restricted. Understanding these constraints is critical:

| Platform | Constraint | Implication |
|----------|------------|-------------|
| iOS | Background App Refresh limited to ~15 min intervals minimum | Cannot guarantee exact 2-hour sync |
| iOS | HealthKit Background Delivery | Can wake app when new data available |
| Android | Doze mode restricts background work | Use WorkManager for reliable scheduling |
| Android | Battery optimization can kill background tasks | Need to handle gracefully |
| Both | Network may be unavailable | Queue syncs for when network returns |

### 2. Package Selection

**Recommended Package**: `expo-background-fetch` + `expo-task-manager`

Rationale:
- Official Expo packages with good maintenance
- Works with Expo managed workflow
- Abstracts platform differences
- Integrates with iOS Background App Refresh and Android WorkManager

### 3. iOS Background Strategy

**Primary Mechanism**: Background App Refresh + HealthKit Background Delivery

```
HealthKit generates new step data
    |
    v
HealthKit Background Delivery (if enabled)
    |
    +---> Wakes app in background
    |
    v
App queries HealthKit for new data
    |
    v
Syncs to backend API
    |
    v
App suspended again
```

**Fallback**: Background App Refresh
- System schedules refresh based on user's app usage patterns
- Cannot control exact timing, but typically runs every few hours
- More reliable than HealthKit delivery alone

**Configuration**:
- Enable "Background Fetch" capability
- Enable "HealthKit Background Delivery" entitlement
- Register background tasks in app initialization

### 4. Android Background Strategy

**Primary Mechanism**: WorkManager with Periodic Work

```
WorkManager schedules periodic task
    |
    v
Task runs (approximately every 2 hours, system decides exact time)
    |
    v
Check battery level - skip if low
    |
    v
App queries Google Fit for new data
    |
    v
Syncs to backend API
    |
    v
Task completes, reschedules
```

**Constraints Handling**:
- Use `NetworkType.CONNECTED` constraint - only run when network available
- Use `BatteryNotLow` constraint - skip sync when battery is low
- Respect Doze mode - system will batch background work

**Configuration**:
- Register WorkManager task on app startup
- Configure with flexible interval (120 minutes target)
- Set retry policy for failed syncs

### 5. Background Task Implementation

```typescript
// Conceptual task structure
async function backgroundSyncTask(): Promise<void> {
  // 1. Check if health tracking is enabled
  const isEnabled = await healthTrackingStore.isEnabled();
  if (!isEnabled) {
    return; // Nothing to sync
  }

  // 2. Get last sync timestamp
  const lastSync = await getLastSyncTimestamp();

  // 3. Calculate date range to sync
  const startDate = lastSync ? new Date(lastSync) : getDateDaysAgo(30);
  const endDate = new Date();

  // 4. Query health data
  const healthService = getHealthDataProvider(); // Platform-specific
  const stepData = await healthService.getStepData(startDate, endDate);

  // 5. Sync to backend
  await syncStepsToBackend(stepData);

  // 6. Update last sync timestamp
  await setLastSyncTimestamp(endDate.toISOString());
}
```

### 6. Handling App Not Opened for Days

When the app hasn't been opened for an extended period:

1. **On First Background Wake**:
   - Detect large gap since last sync
   - Query health data for entire gap (up to 30 days max)
   - Sync all data in single batch

2. **On App Foreground**:
   - Check last sync timestamp
   - If > 24 hours ago, trigger immediate sync
   - Show loading indicator while syncing

3. **Data Freshness Indicator**:
   - Store and display "Last synced: X hours ago"
   - If very stale (> 48 hours), show subtle warning

### 7. Conflict Resolution

When syncing data that may overlap with existing entries:

**Strategy**: Upsert by date + source

```
For each day of health data:
    |
    v
Check if entry exists for (user_id, date, source)
    |
    +---> Exists: Update step count and distance
    |
    +---> Not exists: Insert new entry
```

**Backend Support Required**:
- New endpoint or modification to existing endpoint
- Support upsert semantics: `PUT /api/v1/steps/sync`

### 8. Sync State Management

Track sync state in local storage:

```typescript
interface SyncState {
  lastSyncTimestamp: string | null;  // ISO date string
  lastSyncStatus: 'success' | 'failed' | 'pending';
  failedAttempts: number;
  pendingDays: string[];  // Days that failed to sync
}
```

## Data Flow

```
Background Task Triggered
    |
    v
Check Health Tracking Enabled
    |
    +---> No: Exit task
    |
    v
Get Last Sync Timestamp
    |
    v
Query Health API (HealthKit/Google Fit)
    |
    v
Transform to App Format
    |
    v
Call Backend Sync API
    |
    +---> Success: Update last sync timestamp
    |
    +---> Failure: Increment retry counter, queue for next attempt
```

## Error Handling

### Network Errors

| Scenario | Handling |
|----------|----------|
| No network | Skip sync, will retry on next scheduled run |
| Timeout | Retry once with shorter timeout, then skip |
| Server error (5xx) | Queue for retry with exponential backoff |
| Auth error (401) | Cannot refresh in background, wait for foreground |

### Health API Errors

| Scenario | Handling |
|----------|----------|
| Authorization revoked | Mark sync as disabled, handle on foreground |
| Data not available | Skip, not an error |
| API rate limited | Back off, retry later |

### Retry Strategy

Since background sync runs every ~2 hours, retry intervals should be short to maximize chances of success before the next scheduled sync:

```
Attempt 1: Immediate
Attempt 2: +5 minutes
Attempt 3: +10 minutes
Attempt 4: +15 minutes
After 4 failures: Wait for next scheduled sync (2 hours) or foreground
```

This approach ensures we make multiple quick retry attempts within a reasonable window, while not being overly aggressive on battery usage.

## Dependencies

### New Packages Required

| Package | Version | Justification |
|---------|---------|---------------|
| `expo-background-fetch` | ~13.x | Background task scheduling |
| `expo-task-manager` | ~13.x | Task registration and management |

### Expo Configuration Changes

- Enable background fetch in `app.json`
- Configure background modes for iOS
- Register background task identifiers

## Backend API Changes Required

### New Endpoint: Bulk Sync Steps

**Endpoint**: `PUT /api/v1/steps/sync`

**Purpose**: Sync multiple days of step data with upsert semantics.

**Request Body**:
```json
{
  "entries": [
    {
      "date": "2024-01-15",
      "stepCount": 8500,
      "distanceMeters": 6200.5,
      "source": "healthkit"
    },
    {
      "date": "2024-01-16",
      "stepCount": 10200,
      "distanceMeters": 7500.0,
      "source": "healthkit"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "created": 1,
    "updated": 1,
    "total": 2
  }
}
```

**Behavior**:
- For each entry, upsert based on (user_id, date, source)
- If entry exists with same date and source, update values
- If entry doesn't exist, create new
- Returns count of created vs updated entries

**Implementation Notes**:
- Add `SyncStepsAsync(Guid userId, List<SyncStepEntry> entries)` to `IStepService`
- Add `UpsertByDateAndSourceAsync(StepEntry entry)` to `IStepRepository`
- Use PostgreSQL `ON CONFLICT` for efficient upserts

## File Structure

```
WalkingApp.Mobile/src/
  services/
    sync/
      backgroundSyncService.ts    # Background task registration
      syncOrchestrator.ts         # Sync logic coordination
      syncStateStore.ts           # Sync state persistence
  tasks/
    stepSyncTask.ts               # Background task implementation
```

## Acceptance Criteria

- [ ] Background task is registered on app startup
- [ ] Background sync runs approximately every 2 hours when conditions are met
- [ ] Background sync skips when battery is low
- [ ] Sync works correctly after app not opened for multiple days
- [ ] Network unavailability is handled gracefully
- [ ] Battery usage is minimal (no noticeable impact)
- [ ] Sync state is persisted and survives app restarts
- [ ] Failed syncs are retried with appropriate backoff
- [ ] Duplicate data is prevented through upsert logic
- [ ] Last sync timestamp is displayed in UI
- [ ] Background sync respects user's health tracking preference
- [ ] iOS Background App Refresh works correctly
- [ ] Android WorkManager scheduling works correctly
- [ ] User receives notification if sync hasn't run for 24+ hours
- [ ] Stale sync notification appears in home screen notifications (if feature exists)

## Testing Strategy

### Unit Tests
- Test sync orchestrator logic with mocked health service
- Test retry logic and backoff calculations
- Test date range calculations for backfill scenarios
- Test conflict resolution logic

### Integration Tests
- Test background task registration
- Test sync state persistence
- Test API sync endpoint

### Manual Testing Checklist
- [ ] Background sync runs while app is backgrounded
- [ ] Sync works after force-closing and reopening app
- [ ] Sync works after not opening app for 3+ days
- [ ] Sync handles network loss gracefully
- [ ] Battery usage is acceptable (monitor over 24h period)
- [ ] iOS: Background App Refresh triggers sync
- [ ] Android: WorkManager triggers sync
- [ ] Disabling health tracking stops background sync

## Risks and Open Questions

### Risks

1. **iOS Background Execution Limits**: iOS heavily throttles background execution; may not achieve exact 2-hour sync
2. **Battery Optimization on Android**: Aggressive battery savers may prevent background work
3. **User Perception**: Users may disable background app refresh globally, breaking sync
4. **Stale Data Window**: Between syncs, displayed data may be outdated

### Decisions

1. **Sync Indicator in UI**: Update data silently, show "Last synced" timestamp in settings.

2. **Notification on Long Gap**: Yes, notify users if sync hasn't run for 24+ hours. This should:
   - Send a push notification to the user
   - Add an entry to the home screen notifications feed
   - Note: Home screen notification integration may require a separate feature if not yet implemented

## Platform-Specific Notes

### iOS Considerations

- Background App Refresh must be enabled in device settings
- HealthKit Background Delivery has its own limits (max 4 per hour)
- App may be killed by system; must handle cold start in background
- Background task has ~30 seconds to complete

### Android Considerations

- WorkManager is the only reliable way to schedule background work
- Doze mode will batch background work; may not run exactly every 2 hours
- Some manufacturers have aggressive battery optimization
- Background task should complete quickly to avoid ANR

### Battery Optimization Strategy

The app prioritizes being non-intrusive to avoid losing users:

1. **2-hour sync interval** - Balances data freshness with battery conservation
2. **Skip on low battery** - Always skip sync when battery is low (mandatory)
3. **Network-only sync** - Only sync when network is available
4. **Batch data** - Sync date ranges, not individual entries
5. **Efficient queries** - Aggregate data on health API side
6. **Track last sync** - Don't sync more than necessary

**Philosophy**: A fitness app should help users, not annoy them. Battery drain is a top reason users uninstall apps.
