# Plan: iOS HealthKit Integration

## Overview

This plan covers the integration of Apple HealthKit to read step count and distance data from iOS devices. HealthKit provides access to health data stored in the iOS Health app, allowing the Walking App to automatically sync steps tracked by the iPhone, Apple Watch, or other connected devices.

**Important**: HealthKit integration is optional. Users who decline health permissions can still use the app by manually entering their steps.

## Goals

1. Request and manage HealthKit authorization on iOS devices
2. Read step count data from HealthKit for specified date ranges
3. Read walking/running distance data from HealthKit
4. Transform HealthKit data into the app's internal format
5. Handle authorization state changes gracefully
6. Provide clear user feedback for permission states
7. Support graceful fallback to manual entry when permissions are denied

## Non-Goals

- Writing data back to HealthKit (read-only integration)
- Reading other health metrics (heart rate, calories, etc.)
- Background data delivery via HealthKit observers (covered in background sync plan)
- Android implementation (covered in separate plan)

## Technical Approach

### 1. Package Selection

**Recommended Package**: `react-native-health`

Rationale:
- Well-maintained with active community
- Supports Expo via config plugins
- Provides TypeScript definitions
- Comprehensive HealthKit coverage
- Supports both reading and observing data

Alternative considered: `expo-health` - Not yet available as a stable package.

### 2. Expo Configuration

HealthKit requires native configuration that must be added to the Expo app config:

**Required Permissions**:
- `NSHealthShareUsageDescription` - Explain why the app reads health data
- `NSHealthUpdateUsageDescription` - Required even for read-only (Apple requirement)

**Entitlements**:
- `com.apple.developer.healthkit` - Enable HealthKit capability
- `com.apple.developer.healthkit.background-delivery` - For background updates

### 3. Authorization Flow

```
User opens app for first time
    |
    v
Check HealthKit availability (iOS only)
    |
    +---> Not available: Skip health setup, use manual entry
    |
    v
Show onboarding explanation screen
    |
    "Walking App can automatically track your steps from your iPhone or Apple Watch.
     You can also enter steps manually if you prefer."
    |
    +---> User chooses "Enable Health Tracking"
    |           |
    |           v
    |     Request authorization
    |           |
    |           +---> Denied: Show info about manual entry
    |           |     "No problem! You can enter steps manually.
    |           |      You can enable Health access later in Settings."
    |           |
    |           v
    |     Authorization granted -> Enable automatic sync
    |
    +---> User chooses "Skip / Enter Manually"
          |
          v
    Continue with manual entry mode
```

### 4. Settings Integration

Users should be able to change their health tracking preference at any time:

```
Settings Screen
    |
    +---> "Health Data"
          |
          +---> Current status: "Connected" / "Not Connected"
          |
          +---> Toggle/Button to enable or disable
          |
          +---> If denied: "Open Settings" link to iOS Settings
```

### 5. Data Types to Read

| HealthKit Type | App Field | Notes |
|----------------|-----------|-------|
| `HKQuantityTypeIdentifierStepCount` | `stepCount` | Cumulative daily steps |
| `HKQuantityTypeIdentifierDistanceWalkingRunning` | `distanceMeters` | Walking/running distance |

### 6. Query Strategy

**Aggregated Daily Queries**:
- Query step count summed by day for date ranges
- Use `HKStatisticsCollectionQuery` for efficient aggregation
- Anchor queries to midnight local time

**Date Range Handling**:
- First sync: Query last 30 days for historical backfill
- Subsequent syncs: Query from last sync date to today
- Support querying single day (today) for real-time updates
- Handle timezone transitions gracefully

**Sync Triggers**:
- On app open (foreground)
- On pull-to-refresh
- On manual "Sync Now" action in settings

### 7. Service Interface

The HealthKit service will implement a common interface shared with Google Fit:

```typescript
// Conceptual interface - implementation details in unified service plan
interface HealthDataProvider {
  isAvailable(): Promise<boolean>;
  getAuthorizationStatus(): Promise<AuthStatus>;
  requestAuthorization(): Promise<AuthStatus>;
  getStepData(startDate: Date, endDate: Date): Promise<DailyStepData[]>;
}

interface DailyStepData {
  date: string;           // YYYY-MM-DD format
  stepCount: number;      // Total steps for the day
  distanceMeters: number; // Total distance in meters
  source: string;         // 'healthkit'
}

type AuthStatus = 'not_determined' | 'authorized' | 'denied' | 'not_available';
```

## Data Flow

```
HealthKit Database
    |
    | (HKStatisticsCollectionQuery)
    v
react-native-health library
    |
    | (Promise-based API)
    v
HealthKitService (src/services/health/healthKitService.ts)
    |
    | (DailyStepData[])
    v
Unified Step Tracking Service
    |
    | (transformed to RecordStepsRequest)
    v
Steps API / Backend
```

## Error Handling

### Authorization Errors

| Error State | User Message | Action |
|-------------|--------------|--------|
| HealthKit not available | "Automatic step tracking is not available on this device. You can enter steps manually." | Show manual entry option |
| Authorization denied | "Health access is disabled. You can enter steps manually or enable Health access in Settings." | Show manual entry + Settings link |
| Authorization revoked | "Health access was disabled. Your synced health data will be removed. You can continue with manual entry." | Delete synced data, switch to manual mode |

