# Code Review: Group Management UI

**Plan**: `docs/plans/17_UI_GroupManagement.md`
**Iteration**: 1
**Date**: 2026-01-24

## Summary

The Group Management UI implementation provides screens for creating groups, joining groups, managing group settings, managing members, and inviting members. The implementation follows the plan requirements with appropriate validation, error handling, and TypeScript typing. The code is well-structured with proper use of Zustand for state management and consistent component patterns. However, there are several issues ranging from missing accessibility features to potential security concerns and code quality improvements that need to be addressed.

## Checklist Results

- [x] Dependency direction preserved (Screen -> Store -> API -> Supabase)
- [x] No business logic in controllers (screens are UI only, business logic in store/API)
- [x] Feature slices are independent and loosely coupled
- [x] Common folder contains only shared infrastructure
- [x] Screaming Architecture principles respected
- [ ] All accessibility labels present (ISSUE #1, #2)
- [ ] Clipboard functionality properly implemented (ISSUE #3)
- [ ] Error handling complete for all edge cases (ISSUE #8)
- [x] Navigation types properly defined
- [x] Tests present for new screens
- [ ] Memory leak potential in cleanup (ISSUE #4)

## Issues

### BLOCKER

#### Issue #1: Missing Accessibility Labels on Interactive Elements
**File**: Multiple files
**Locations**:
- `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\CreateGroupScreen.tsx` - Lines 131-133, 155-168, 206-211, 259-269
- `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\JoinGroupScreen.tsx` - Lines 50-92, 80-88, 248-255, 296-304
- `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\GroupManagementScreen.tsx` - Lines 268-278, 396-400, 415-419, 462-479, 496-507
- `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\InviteMembersScreen.tsx` - Lines 61-66, 271-280, 291-301, 315-324

**Description**: Many interactive elements (Appbar.BackAction, Buttons, Switches, RadioButtons, TextInputs) are missing `accessibilityLabel` props. This makes the app inaccessible to users relying on screen readers. Looking at existing screens like `GroupsListScreen.tsx` and `FriendsListScreen.tsx`, accessibility labels are present on similar elements.

**Suggestion**: Add `accessibilityLabel` props to all interactive elements:
- `Appbar.BackAction` should have `accessibilityLabel="Go back"`
- Form inputs should have descriptive accessibility labels
- Buttons should describe their action
- Switches should indicate what they toggle

Example for CreateGroupScreen line 132:
```tsx
<Appbar.BackAction onPress={handleBack} accessibilityLabel="Go back" />
```

---

### MAJOR

#### Issue #2: Missing Accessibility Labels on MemberItem and FriendItem Components
**File**:
- `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\ManageMembersScreen.tsx` - Lines 114-210
- `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\InviteMembersScreen.tsx` - Lines 41-96

**Description**: The `MemberItem` and `FriendItem` components render complex interactive elements (avatars, names, role chips, action menus) without proper accessibility support. The entire item should be accessible with a descriptive label summarizing the member info.

**Suggestion**: Add accessibility labels to the member/friend item containers similar to how `LeaderboardItem.tsx` does it:
```tsx
<View
  style={styles.memberItem}
  accessibilityLabel={`${member.display_name}, ${getRoleLabel()}`}
>
```

---

#### Issue #3: Clipboard Copy Not Properly Implemented
**File**:
- `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\GroupManagementScreen.tsx` - Lines 185-194
- `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\InviteMembersScreen.tsx` - Lines 145-154

**Description**: The "Copy Code" functionality shows the invite code in an Alert dialog with a message "Show the code in an alert that can be copied manually". This is poor UX and does not actually copy to clipboard. The Expo project should use `expo-clipboard` for proper clipboard functionality.

**Suggestion**: Install `expo-clipboard` and implement proper copy functionality:
```typescript
import * as Clipboard from 'expo-clipboard';

const handleCopyCode = useCallback(async () => {
  if (inviteCode) {
    await Clipboard.setStringAsync(inviteCode);
    Alert.alert('Copied', 'Invite code copied to clipboard');
  }
}, [inviteCode]);
```

---

#### Issue #4: Potential Memory Leak in JoinGroupScreen Search Timeout
**File**: `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\JoinGroupScreen.tsx`
**Line**: 122-132

**Description**: The search timeout cleanup in the useEffect cleanup function clears the timeout on unmount, but the `searchTimeoutRef` could be set again after the cleanup runs if a rapid search + unmount occurs. This is a minor edge case but could cause issues.

**Suggestion**: Also clear the timeout in the `handleSearchChange` before setting a new one (which is done), but ensure the ref is nullified in cleanup:
```typescript
useEffect(() => {
  return () => {
    clearSearch();
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  };
}, [clearSearch]);
```

---

#### Issue #5: Inconsistent useFocusEffect Usage in ManageMembersScreen
**File**: `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\ManageMembersScreen.tsx`
**Line**: 257-263

**Description**: The `useFocusEffect` hook has an empty cleanup function with a comment explaining it doesn't clear state. This pattern is inconsistent with `GroupManagementScreen.tsx` (line 74-80) which does clear state. If ManageMembersScreen leaves state, navigating back and forth could show stale data.

**Suggestion**: Either remove the useFocusEffect entirely if no cleanup is needed, or document why this screen intentionally doesn't clear state. If state should persist for parent screen consumption, add a comment explaining the data flow.

---

#### Issue #6: Empty ListEmptyComponent in JoinGroupScreen
**File**: `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\JoinGroupScreen.tsx`
**Line**: 356-361

**Description**: The `ListEmptyComponent` returns `null` in all cases, making it effectively useless. The empty state messaging is handled in `ListHeaderComponent` instead, which is an unusual pattern.

**Suggestion**: Either remove the `ListEmptyComponent` prop entirely (since it's always null), or move the "No public groups found" messaging to `ListEmptyComponent` for consistency with other screens like `FriendsListScreen.tsx`.

---

#### Issue #7: Missing Validation for Alphanumeric Invite Code
**File**: `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\JoinGroupScreen.tsx`
**Line**: 193-216

**Description**: The plan specifies "Invite code: 6-12 characters, alphanumeric" but the validation only checks length (lines 200-204), not the alphanumeric constraint. Users could enter invalid characters that may cause API errors.

**Suggestion**: Add alphanumeric validation:
```typescript
const handleJoinWithCode = useCallback(async () => {
  const trimmedCode = inviteCode.trim();

  if (!trimmedCode) {
    setInviteCodeError('Please enter an invite code');
    return;
  }

  if (trimmedCode.length < 6 || trimmedCode.length > 12) {
    setInviteCodeError('Invite code must be 6-12 characters');
    return;
  }

  if (!/^[A-Za-z0-9]+$/.test(trimmedCode)) {
    setInviteCodeError('Invite code must contain only letters and numbers');
    return;
  }
  // ... rest of the function
}, [inviteCode, joinGroupByCode, navigation]);
```

---

#### Issue #8: Missing Error Handling in InviteMembersScreen Data Fetching
**File**: `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\InviteMembersScreen.tsx`
**Line**: 124-129

**Description**: The useEffect calls `fetchInviteCode`, `fetchMembers`, and `fetchFriends` without error handling. If any of these fail, there's no error state displayed for the invite code or members section (only friends has `isLoadingFriends`).

**Suggestion**: Add error state handling similar to how `GroupManagementScreen` handles errors:
```typescript
// Add error display for invite code fetch failure
if (managementError && !inviteCode) {
  return (
    <ErrorMessage message={managementError} onRetry={handleRetry} />
  );
}
```

---

### MINOR

#### Issue #9: Unicode Emoji Usage Instead of Icon Components
**File**:
- `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\JoinGroupScreen.tsx` - Line 55
- `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\GroupManagementScreen.tsx` - Line 298

**Description**: Unicode emoji strings are used directly (`'\u{1F3C6}'` for trophy) instead of using consistent icon components from `react-native-paper` (MaterialCommunityIcons). This could lead to inconsistent rendering across platforms.

**Suggestion**: Use MaterialCommunityIcons for consistency:
```tsx
import { Icon } from 'react-native-paper';
<Icon source="trophy" size={20} color={theme.colors.primary} />
```

---

#### Issue #10: Unused `Pressable` Import in JoinGroupScreen
**File**: `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\JoinGroupScreen.tsx`
**Line**: 8

**Description**: `Pressable` is imported from `react-native` but never used in the component.

**Suggestion**: Remove the unused import:
```typescript
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  // Remove: Pressable,
} from 'react-native';
```

---

#### Issue #11: Hardcoded Strings for Validity Text
**File**: `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\InviteMembersScreen.tsx`
**Line**: 288

**Description**: The text "Valid for 7 days" is hardcoded. If the backend changes the validity period, this would be misleading.

**Suggestion**: Either fetch the validity period from the API response or make it configurable via constants:
```typescript
// In a constants file
export const INVITE_CODE_VALIDITY_DAYS = 7;

// In the component
<Text variant="bodySmall" style={[styles.validityText, { color: theme.colors.onSurfaceVariant }]}>
  Valid for {INVITE_CODE_VALIDITY_DAYS} days
</Text>
```

---

#### Issue #12: Missing `require_approval` in CreateGroupScreen
**File**: `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\CreateGroupScreen.tsx`

**Description**: The plan wireframe shows "Require Admin Approval" checkbox in the Group Settings but not in Create Group. However, the `GroupManagementScreen` does have this option. This is fine for the Create flow, but worth noting that groups are created without approval requirement by default.

**Suggestion**: No code change needed, but document this design decision or consider adding the option to CreateGroupScreen for consistency.

---

#### Issue #13: Inconsistent Button Styling
**File**: `E:\Github Projects\Stepper\WalkingApp.Mobile\src\screens\groups\InviteMembersScreen.tsx`
**Line**: 315-324

**Description**: The "Share via..." button uses `mode="contained-tonal"` while other primary actions use `mode="contained"`. This creates visual inconsistency.

**Suggestion**: Review the button hierarchy and ensure consistent usage of button modes:
- Primary actions: `mode="contained"`
- Secondary actions: `mode="outlined"`
- Tertiary actions: `mode="contained-tonal"` or `mode="text"`

---

#### Issue #14: API Type Casting with `any`
**File**: `E:\Github Projects\Stepper\WalkingApp.Mobile\src\services\api\groupsApi.ts`
**Lines**: 91, 114, 164, 287-289, 334, 490-497, 599

**Description**: Multiple places use `any` type casting for Supabase response data. While this works, it bypasses TypeScript's type safety.

**Suggestion**: Define proper interfaces for Supabase responses:
```typescript
interface GroupMembershipResponse {
  role: 'owner' | 'admin' | 'member';
  groups: {
    id: string;
    name: string;
    // ... other fields
  };
}

// Use the typed response
const { data: memberships } = await supabase
  .from('group_memberships')
  .select(...)
  .returns<GroupMembershipResponse[]>();
```

---

#### Issue #15: Missing testID on Some Interactive Elements
**File**: Multiple screens

**Description**: While most interactive elements have testIDs, some are missing:
- `GroupManagementScreen.tsx`: Line 396-400 (Private Switch needs testID on container)
- `InviteMembersScreen.tsx`: Line 59 (View container for FriendItem)

**Suggestion**: Add consistent testIDs for testing purposes:
```tsx
<View style={styles.switchRow} testID="private-switch-container">
```

---

## Code Smells Detected

1. **Duplicated validation logic** - Name and description validation is duplicated between `CreateGroupScreen.tsx` (lines 47-71) and `GroupManagementScreen.tsx` (lines 93-117). Consider extracting to a shared utility function.

2. **Large component files** - `ManageMembersScreen.tsx` (622 lines) and `InviteMembersScreen.tsx` (510 lines) are getting large. Consider extracting the header components to separate files.

3. **Similar getInitials function** - The `getInitials` helper function is duplicated in `ManageMembersScreen.tsx` (lines 92-98) and `InviteMembersScreen.tsx` (lines 50-56). Should be extracted to a shared utility.

4. **Magic numbers** - Debounce timeout of 300ms (JoinGroupScreen line 160), character limits (50, 500), etc. should be constants.

## Recommendation

**Status**: REVISE

The implementation is functional and follows most patterns correctly, but requires fixes for:

1. **BLOCKER**: Add accessibility labels to all interactive elements (Issue #1)
2. **MAJOR**: Implement proper clipboard functionality (Issue #3)
3. **MAJOR**: Add alphanumeric validation for invite codes (Issue #7)

**Next Steps**:
- [ ] Add accessibility labels to all Appbar.BackAction, Buttons, Switches, and input fields
- [ ] Install expo-clipboard and implement proper copy-to-clipboard functionality
- [ ] Add alphanumeric regex validation for invite code input
- [ ] Remove unused Pressable import from JoinGroupScreen
- [ ] Extract duplicated `getInitials` and validation functions to utilities
- [ ] Consider extracting duplicated validation logic to a shared hook or utility

---

> **USER ACCEPTANCE REQUIRED**: Before proceeding, the user must review and approve this assessment.
