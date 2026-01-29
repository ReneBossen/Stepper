# Code Review: PR 20h OAuth Fix (v2 - Second Pass)

**Branch:** `feature/20h-cleanup`
**Commits since master:** 12 commits
**Date:** 2026-01-25
**Reviewer:** Reviewer Agent
**Previous Review:** `PR_20h_OAuth_Fix_Review.md`

---

## Executive Summary

This second-pass review verifies that the BLOCKER and MAJOR issues from the first review have been addressed. The implementation team has done excellent work resolving the majority of issues. **All debug statements have been removed**, the null reference warning has been fixed, and the code quality is significantly improved.

However, **2 NEW BLOCKER issues** have been discovered:
1. The test file for the deleted `SupabaseAuthMiddleware` was not deleted, causing a build failure
2. A test expectation in `client.test.ts` is now wrong due to the intended behavior change (OAuth tokens are now properly cleared)

Additionally, there is **1 flaky test** that continues to fail intermittently.

**Recommendation: REVISE** - Fix the broken tests before merge.

---

## Verification of Previous Issues

| # | Severity | Issue | Status | Notes |
|---|----------|-------|--------|-------|
| 1 | BLOCKER | 17 Console.WriteLine debug statements | **FIXED** | Verified: no Console.WriteLine in Stepper.Api |
| 2 | BLOCKER | 11 console.log debug statements | **FIXED** | Verified: no debug console.log in src/ (only legitimate console.error) |
| 3 | BLOCKER | Null reference warning in UsersController | **FIXED** | Line 43: `if (profile == null)` check added |
| 4 | MAJOR | Deprecated SupabaseAuthMiddleware | **FIXED** | File deleted from Stepper.Api |
| 5 | MAJOR | OAuth token expiry hardcoded | **FIXED** | Added JSDoc comment explaining the value |
| 6 | MAJOR | Silent OAuth session expiry | **FIXED** | Lines 39, 118 in client.ts: `useAuthStore.getState().setUser(null)` |
| 7 | MAJOR | Magic string "accepted" | **FIXED** | `FriendshipStatusStrings.Accepted` constant created and used |
| 8 | MAJOR | Missing authorization docs on user endpoints | **FIXED** | XML `<remarks>` added documenting RLS policies |
| 9 | MINOR | AutoConnectRealtime comment | **FIXED** | Comment explains 403 error prevention |

**Previous Issues Summary:** 9/9 issues addressed (100%)

---

## NEW Issues Found

### BLOCKER

#### Issue #1: Test File Not Deleted for Deleted Middleware

**File:** `tests/Stepper.UnitTests/Common/Authentication/SupabaseAuthMiddlewareTests.cs`

**Description:** The `SupabaseAuthMiddleware.cs` was correctly deleted, but its corresponding test file `SupabaseAuthMiddlewareTests.cs` was NOT deleted. This causes a compilation error because the test file references the non-existent class.

**Evidence:**
```
error CS0246: The type or namespace name 'SupabaseAuthMiddleware' could not be found
```

**Impact:** Build fails. CI/CD pipeline will fail. Cannot merge.

**Suggestion:** Delete the file:
```
tests/Stepper.UnitTests/Common/Authentication/SupabaseAuthMiddlewareTests.cs
```

---

#### Issue #2: Test Expectation Incorrect After Behavior Change

**File:** `Stepper.Mobile/src/services/api/__tests__/client.test.ts`
**Lines:** 183-205

**Description:** The test "should not attempt refresh for expired OAuth tokens" expects that `clearTokens` is NOT called when OAuth tokens expire. However, the fix for Issue #6 (silent OAuth session expiry) correctly added calls to `clearTokens` and `useAuthStore.getState().setUser(null)` when OAuth tokens expire. The test expectation is now wrong.

**Evidence:**
```typescript
// Test expectation (WRONG now):
expect(mockClearTokens).not.toHaveBeenCalled();

// Actual behavior (CORRECT now - lines 37-39 in client.ts):
await tokenStorage.clearTokens();
useAuthStore.getState().setUser(null);
```

**Test Output:**
```
Expected number of calls: 0
Received number of calls: 1
```

**Impact:** Test fails. The test needs to be updated to match the new (correct) behavior.

**Suggestion:** Update the test to expect that tokens ARE cleared:
```typescript
it('should not attempt refresh for expired OAuth tokens', async () => {
  // ... setup ...

  await apiClient.get('/public/endpoint');

  // Should NOT attempt to refresh OAuth tokens
  expect(mockRefreshToken).not.toHaveBeenCalled();
  // SHOULD clear tokens and notify auth store for session expiry
  expect(mockClearTokens).toHaveBeenCalled();
  // Request should proceed without Authorization header
  // ...
});
```

Also add mock for `useAuthStore`:
```typescript
jest.mock('@store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      setUser: jest.fn(),
    }),
  },
}));
```

---

### MINOR

#### Issue #3: Flaky Timing Test

**File:** `Stepper.Mobile/src/services/__tests__/tokenStorage.test.ts`
**Line:** 50

**Description:** The test "should store tokens concurrently using Promise.all" uses timing assertions that are non-deterministic and flaky. The threshold was previously increased from 25ms to accommodate CI, but it still fails intermittently.

**Evidence:**
```
Expected: < 25
Received: 54
```

**Suggestion:** Remove timing assertions from unit tests as they are non-deterministic. The concurrent behavior is already verified by checking `toHaveBeenCalledTimes(4)`. Change:

```typescript
// Instead of:
expect(endTime - startTime).toBeLessThan(25);
expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(4);

// Use:
expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(4);
// Optionally add a comment about the expected parallel behavior
```

