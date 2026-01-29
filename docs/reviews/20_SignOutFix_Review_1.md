# Code Review: Sign-Out Fix and User Store Enhancements

**Plan**: Ad-hoc review (no formal plan - bug fix changes)
**Iteration**: 1
**Date**: 2026-01-18

## Summary

This review covers recent modifications to the sign-out flow and related user state management in the Stepper.Mobile project. The changes add WHERE clauses to update operations in `usersApi.ts`, introduce a `clearUser` action to `userStore.ts`, implement sign-out handling with race condition prevention in `App.tsx`, and add `scope: 'global'` to the sign-out call in `supabase.ts`. Overall, the changes are well-structured and address important security and correctness concerns, but there is one failing test that must be updated and a missing test for the new `clearUser` action.

## Files Reviewed

1. `E:\Github Projects\Stepper\Stepper.Mobile\src\services\api\usersApi.ts`
2. `E:\Github Projects\Stepper\Stepper.Mobile\src\store\userStore.ts`
3. `E:\Github Projects\Stepper\Stepper.Mobile\App.tsx`
4. `E:\Github Projects\Stepper\Stepper.Mobile\src\services\supabase.ts`

## Checklist Results

### Architecture Compliance
- [x] Dependency direction preserved (Services -> API layer -> Supabase Client)
- [x] No business logic in API layer (API layer is thin data access adapter)
- [x] Feature slices are independent and loosely coupled
- [x] Common folder contains only shared infrastructure
- [x] Screaming Architecture principles respected

### Code Quality
- [x] Follows coding standards
- [x] No code smells (duplication, long methods, etc.)
- [x] Proper error handling
- [x] No magic strings
- [x] Guard clauses present
- [ ] Test coverage complete (ISSUE #1, ISSUE #2)

### Security
- [x] WHERE clauses added to prevent mass updates
- [x] Global sign-out scope for proper session invalidation
- [x] Race condition handling for auth state changes

### TypeScript Type Safety
- [x] Proper type annotations
- [x] No `any` types in new code (existing `any` in error handlers is acceptable)
- [x] Interface definitions for state management

## Issues

### BLOCKER

#### Issue #1: Failing Test - signOut Parameter Change
**File**: `E:\Github Projects\Stepper\Stepper.Mobile\src\services\__tests__\supabase.test.ts`
**Line**: 395-401
**Description**: The test `should call signOut without parameters` now fails because the implementation was changed to call `signOut({ scope: 'global' })`. The test expects no parameters but receives `{ scope: 'global' }`.

**Test Output**:
```
Expected: called with 0 arguments
Received: {"scope": "global"}
```

**Suggestion**: Update the test to verify the new expected behavior:
```typescript
it('should call signOut with global scope to invalidate all sessions', async () => {
  mockSignOut.mockResolvedValue({ error: null });

  await signOut();

  expect(mockSignOut).toHaveBeenCalledWith({ scope: 'global' });
});
```

### MAJOR

#### Issue #2: Missing Test for clearUser Action
**File**: `E:\Github Projects\Stepper\Stepper.Mobile\src\store\__tests__\userStore.test.ts`
**Description**: The new `clearUser` action in `userStore.ts` (line 116-118) has no corresponding test coverage. This action is critical for sign-out functionality and should be tested.

**Suggestion**: Add a test suite for `clearUser`:
```typescript
describe('clearUser', () => {
  it('should reset user state to initial values', () => {
    // Set initial user state
    useUserStore.setState({
      currentUser: mockUserProfile,
      isLoading: true,
      error: 'Some error',
    });

    const { result } = renderHook(() => useUserStore());

    act(() => {
      result.current.clearUser();
    });

    expect(result.current.currentUser).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
```

### MINOR

#### Issue #3: Consider Adding JSDoc to clearUser
**File**: `E:\Github Projects\Stepper\Stepper.Mobile\src\store\userStore.ts`
**Line**: 116-118
**Description**: The `clearUser` action lacks documentation. While the function name is self-explanatory, adding a JSDoc comment would improve consistency with other parts of the codebase.

**Suggestion**: Add documentation:
```typescript
/**
 * Clears the current user state. Used during sign-out to reset the store.
 */
clearUser: () => {
  set({ currentUser: null, isLoading: false, error: null });
},
```

#### Issue #4: isSigningOut Flag Reset Timing
**File**: `E:\Github Projects\Stepper\Stepper.Mobile\App.tsx`
**Line**: 61-63
**Description**: The `isSigningOut` flag is reset after a 1000ms timeout. While this works, it introduces a "magic number" and the timeout may be too short or too long depending on network conditions. Consider documenting why this specific value was chosen.

**Current Code**:
```typescript
setTimeout(() => {
  isSigningOut = false;
}, 1000);
```

**Suggestion**: Either add a comment explaining the timeout value or extract it to a named constant:
```typescript
// Allow time for any pending auth state events to settle
// before accepting new SIGNED_IN events
const SIGN_OUT_DEBOUNCE_MS = 1000;
setTimeout(() => {
  isSigningOut = false;
}, SIGN_OUT_DEBOUNCE_MS);
```

## Code Analysis

### usersApi.ts - WHERE Clause Security Fix

**Lines 15-28 (updateProfile)**:
The addition of the WHERE clause using `.eq('id', user.id)` is a critical security fix. Without this, the update could potentially affect rows not belonging to the current user if RLS policies were misconfigured.

**Positive Aspects**:
- Proper authentication check before update
- Clear error message for unauthenticated users
- Chained query with `.select().single()` ensures updated data is returned

**Lines 31-52 (updatePreferences)**:
Similar security fix applied to preferences updates. The implementation correctly:
1. Fetches current preferences first
2. Merges with new preferences
3. Updates only the authenticated user's row

### userStore.ts - clearUser Action

**Lines 116-118**:
The `clearUser` action is simple and effective:
- Resets `currentUser` to `null`
- Resets `isLoading` to `false`
- Clears any `error` state

This is the correct behavior for a sign-out operation.

### App.tsx - Sign-Out Race Condition Handling

**Lines 26-77**:
The `isSigningOut` flag pattern is a reasonable approach to handle the race condition where Supabase might emit a `SIGNED_IN` event immediately after `SIGNED_OUT` (e.g., from session restoration).

**Positive Aspects**:
- Prevents unwanted re-authentication after sign-out
- Properly clears both auth session and user profile
- Correct cleanup of subscription on unmount

**Potential Concern**:
The flag is local to the `prepare` function closure, which is appropriate since it only needs to exist for the lifetime of the subscription.

### supabase.ts - Global Scope Sign-Out

**Lines 79-83**:
Using `scope: 'global'` for sign-out is a security best practice. This ensures:
- All refresh tokens are invalidated across all devices
- The user is fully signed out, not just locally
- Prevents "zombie sessions" on other devices

## Test Results

```
Test Suites: 1 failed, 1 total
Tests:       1 failed, 32 passed, 33 total
```

The failing test is documented in Issue #1.

## Recommendation

**Status**: REVISE

**Next Steps**:
- [ ] **BLOCKER**: Fix the failing test in `supabase.test.ts` (Issue #1)
- [ ] **MAJOR**: Add test coverage for `clearUser` action (Issue #2)
- [ ] **MINOR**: Consider adding JSDoc to `clearUser` (Issue #3)
- [ ] **MINOR**: Consider documenting the timeout value in App.tsx (Issue #4)

---

> **USER ACCEPTANCE REQUIRED**: Before proceeding, the user must review and approve this assessment. The BLOCKER issue (failing test) must be addressed before these changes can be approved for merge.
