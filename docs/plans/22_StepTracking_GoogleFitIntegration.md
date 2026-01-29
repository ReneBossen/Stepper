# Plan: Android Google Fit Integration

## Overview

This plan covers the integration of Google Fit to read step count and distance data from Android devices. Google Fit provides access to fitness data collected by Android devices, Wear OS watches, and other connected fitness apps, allowing the Walking App to automatically sync steps.

**Important**: Google Fit integration is optional. Users who decline permissions can still use the app by manually entering their steps.

## Goals

1. Set up Google Fit API access and OAuth configuration
2. Request and manage Google Fit authorization on Android devices
3. Read step count data from Google Fit for specified date ranges
4. Read walking distance data from Google Fit
5. Transform Google Fit data into the app's internal format
6. Handle authorization state changes gracefully
7. Support graceful fallback to manual entry when permissions are denied

## Non-Goals

- Writing data back to Google Fit (read-only integration)
- Reading other fitness metrics (heart rate, calories, sleep, etc.)
- Background sync via Google Fit subscriptions (covered in background sync plan)
- iOS implementation (covered in HealthKit plan)

## Technical Approach

### 1. Package Selection

**Recommended Package**: `react-native-google-fit`

Rationale:
- Most popular Google Fit library for React Native
- Active maintenance and community support
- Supports Expo via config plugins
- Provides TypeScript definitions
- Covers step count and distance data types

Alternative considered: Direct REST API calls - More complex, requires managing OAuth tokens manually.

### 2. Google Cloud Console Setup

Before implementing, the following must be configured in Google Cloud Console:

1. **Create/Select Project**: Use existing project or create new one
2. **Enable Fitness API**: Enable "Fitness API" in APIs & Services
3. **OAuth Consent Screen**: Configure with app name, support email, privacy policy URL
4. **OAuth Credentials**: Create OAuth 2.0 Client ID for Android
   - Package name must match app's `applicationId`
   - SHA-1 fingerprint required (debug and release)
5. **Scopes Required**:
   - `https://www.googleapis.com/auth/fitness.activity.read` (steps)
   - `https://www.googleapis.com/auth/fitness.location.read` (distance)

### 3. Expo Configuration

Google Fit requires native configuration in the Expo app config:

**Android Permissions** (AndroidManifest.xml via config plugin):
- `android.permission.ACTIVITY_RECOGNITION` - For step counting (Android 10+)
- `com.google.android.gms.permission.ACTIVITY_RECOGNITION` - Legacy support

**OAuth Configuration**:
- Client ID must be configured in the app
- Package name and SHA-1 must match Google Cloud Console

### 4. Authorization Flow

```
User opens app for first time
    |
    v
Check Google Fit availability (Android only)
    |
    +---> Not available (no Google Play Services): Skip, use manual entry
    |
    v
Show onboarding explanation screen
    |
    "Walking App can automatically track your steps from your Android device or Wear OS watch.
     You can also enter steps manually if you prefer."
    |
    +---> User chooses "Enable Fitness Tracking"
    |           |
    |           v
    |     Request authorization (opens Google sign-in)
    |           |
    |           +---> User cancels/denies: Show info about manual entry
    |           |     "No problem! You can enter steps manually.
    |           |      You can enable Fitness access later in Settings."
    |           |
    |           v
    |     Authorization granted -> Enable automatic sync
    |
    +---> User chooses "Skip / Enter Manually"
          |
          v
    Continue with manual entry mode
```

### 5. Settings Integration

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
          +---> If denied: "Open Settings" link to device Settings
```

Note: This is the same Settings UI as defined in the HealthKit plan. The implementation will detect the platform and use the appropriate service (HealthKit on iOS, Google Fit on Android).

### 6. Data Types to Read

| Google Fit Data Type | App Field | Notes |
|---------------------|-----------|-------|
| `com.google.step_count.delta` | `stepCount` | Daily step count |
| `com.google.distance.delta` | `distanceMeters` | Walking/running distance |

### 7. Query Strategy

**Aggregated Daily Queries**:
- Use Aggregate API for efficient daily summaries
- Query by bucket (daily buckets)
- Time range: midnight to midnight local time

**Date Range Handling**:
- First sync: Query last 30 days for historical backfill
- Subsequent syncs: Query from last sync date to today
- Support querying single day (today) for real-time updates

**Sync Triggers**:
- On app open (foreground)
- On pull-to-refresh
- On manual "Sync Now" action in settings

### 8. Service Interface

The Google Fit service will implement the same interface as HealthKit:

```typescript
// Shared interface with HealthKit - defined in types.ts
interface HealthDataProvider {
  isAvailable(): Promise<boolean>;
  getAuthorizationStatus(): Promise<AuthStatus>;
  requestAuthorization(): Promise<AuthStatus>;
  getStepData(startDate: Date, endDate: Date): Promise<DailyStepData[]>;
  disconnect(): Promise<void>;  // Google Fit specific - revokes access
}

interface DailyStepData {
  date: string;           // YYYY-MM-DD format
  stepCount: number;      // Total steps for the day
  distanceMeters: number; // Total distance in meters
  source: string;         // 'googlefit'
}

type AuthStatus = 'not_determined' | 'authorized' | 'denied' | 'not_available';
```

## Data Flow

```
Google Fit API
    |
    | (Fitness REST API / SDK)
    v
react-native-google-fit library
    |
    | (Promise-based API)
    v
GoogleFitService (src/services/health/googleFitService.ts)
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
| Google Play Services not available | "Automatic step tracking requires Google Play Services. You can enter steps manually." | Show manual entry option |
| User cancels sign-in | "No problem! You can enter steps manually or connect later in Settings." | Show manual entry option |
| OAuth error | "Unable to connect to Google Fit. Please try again." | Show retry option |
| Access revoked | "Google Fit access was disconnected. Your synced fitness data will be removed." | Delete synced data, switch to manual mode |