### Query Errors

| Error Type | Handling |
|------------|----------|
| Network timeout | Retry with exponential backoff (max 3 attempts) |
| Invalid date range | Log error, return empty array |
| HealthKit database locked | Queue for retry, notify user if persistent |
| Data not available | Return zeros for that date |

### Edge Cases

1. **User has no health data**: Return empty results, do not treat as error
2. **Data from multiple sources**: HealthKit automatically deduplicates; trust the aggregated value
3. **Partial day data**: Accept whatever is available, will update on next sync
4. **Device time changed**: Use HealthKit's stored timestamps, not device clock
5. **User revokes access**: Delete all previously synced health data, switch to manual entry mode

## Access Revocation Behavior

When a user revokes HealthKit access (either via iOS Settings or in-app toggle):

1. **Detect revocation**: Check authorization status on app foreground
2. **Notify user**: "Health access has been disabled. Your synced health data will be removed."
3. **Delete synced data**: Remove all step entries where `source = 'healthkit'` for this user
4. **Update UI**: Switch to manual entry mode
5. **Allow re-enabling**: User can grant access again at any time

This ensures user control over their health data and respects their privacy choices.

## Dependencies

### New Packages Required

| Package | Version | Justification |
|---------|---------|---------------|
| `react-native-health` | ^2.x | HealthKit integration for React Native |

### Expo Configuration Changes

- Add HealthKit entitlement to `app.json`
- Add privacy description strings
- Configure config plugin for native module linking

## File Structure

```
WalkingApp.Mobile/src/
  services/
    health/
      healthKitService.ts       # HealthKit-specific implementation
      healthKitService.test.ts  # Unit tests with mocked native module
      types.ts                  # Shared types (also used by Google Fit)
```

## Acceptance Criteria

- [ ] HealthKit availability can be detected on iOS devices
- [ ] Authorization request shows proper iOS permission dialog
- [ ] Authorization status persists across app restarts
- [ ] Step count data can be queried for a single day
- [ ] Step count data can be queried for a date range (up to 30 days)
- [ ] Distance data is retrieved alongside step counts
- [ ] Data is correctly aggregated by day (midnight to midnight)
- [ ] Denied authorization shows manual entry option + Settings link
- [ ] Non-iOS devices gracefully report "not available"
- [ ] Service returns data in standardized format (DailyStepData)
- [ ] Error states are handled without app crashes
- [ ] User can enable/disable health tracking in Settings
- [ ] Revoking access deletes previously synced health data
- [ ] Manual entry remains available regardless of health permissions

## Testing Strategy

### Unit Tests
- Mock `react-native-health` native module
- Test authorization state machine transitions
- Test data transformation logic
- Test error handling paths
- Test data deletion on access revocation

### Manual Testing Checklist
- [ ] Fresh install authorization flow
- [ ] User declines permission - verify manual entry works
- [ ] Denied then granted via Settings
- [ ] Granted then revoked - verify data deletion
- [ ] Query with no health data
- [ ] Query with Apple Watch data
- [ ] Query with third-party app data
- [ ] Device with HealthKit disabled
- [ ] Toggle health tracking on/off in Settings

## Risks and Open Questions

### Risks

1. **Apple Review Requirements**: HealthKit apps require specific privacy policy language and may face additional App Store scrutiny
2. **Background Delivery Complexity**: HealthKit background delivery has strict limitations (covered in background sync plan)
3. **Data Accuracy**: Users may have multiple step sources (phone + watch) - need to verify HealthKit deduplication works correctly

### Open Questions

1. **Privacy Policy**: A privacy policy covering health data collection needs to be created before App Store submission (future task)

## Backend API Changes Required

This plan requires a new backend endpoint to support data deletion when users revoke health access:

### New Endpoint: Delete Steps by Source

**Endpoint**: `DELETE /api/v1/steps/source/{source}`

**Purpose**: Delete all step entries for the authenticated user with a specific source value.

**Parameters**:
- `source` (path parameter): The source identifier (e.g., "healthkit", "googlefit", "manual")

**Response**:
- `200 OK`: Returns count of deleted entries
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: No entries found with that source (optional - could also return 200 with count: 0)

**Example**:
```
DELETE /api/v1/steps/source/healthkit
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "deletedCount": 45
  }
}
```

**Implementation Notes**:
- Add `DeleteBySourceAsync(Guid userId, string source)` to `IStepRepository`
- Add `DeleteBySourceAsync(Guid userId, string source)` to `IStepService`
- Add endpoint to `StepsController`
- RLS policies will ensure users can only delete their own data

## Implementation Notes

### iOS Version Requirements
- Minimum iOS version: 13.0 (for modern HealthKit APIs)
- HealthKit availability: iPhone 4s and later

### Simulator Limitations
- HealthKit works in iOS Simulator but has no real data
- Testing requires adding sample data manually in Health app
- Full testing requires physical device

### Privacy Considerations
- Health data is sensitive - never log raw values
- Do not store HealthKit data locally beyond sync cache
- Sync to backend immediately, rely on backend for persistence
- Delete all synced data when user revokes access
