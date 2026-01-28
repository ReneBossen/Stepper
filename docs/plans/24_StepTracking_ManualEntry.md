# Plan: Manual Step Entry Feature

## Overview

This plan covers the implementation of manual step entry, allowing users to record their steps by hand. This feature is essential for users who:
- Decline health API permissions (HealthKit/Google Fit)
- Use fitness devices not connected to health APIs
- Want to log steps from activities not automatically tracked
- Experience issues with automatic sync

Manual entry is a first-class feature, not a fallback. Users should feel empowered to use it as their primary step tracking method.

## Goals

1. Provide an intuitive UI for entering daily step counts
2. Support optional distance entry
3. Allow entry for today and past dates (not future)
4. Validate input to ensure reasonable values
5. Integrate seamlessly with existing step history
6. Clearly distinguish manual entries from auto-synced entries

## Non-Goals

- Bulk entry of multiple days at once (may be added later)
- Importing from CSV or other formats
- Editing existing entries (covered by existing API, UI may be added later)
- Deleting entries from this UI (use history screen)

## Technical Approach

### 1. Entry Point Locations

Manual entry should be accessible from multiple locations:

1. **Home Screen**: Floating action button or prominent "Add Steps" button
2. **Steps History Screen**: "Add Entry" button in header or empty state
3. **Settings (Health Data)**: When health tracking is disabled, show "Enter Steps Manually" option

### 2. UI Design

**Manual Entry Modal/Screen**:

```
+------------------------------------------+
|           Add Steps                    X |
+------------------------------------------+
|                                          |
|  Date: [Today - January 28, 2024    v]   |
|                                          |
|  Steps: [         10,000            ]    |
|         (Required)                       |
|                                          |
|  Distance: [       7.5              ] km |
|            (Optional - will estimate     |
|             if left empty)               |
|                                          |
|  +------------------------------------+  |
|  |           Save Entry               |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
```

**Key UI Elements**:
- Date picker (defaults to today, max = today, min = reasonable past limit)
- Step count input (numeric keyboard)
- Distance input (optional, with unit based on user preference)
- Clear validation messages
- Save button (disabled until valid)

### 3. Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Steps | Required | "Please enter your step count" |
| Steps | Min: 0 | "Step count cannot be negative" |
| Steps | Max: 200,000 | "Step count seems too high. Maximum is 200,000." |
| Steps | Integer only | "Please enter a whole number" |
| Date | Required | "Please select a date" |
| Date | Not in future | "Cannot enter steps for future dates" |
| Date | Not too old | "Cannot enter steps for dates more than 1 year ago" |
| Distance | Min: 0 (if provided) | "Distance cannot be negative" |
| Distance | Max: 500 km (if provided) | "Distance seems too high" |

### 4. Distance Estimation

If user enters steps but not distance, provide an estimated distance:

**Estimation Formula**:
```
estimatedDistanceMeters = stepCount * averageStrideLength

// Average stride lengths (can be refined based on user height if available)
averageStrideLengthMeters = 0.762  // ~30 inches, average adult
```

**UI Behavior**:
- Show estimated distance as placeholder or helper text
- User can override by entering their own value
- Clearly indicate when distance is estimated vs. user-provided

### 5. Data Flow

```
User opens manual entry UI
    |
    v
User enters step count (required)
    |
    v
User optionally enters distance
    |
    +---> Distance provided: Use user's value
    |
    +---> Distance empty: Calculate estimate
    |
    v
User selects date (default: today)
    |
    v
Validation passes
    |
    v
Call existing API: POST /api/v1/steps
    {
      stepCount: 10000,
      distanceMeters: 7500.0,  // or estimated
      date: "2024-01-28",
      source: "manual"
    }
    |
    v
Update local state (stepsStore)
    |
    v
Close modal, show success feedback
    |
    v
Refresh today's steps / history
```

### 6. Source Tracking

All manual entries will have `source: "manual"` to distinguish them from:
- `source: "healthkit"` - iOS Health data
- `source: "googlefit"` - Android Fitness data

This allows:
- Different display treatment in history
- Proper handling when health access is revoked (manual entries preserved)
- Analytics on entry methods

### 7. When to Show Manual Entry Option

| Scenario | Show Manual Entry? | Location |
|----------|-------------------|----------|
| Health tracking enabled | Yes | Home screen FAB, History screen |
| Health tracking disabled | Yes (prominent) | Home screen, Settings, History |
| First-time user (no preference set) | Yes | Onboarding, Home screen |
| After health permission denied | Yes (with explanation) | Permission result screen |