### Query Errors

| Error Type | Handling |
|------------|----------|
| Network error | Retry with exponential backoff (max 3 attempts) |
| Token expired | Attempt silent refresh, if fails prompt re-auth |
| API quota exceeded | Queue for retry, use cached data |
| Invalid date range | Log error, return empty array |
| Data not available | Return zeros for that date |

### Edge Cases

1. **User has no fitness data**: Return empty results, do not treat as error
2. **Data from multiple sources**: Google Fit aggregates from all sources; trust the aggregated value
3. **Partial day data**: Accept whatever is available, will update on next sync
4. **Device time changed**: Use Google Fit's stored timestamps, not device clock
5. **User revokes access**: Delete all previously synced fitness data, switch to manual entry mode
6. **Multiple Google accounts**: Use the account selected during authorization

## Access Revocation Behavior

When a user disconnects Google Fit (either via app settings or Google account settings):

1. **Detect disconnection**: Check authorization status on app foreground
2. **Notify user**: "Google Fit has been disconnected. Your synced fitness data will be removed."
3. **Delete synced data**: Call `DELETE /api/v1/steps/source/googlefit` to remove synced entries
4. **Update UI**: Switch to manual entry mode
5. **Allow re-connecting**: User can reconnect at any time

This ensures user control over their fitness data and respects their privacy choices.

## Dependencies

### New Packages Required

| Package | Version | Justification |
|---------|---------|---------------|
| `react-native-google-fit` | ^0.20.x | Google Fit integration for React Native |

### Google Cloud Console Setup Required

- Google Cloud Project with Fitness API enabled
- OAuth 2.0 Client ID for Android
- OAuth consent screen configured

### Expo Configuration Changes

- Add Google Fit permissions to `app.json`
- Configure OAuth client ID
- Add config plugin for native module linking

## File Structure

```
Stepper.Mobile/src/
  services/
    health/
      googleFitService.ts       # Google Fit-specific implementation
      googleFitService.test.ts  # Unit tests with mocked native module
      types.ts                  # Shared types (also used by HealthKit)
```

## Acceptance Criteria

- [ ] Google Fit availability can be detected on Android devices
- [ ] Authorization request opens Google sign-in flow
- [ ] Authorization status persists across app restarts
- [ ] Step count data can be queried for a single day
- [ ] Step count data can be queried for a date range (up to 30 days)
- [ ] Distance data is retrieved alongside step counts
- [ ] Data is correctly aggregated by day (midnight to midnight)
- [ ] Denied authorization shows manual entry option
- [ ] Non-Android devices gracefully report "not available"
- [ ] Service returns data in standardized format (DailyStepData)
- [ ] Error states are handled without app crashes
- [ ] User can connect/disconnect fitness tracking in Settings
- [ ] Disconnecting deletes previously synced fitness data
- [ ] Manual entry remains available regardless of fitness permissions

## Testing Strategy

### Unit Tests
- Mock `react-native-google-fit` native module
- Test authorization state machine transitions
- Test data transformation logic
- Test error handling paths
- Test data deletion on disconnection

### Manual Testing Checklist
- [ ] Fresh install authorization flow
- [ ] User cancels Google sign-in - verify manual entry works
- [ ] Successful connection flow
- [ ] Disconnect and reconnect
- [ ] Query with no fitness data
- [ ] Query with Wear OS data
- [ ] Query with third-party fitness app data
- [ ] Device without Google Play Services
- [ ] Toggle fitness tracking on/off in Settings
- [ ] Token refresh after expiration

## Risks and Open Questions

### Risks

1. **Google Play Console Requirements**: Apps using Fitness API may need to declare sensitive permissions in Play Console
2. **OAuth Consent Screen Verification**: If app has many users, Google may require OAuth consent screen verification
3. **API Deprecation**: Google occasionally deprecates fitness APIs; monitor for changes
4. **SHA-1 Fingerprint Management**: Different fingerprints for debug/release/different keystores

### Open Questions

1. **Privacy Policy**: A privacy policy covering fitness data collection needs to be created before Play Store submission (future task - same as HealthKit)
2. **Google Cloud Billing**: Fitness API has quotas; verify free tier is sufficient for expected usage

## Backend API Dependency

This plan uses the same backend endpoint defined in the HealthKit plan:

**Endpoint**: `DELETE /api/v1/steps/source/{source}`

For Google Fit, the source value will be `"googlefit"`.

## Implementation Notes

### Android Version Requirements
- Minimum Android version: API 21 (Android 5.0) for Google Fit
- Activity Recognition permission: Required on Android 10+ (API 29)
- Google Play Services: Required for Google Fit

### Emulator Limitations
- Google Fit works in Android Emulator with Google Play Services
- No real step data available in emulator
- Testing requires physical device or manual data injection
- Sign-in requires a real Google account

### Privacy Considerations
- Fitness data is sensitive - never log raw values
- Do not store Google Fit data locally beyond sync cache
- Sync to backend immediately, rely on backend for persistence
- Delete all synced data when user disconnects
- Use minimum required OAuth scopes

### Differences from HealthKit

| Aspect | HealthKit (iOS) | Google Fit (Android) |
|--------|-----------------|----------------------|
| Auth mechanism | System permission dialog | OAuth + Google sign-in |
| Data source | Local Health database | Cloud-synced fitness data |
| Disconnect | Revoke in iOS Settings | In-app disconnect or Google account |
| Background delivery | Push-based observers | Polling or Fit subscriptions |
| Token management | None (system handles) | OAuth refresh tokens |