---

#### Issue #4: Pre-existing console.log in PermissionsScreen

**File:** `Stepper.Mobile/src/screens/onboarding/PermissionsScreen.tsx`
**Line:** 45

**Description:** A single `console.log('Push token:', token.data)` statement exists. This appears to be pre-existing code (not introduced in this PR) but should be guarded or removed.

**Evidence:**
```typescript
console.log('Push token:', token.data);
// TODO: Send token to backend when endpoint is ready
```

**Suggestion:** Either remove or wrap in `__DEV__` guard:
```typescript
if (__DEV__) {
  console.log('Push token:', token.data);
}
```

This is MINOR because it's pre-existing code and the push token is not sensitive.

---

## Security Assessment

### Authentication Flow
- **PASS:** Token extraction uses proper Bearer prefix validation (case-insensitive)
- **PASS:** JWKS-based validation for OAuth tokens with proper key rotation support
- **PASS:** Symmetric key validation for backend tokens with proper secret handling
- **PASS:** Token expiry validation with appropriate clock skew (5 minutes)
- **PASS:** Tokens stored in HttpContext.Items, not exposed in responses

### Token Handling
- **PASS:** Tokens stored in SecureStore (encrypted) on mobile
- **PASS:** No tokens logged (debug statements removed)
- **PASS:** OAuth token expiry properly clears tokens and notifies user
- **PASS:** 401 responses clear tokens and notify auth store

### Input Validation
- **PASS:** User ID validation with Guid.Empty checks
- **PASS:** Avatar file validation (size, type, extension)
- **PASS:** Display name length validation

### Authorization
- **PASS:** [Authorize] attribute on controller
- **PASS:** User ID extracted from validated claims
- **PASS:** RLS policies documented in XML remarks
- **NOTE:** Authorization relies on Supabase RLS - ensure RLS policies are properly configured in database

### Error Handling
- **PASS:** Stack traces not exposed in production responses
- **PASS:** Generic error messages for unexpected exceptions
- **PASS:** Specific error messages for validation errors

### No Hardcoded Secrets
- **PASS:** Test files use obvious test values ("test-anon-key", etc.)
- **PASS:** Production secrets loaded from configuration

---

## Code Quality Assessment

### Positive Changes
1. **Clean debug statement removal** - No residual debug logging
2. **Proper constant extraction** - FriendshipStatusStrings created
3. **Excellent XML documentation** - RLS authorization clearly documented
4. **Proper null handling** - Guard clauses throughout
5. **Consistent error handling** - Try/catch patterns are consistent
6. **Good separation of concerns** - Query entities avoid cross-feature dependencies

### Architecture Compliance
- [x] Dependency direction preserved (Controller -> Service -> Repository -> Supabase)
- [x] No business logic in controllers
- [x] Feature slices are independent
- [x] Common folder contains only shared infrastructure
- [x] Screaming Architecture principles respected

### Code Smells
- None detected in the fixed code

---

## Test Coverage

### Backend Tests
- `SupabaseAuthHandlerTests.cs` - 11 tests covering:
  - Valid token authentication
  - Missing/empty authorization header
  - Malformed tokens
  - Expired tokens
  - Invalid signatures
  - Missing Bearer prefix
  - Case-insensitive Bearer prefix
  - Whitespace handling
  - Email claim extraction

### Mobile Tests (Issues)
- `client.test.ts` - 1 failing test (expectation needs update)
- `tokenStorage.test.ts` - 1 flaky test (timing assertion)

---

## Files Changed Summary

| Category | Files Changed | Assessment |
|----------|---------------|------------|
| Authentication | 4 | **GOOD** - Clean implementation |
| User Features | 10 | **GOOD** - Well structured |
| Mobile Auth | 4 | **GOOD** - Fixes applied |
| Mobile API | 6 | **GOOD** - Backend migration complete |
| Tests | 3 | **NEEDS WORK** - 2 issues |
| Documentation | 4 | **GOOD** - Comprehensive |

---

## Recommendation

**Status:** REVISE

**Rationale:** Two blocker issues prevent merge:
1. Build fails due to orphaned test file
2. Test fails due to updated behavior

These are quick fixes that should take less than 30 minutes.

**Next Steps:**
- [ ] Delete `tests/Stepper.UnitTests/Common/Authentication/SupabaseAuthMiddlewareTests.cs`
- [ ] Update `client.test.ts` line 200 to expect `mockClearTokens` to be called
- [ ] Add `useAuthStore` mock to `client.test.ts`
- [ ] (Optional) Fix flaky timing test in `tokenStorage.test.ts`

**After Fixes:**
- Run `dotnet build` to verify no compilation errors
- Run `dotnet test` to verify backend tests pass
- Run `npm test` to verify mobile tests pass
- PR is ready to merge

---

> **USER ACCEPTANCE REQUIRED**: Before proceeding with fixes, the user must review and approve this assessment.

---

## Appendix: Verification Commands

```bash
# Verify no Console.WriteLine in API code
cd Stepper.Api && grep -r "Console.WriteLine" --include="*.cs" .
# Expected: No output

# Verify no debug console.log in mobile src
cd Stepper.Mobile && grep -r "console.log" src/ --include="*.ts" --include="*.tsx" | grep -v "console.error" | grep -v test
# Expected: Only PermissionsScreen.tsx line 45 (pre-existing)

# Verify build
dotnet build Stepper.Api
# Expected: 0 errors, 0 warnings

# Run backend tests
dotnet test tests/Stepper.UnitTests
# Expected: Currently fails due to orphaned test file

# Run mobile tests
cd Stepper.Mobile && npm test
# Expected: Currently 2 failures
```