**Messaging for non-health-tracking users**:
- "Track your steps manually"
- "Add today's steps"
- No guilt messaging about not enabling health tracking

### 8. Integration with Existing Steps

Manual entries integrate with the existing step tracking system:

- Appear in daily history alongside auto-synced entries
- Contribute to daily totals, weekly stats, streaks
- Can coexist with health API entries for the same day
- Backend aggregates all entries for daily summaries

**Display Distinction**:
In history view, manual entries could show:
- Small "manual" badge or icon
- Different background shade
- Or no distinction (treat all entries equally) - recommended

**Recommendation**: Treat all entries equally in the UI. Users shouldn't feel their manual entries are "lesser" than automatic ones.

## File Structure

```
WalkingApp.Mobile/src/
  components/
    steps/
      ManualStepEntryModal.tsx    # Modal component for entry
      ManualStepEntryModal.test.tsx
  screens/
    steps/
      hooks/
        useManualStepEntry.ts     # Entry logic and validation
  utils/
    stepEstimation.ts             # Distance estimation utilities
```

## Component Props

```typescript
interface ManualStepEntryModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess?: (entry: StepEntry) => void;
  initialDate?: Date;  // Optional: pre-fill date (e.g., from history screen)
}
```

## Acceptance Criteria

- [ ] Manual entry modal can be opened from Home screen
- [ ] Manual entry modal can be opened from Steps History screen
- [ ] Step count field accepts only valid integers
- [ ] Step count validates min (0) and max (200,000)
- [ ] Date picker defaults to today
- [ ] Date picker prevents future dates
- [ ] Date picker prevents dates more than 1 year ago
- [ ] Distance field is optional
- [ ] Distance is estimated when not provided
- [ ] User can override estimated distance
- [ ] Distance respects user's unit preference (km/mi)
- [ ] Save button is disabled until form is valid
- [ ] Validation errors are clearly displayed
- [ ] Successful save shows feedback (toast/snackbar)
- [ ] Successful save refreshes today's steps
- [ ] Entry appears in step history with source "manual"
- [ ] Loading state shown during save
- [ ] Network errors are handled gracefully
- [ ] Modal can be dismissed without saving

## Testing Strategy

### Unit Tests
- Test validation logic for all rules
- Test distance estimation calculation
- Test form state management
- Test error message generation

### Component Tests
- Test modal open/close behavior
- Test form input interactions
- Test validation display
- Test submit flow with mocked API

### Manual Testing Checklist
- [ ] Enter valid steps for today
- [ ] Enter valid steps for past date
- [ ] Try to enter steps for future date (should fail)
- [ ] Enter steps without distance (check estimation)
- [ ] Enter steps with custom distance
- [ ] Enter invalid step count (negative, too high, decimal)
- [ ] Submit with network error
- [ ] Cancel/dismiss modal
- [ ] Verify entry appears in history
- [ ] Verify today's total updates

## Error Handling

| Error | User Message | Recovery |
|-------|--------------|----------|
| Network error | "Unable to save steps. Please check your connection and try again." | Show retry button |
| Server error (5xx) | "Something went wrong. Please try again." | Show retry button |
| Validation error from server | Show specific message from server | User corrects input |
| Duplicate entry conflict | "Steps already recorded for this date. Your entry has been added." | Success (backend handles) |

## Risks and Open Questions

### Risks

1. **Accidental Duplicates**: User might enter steps manually when auto-sync already recorded them
   - Mitigation: Show current day's total before entry
   - Backend aggregates all entries, so duplicates just add up

2. **Data Entry Errors**: User might typo and enter wrong values
   - Mitigation: Clear validation, confirmation before save
   - Future: Allow editing/deleting entries

### Open Questions

None - all decisions made in this plan.

## Dependencies

### Existing Infrastructure Used
- `stepsApi.addSteps()` - Already exists for recording steps
- `useStepsStore` - Already manages step state
- `RecordStepsRequest` - Already supports `source` field

### No New Packages Required

This feature uses existing UI libraries (React Native Paper) and APIs.

## Future Enhancements (Out of Scope)

- Edit existing manual entries
- Delete entries from manual entry UI
- Bulk entry for multiple days
- Quick entry shortcuts (e.g., "Same as yesterday")
- Voice input for step count
