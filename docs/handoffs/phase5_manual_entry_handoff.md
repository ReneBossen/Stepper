# Phase 5: Manual Step Entry UI - Implementation Handoff

**Date**: 2026-01-28
**Feature**: Manual Step Entry for Step Tracking Integration
**Status**: Implementation Complete (pending package installation)

---

## Summary

Implemented the Manual Step Entry feature that allows users to manually add step data for:
- Users who decline health API permissions
- Users with fitness devices not connected to health APIs
- Activities not automatically tracked by health apps

---

## Files Created

### 1. `src/utils/stepEstimation.ts`

Distance estimation utilities for calculating distance from step count:

- `estimateDistanceFromSteps(stepCount)` - Estimates meters from steps using average stride length (0.762m)
- `formatDistance(meters, units)` - Formats distance for display (km/miles)
- `convertToMeters(value, units)` - Converts km/miles to meters
- `convertFromMeters(meters, units)` - Converts meters to km/miles

### 2. `src/screens/steps/hooks/useManualStepEntry.ts`

Custom hook for manual entry logic:

- Form validation (step count, date, distance)
- API submission to `stepsApi.addSteps()` with `source: 'manual'`
- Automatic data refresh after successful submission
- Error handling with `getErrorMessage()`

**Validation Rules:**
- Step count: 0 to 200,000 (whole numbers only)
- Date: Cannot be in future, cannot be more than 1 year ago
- Distance: Cannot be negative, max 500,000 meters

### 3. `src/components/steps/ManualStepEntryModal.tsx`

Modal component following the `DailyGoalModal` pattern:

- Date picker with platform-specific behavior (iOS spinner, Android default)
- Step count input (numeric keyboard, whole numbers only)
- Optional distance input with estimated distance placeholder
- Field validation with inline error messages
- Loading state during submission
- Automatic form reset on open

**Features:**
- Respects user's unit preference (metric/imperial) from `userStore`
- Shows estimated distance when user enters steps
- Prevents submission of invalid data
- Proper accessibility labels and testIDs

### 4. `src/components/steps/index.ts`

Barrel export file for step-related components.

---

## Files Modified

### 5. `src/screens/home/HomeScreen.tsx`

Added FAB (Floating Action Button) for quick access to manual entry:

- Import: `ManualStepEntryModal` from `@components/steps`
- Import: `FAB` from `react-native-paper`
- State: `showManualEntry` for modal visibility
- Handlers: `handleAddStepsPress`, `handleManualEntryDismiss`, `handleManualEntrySuccess`
- Updated `scrollContent` padding to 88px for FAB space
- Added FAB positioned bottom-right with "plus" icon

### 6. `src/screens/steps/StepsHistoryScreen.tsx`

Added "Add Entry" button to header:

- Import: `ManualStepEntryModal` from `@components/steps`
- State: `showManualEntry` for modal visibility
- Handlers: `handleAddStepsPress`, `handleManualEntryDismiss`, `handleManualEntrySuccess`
- Added `Appbar.Action` with "plus" icon to all three return statements (loading, error, normal)
- Added `ManualStepEntryModal` to all three return statements

---

## Dependencies Required

### New Package to Install

```bash
npx expo install @react-native-community/datetimepicker
```

This package is required for the date picker component. Compatible with Expo SDK 54.

---

## API Integration

The implementation uses the existing `stepsApi.addSteps()` method with:

```typescript
{
  stepCount: number,
  distanceMeters: number,  // Estimated if not provided
  date: string,            // YYYY-MM-DD format
  source: 'manual'
}
```

After successful submission, the hook automatically refreshes:
- `fetchTodaySteps()` - Updates today's step count
- `fetchStats()` - Updates statistics

---

## UI/UX Notes

1. **Entry Points:**
   - HomeScreen: FAB button (bottom-right)
   - StepsHistoryScreen: Header "+" icon

2. **Modal Behavior:**
   - Form resets when modal opens
   - Date defaults to today
   - Distance is optional (estimated from steps if not provided)
   - Cannot submit future dates

3. **Feedback:**
   - Loading spinner on submit button
   - Inline validation errors
   - API error display
   - Automatic modal close on success

---

## Testing Checklist

- [ ] Modal opens from HomeScreen FAB
- [ ] Modal opens from StepsHistoryScreen header
- [ ] Date picker shows/hides correctly (iOS/Android)
- [ ] Cannot select future dates
- [ ] Cannot select dates > 1 year ago
- [ ] Step count validation works (negative, too high, decimals)
- [ ] Distance validation works (negative, too high)
- [ ] Empty step count shows error
- [ ] Estimated distance shows when steps entered
- [ ] Manual distance overrides estimation
- [ ] Submit button disabled when form invalid
- [ ] Loading state shows during submission
- [ ] Success refreshes data and closes modal
- [ ] Error state displays API errors
- [ ] Modal resets on re-open

---

## Backend Requirements

No backend modifications required. Uses existing `POST /steps` endpoint.

---

## Handoff Notes

1. **Package Installation Required**: The `@react-native-community/datetimepicker` package must be installed before testing.

2. **TypeScript Compilation**: Will fail until the package is installed due to missing type declarations.

3. **Testing on Physical Device**: Date picker behavior may vary between simulator and physical device, especially on iOS.

---

## Next Steps

1. Install DateTimePicker package
2. Run TypeScript check to verify compilation
3. Test on iOS and Android simulators/devices
4. Pass to Tester Agent for test coverage

---

**Handoff to**: Tester Agent (after manual package installation)
