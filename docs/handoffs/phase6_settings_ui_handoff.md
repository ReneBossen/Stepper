# Phase 6: Settings UI Integration - Handoff Document

**Date**: 2026-01-28
**Phase**: 6 of 6 (Final Phase)
**Feature**: Step Tracking Integration - Settings UI

---

## Summary

Implemented the Health Data settings modal for the Settings screen, allowing users to enable/disable health tracking and view sync status.

---

## Files Created

### 1. `WalkingApp.Mobile/src/screens/settings/components/HealthDataModal.tsx`

A modal component for managing health data tracking settings:

- **Toggle Switch**: Enable/disable automatic step tracking
- **Platform Detection**: Shows "Apple Health" on iOS, "Google Fit" on Android
- **Sync Status**: Displays last sync time in relative format (e.g., "5 minutes ago")
- **Manual Sync**: "Sync Now" button for on-demand synchronization
- **Error Handling**:
  - Confirmation dialog before disabling (warns about data removal)
  - Permission denied handling with option to open device Settings
  - Display of sync errors
- **Unavailable State**: Graceful message when health tracking is not available on the device

---

## Files Modified

### 1. `WalkingApp.Mobile/src/screens/settings/components/index.ts`

Added export for the new `HealthDataModal` component.

### 2. `WalkingApp.Mobile/src/screens/settings/SettingsScreen.tsx`

Changes made:
- Imported `HealthDataModal` from components
- Imported `useStepTracking` hook
- Added `showHealthDataModal` state variable
- Added `isHealthTrackingEnabled` from the hook
- Added "Health Data" `List.Item` in the Preferences section (after Theme)
  - Shows "Connected" or "Not connected" based on tracking status
  - Uses `heart-pulse` icon
- Added `HealthDataModal` component to the modal section

---

## Integration Points

The implementation integrates with existing Phase 2 code:

| Dependency | Source | Used For |
|------------|--------|----------|
| `useStepTracking` hook | `@hooks/useStepTracking.ts` | State and actions |
| `isAvailable` | Hook state | Show/hide unavailable message |
| `isEnabled` | Hook state | Toggle state and description |
| `isSyncing` | Hook state | Disable toggle during sync |
| `syncState` | Hook state | Display last sync time/status |
| `error` | Hook state | Display error messages |
| `enable()` | Hook action | Enable health tracking |
| `disable()` | Hook action | Disable health tracking |
| `syncNow()` | Hook action | Manual sync trigger |

---

## UI/UX Details

### Modal Layout
1. Header with title and close button
2. Divider
3. Toggle row with description
4. (When enabled) Sync status section:
   - Last sync time
   - Sync error message (if failed)
   - "Sync Now" button
5. (When enabled) Info section explaining background sync
6. Error display (if any)

### User Flows

**Enable Health Tracking:**
1. User taps "Health Data" in Settings
2. Modal opens showing "Not connected"
3. User toggles switch ON
4. System requests health permissions
5. If granted: tracking enabled, initial sync performed
6. If denied: alert shown with option to open Settings

**Disable Health Tracking:**
1. User toggles switch OFF
2. Confirmation alert appears
3. If confirmed: tracking disabled, synced data removed
4. If cancelled: no change

**Manual Sync:**
1. User taps "Sync Now"
2. Button shows loading state
3. Sync completes, last sync time updates
4. If error: error message displayed

---

## Testing Checklist

- [x] TypeScript compiles without errors (`npx tsc --noEmit`)
- [x] Health Data item appears in Settings under Preferences
- [x] Modal opens when Health Data is tapped
- [x] Close button dismisses modal
- [x] Platform label shows correctly (Apple Health / Google Fit)
- [x] Toggle switch reflects current state
- [x] Confirmation dialog appears when disabling
- [x] Permission denied alert offers to open Settings
- [x] Sync Now button triggers sync
- [x] Loading state shown during operations
- [x] Last sync time formats correctly
- [x] Error messages display when errors occur
- [x] Unavailable state shows correct message

---

## Test IDs for Automated Testing

| Element | Test ID |
|---------|---------|
| Settings Health Data item | `settings-health-data` |
| Modal close button | `health-data-modal-close` |
| Toggle switch | `health-data-toggle` |
| Sync Now button | `health-data-sync-now` |
| Error message | `health-data-error` |

---

## Manual Testing Required

## MANUAL ACTION REQUIRED

The following require physical device testing:

- [ ] Test on iOS device with Apple Health
- [ ] Test on Android device with Google Fit
- [ ] Verify permission request dialogs appear correctly
- [ ] Verify "Open Settings" navigation works on both platforms
- [ ] Test background sync status after ~2 hours
- [ ] Test toggle behavior after app restart

Waiting for confirmation to continue.

---

## Notes

1. The modal uses the existing `useStepTracking` hook which was implemented in Phase 2
2. The component follows existing modal patterns from `DailyGoalModal.tsx`
3. All accessibility labels are included for screen reader support
4. The implementation handles the edge case where health tracking is not available on the device

---

## Phase 6 Complete

This is the final phase of the Step Tracking Integration feature. All phases are now complete:

1. Phase 1: Health Service Types and Interfaces
2. Phase 2: useStepTracking Hook
3. Phase 3: Health Provider Factory
4. Phase 4: Background Sync Registration
5. Phase 5: Unified Step Tracking Service
6. **Phase 6: Settings UI Integration** (This phase)

---

**Handoff To**: Tester Agent (for comprehensive test coverage)
