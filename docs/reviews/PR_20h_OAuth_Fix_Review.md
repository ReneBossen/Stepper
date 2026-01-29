# Code Review: PR 20h OAuth Fix

**Branch:** `feature/20h-cleanup`
**Commits:** f2f850b..master (11 commits)
**Date:** 2026-01-25
**Reviewer:** Reviewer Agent

---

## Executive Summary

This PR introduces OAuth token handling for Google authentication, migrates several mobile API calls from direct Supabase to the backend API, adds new user endpoints (stats, activity, mutual-groups), and fixes multiple issues. While the core implementation is sound, **17 debug statements were introduced during rapid debugging that must be removed before production**. There are also a few architectural and code quality issues to address.

The review identifies **3 BLOCKERS**, **5 MAJOR**, and **7 MINOR** issues.

---

## Checklist Results

### Architecture Compliance
- [x] Dependency direction preserved (Controller -> Service -> Repository -> Supabase)
- [x] No business logic in controllers (controllers are thin HTTP adapters)
- [x] Feature slices are independent and loosely coupled
- [x] Common folder contains only shared infrastructure
- [x] Screaming Architecture principles respected
- [x] Query entities used to avoid cross-feature dependencies (FriendshipQueryEntity, etc.)

### Code Quality
- [x] Follows coding standards (mostly)
- [ ] No code smells (ISSUE #1, #2 - Debug statements)
- [x] Proper error handling
- [ ] No magic strings (ISSUE #7 - hardcoded "accepted" string)
- [x] Guard clauses present

### Plan Adherence
- [x] All plan items implemented
- [x] No unplanned changes
- [x] No scope creep

### Testing
- [x] Tests cover new functionality (SupabaseAuthHandlerTests added)
- [x] Tests are deterministic
- [ ] All tests pass (could not verify - running API process blocking build)

---

## Issues

### BLOCKER

#### Issue #1: Debug Console.WriteLine Statements in Backend Production Code

**Files:**
- `Stepper.Api/Common/Authentication/SupabaseAuthHandler.cs` (lines 45, 50, 54, 61, 65, 75, 81)
- `Stepper.Api/Common/Middleware/ExceptionHandlingMiddleware.cs` (lines 23, 27, 31, 32)
- `Stepper.Api/Users/UsersController.cs` (lines 33, 37, 43, 45, 50, 51)

**Description:** 17 `Console.WriteLine` debug statements were added during debugging. These:
1. Pollute production logs with debug noise
2. May leak sensitive information (token length, user IDs, stack traces)
3. Impact performance
4. Are not compliant with the coding standards (use proper logging framework instead)

**Evidence:**
```csharp
// SupabaseAuthHandler.cs:45
Console.WriteLine($"[Auth] Authenticating request to {Request.Path}");

// SupabaseAuthHandler.cs:54
Console.WriteLine($"[Auth] Token found, length: {token.Length}");

// UsersController.cs:50-51
Console.WriteLine($"[UsersController] Exception: {ex.GetType().Name}: {ex.Message}");
Console.WriteLine($"[UsersController] StackTrace: {ex.StackTrace}");
```

**Suggestion:** Remove ALL `Console.WriteLine` statements. Use the `ILogger<T>` interface with appropriate log levels (`LogDebug`, `LogInformation`, `LogWarning`) if logging is needed. The auth handler already has a logger injected but not consistently used.

---

#### Issue #2: Debug console.log Statements in Mobile Production Code

**Files:**
- `Stepper.Mobile/src/services/tokenStorage.ts` (lines 91, 93, 99, 107)
- `Stepper.Mobile/src/services/api/client.ts` (lines 36, 115)
- `Stepper.Mobile/src/store/authStore.ts` (line 143)
- `Stepper.Mobile/src/screens/auth/LoginScreen.tsx` (lines 101, 103, 120)

**Description:** 11 `console.log` debug statements were added. These:
1. Expose internal state and token handling logic
2. Pollute mobile device console logs
3. Could expose token information in some debugging scenarios

**Evidence:**
```typescript
// tokenStorage.ts:91
console.log('[isAccessTokenExpired] expiryStr:', expiryStr);

// tokenStorage.ts:107
console.log('[isAccessTokenExpired] now:', now, 'expiryTime:', expiryTime, 'isExpired:', isExpired);
```

**Suggestion:** Remove ALL `console.log` debug statements. Consider using `__DEV__` guards if debug logging is needed:
```typescript
if (__DEV__) {
  console.log('[debug] ...');
}
```

---

#### Issue #3: Possible Null Reference Warning in UsersController

**File:** `Stepper.Api/Users/UsersController.cs`
**Line:** 46

**Description:** Compiler warning CS8604 - possible null reference. The `profile` variable from `EnsureProfileExistsAsync` could potentially be null.

**Evidence:**
```csharp
// Line 45-46
var profile = await _userService.EnsureProfileExistsAsync(userId.Value);
Console.WriteLine($"[UsersController] Got profile: {profile?.DisplayName}");
return Ok(ApiResponse<GetProfileResponse>.SuccessResponse(profile)); // Warning here
```

**Suggestion:** Add null check before returning, or ensure the service method never returns null:
```csharp
if (profile == null)
{
    return NotFound(ApiResponse<GetProfileResponse>.ErrorResponse("Profile not found."));
}
return Ok(ApiResponse<GetProfileResponse>.SuccessResponse(profile));
```

---

### MAJOR

#### Issue #4: Deprecated Middleware Still Present

**File:** `Stepper.Api/Common/Authentication/SupabaseAuthMiddleware.cs`

**Description:** The middleware is marked as `[Obsolete]` but still exists with 180+ lines of duplicated JWKS validation code. It's no longer used in `Program.cs` (replaced by `SupabaseAuthHandler`).

**Suggestion:** Either:
1. Delete the file entirely (recommended - dead code)
2. Or keep it for backward compatibility but document why in a comment

---

#### Issue #5: OAuth Token Expiry Hardcoded Default

**File:** `Stepper.Mobile/src/screens/auth/LoginScreen.tsx`
**Line:** 24

**Description:** The `DEFAULT_EXPIRES_IN` is hardcoded to 3600 seconds (1 hour). If Supabase changes its token expiry, this could cause issues.

**Evidence:**
```typescript
// Default token expiration (1 hour in seconds) - Supabase default
const DEFAULT_EXPIRES_IN = 3600;
```

**Suggestion:** Extract to a configuration file or at minimum add a comment warning that this should match Supabase configuration. Consider fetching from Supabase settings or using a longer safe default.

---

#### Issue #6: OAuth Tokens Cannot Be Refreshed - Silent Session Loss

**File:** `Stepper.Mobile/src/services/api/client.ts`
**Lines:** 31-40

**Description:** When OAuth tokens expire, the code silently clears tokens and returns null, which will cause the next API call to fail without giving the user feedback about needing to re-authenticate.

**Evidence:**
```typescript
if (tokenType === 'oauth') {
  const isExpired = await tokenStorage.isAccessTokenExpired();
  if (isExpired) {
    console.log('[getAuthToken] OAuth token expired, clearing tokens');
    await tokenStorage.clearTokens();
    return null;  // User gets no notification
  }
  return accessToken;
}
```

**Suggestion:** Implement a mechanism to notify the user their session expired:
- Dispatch an auth state change event
- Update the auth store's state
- Consider storing a "session expired" flag that the UI can respond to

---

#### Issue #7: Magic String "accepted" in UserRepository

**File:** `Stepper.Api/Users/UserRepository.cs`
**Lines:** 94, 100

**Description:** The friendship status "accepted" is hardcoded as a string. This should be a constant or enum.

**Evidence:**
```csharp
.Where(x => x.RequesterId == userId && x.Status == "accepted")
// and
.Where(x => x.AddresseeId == userId && x.Status == "accepted")
```

**Suggestion:** Define a constant in a shared location:
```csharp
public static class FriendshipStatus
{
    public const string Accepted = "accepted";
    public const string Pending = "pending";
    // etc.
}
```

---

#### Issue #8: Missing Authorization Check on User Stats/Activity Endpoints

**Files:**
- `Stepper.Api/Users/UsersController.cs` (lines 249-312)
- `Stepper.Api/Users/UserService.cs`

**Description:** The `GetUserStats`, `GetUserActivity`, and `GetMutualGroups` endpoints allow any authenticated user to query stats for ANY other user by ID. There's no check if the requesting user has permission to view this data (e.g., are they friends? Is the profile public?).

**Evidence:**
```csharp
// GetUserStats - no authorization check beyond authentication
var stats = await _userService.GetUserStatsAsync(id);
return Ok(ApiResponse<UserStatsResponse>.SuccessResponse(stats));
```

**Suggestion:** Add authorization checks:
1. Check if the target user's profile is public, OR
2. Check if the requesting user is friends with the target user, OR
3. Rely on Supabase RLS (but document this clearly)

---

### MINOR

#### Issue #9: Inconsistent Error Message Format

**File:** `Stepper.Api/Users/UsersController.cs`

**Description:** Error messages use different formats - some include "An error occurred:", others don't. Stack traces are exposed in some exceptions via Console.WriteLine.

**Suggestion:** Standardize error messages. Never expose stack traces in production responses.

---

#### Issue #10: Query Entity Duplication

**Files:**
- `Stepper.Api/Users/FriendshipQueryEntity.cs`
- `Stepper.Api/Users/GroupMembershipQueryEntity.cs`
- `Stepper.Api/Users/GroupQueryEntity.cs`
- `Stepper.Api/Users/StepEntryQueryEntity.cs`

**Description:** These "query entities" duplicate column mappings from their respective feature folders to avoid cross-feature dependencies. While architecturally sound, this creates maintenance burden when schemas change.

**Suggestion:** Document the pattern clearly. Consider if a shared "read model" folder in Common would be more maintainable, or add comments linking to the canonical entity definitions.

---

#### Issue #11: TODO Comment for Missing Privacy Field

**File:** `Stepper.Mobile/src/services/api/usersApi.ts`
**Line:** 203

**Description:** A TODO indicates missing functionality.

**Evidence:**
```typescript
is_private: false, // TODO: Backend doesn't provide this yet
```

**Suggestion:** Create a ticket/plan to implement privacy settings in the backend profile endpoint.

---

#### Issue #12: N+1 Query Potential in GetUserGroups

**File:** `Stepper.Api/Groups/GroupRepository.cs`
**Lines:** 92-96

**Description:** The code fetches member counts in a loop, which could cause N+1 queries.

**Evidence:**
```csharp
foreach (var groupId in groupIds)
{
    memberCounts[groupId] = await GetMemberCountAsync(groupId);
}
```

**Suggestion:** This was noted in existing code, but the pattern was replicated. Consider batch fetching member counts with a single query using GROUP BY.

---

#### Issue #13: AutoConnectRealtime Changed to False

**File:** `Stepper.Api/Common/Database/SupabaseClientFactory.cs`
**Line:** 31

**Description:** `AutoConnectRealtime` was changed from `true` to `false` without clear documentation of why.

**Suggestion:** Add a comment explaining the reason for this change.

---

#### Issue #14: Missing Tests for OAuth Token Type Handling

**File:** Various

**Description:** While `SupabaseAuthHandlerTests.cs` exists and tests HS256 token validation, there are no integration tests for:
- JWKS-based OAuth token validation
- The token type differentiation logic in the mobile client

**Suggestion:** Add integration tests for JWKS validation. The mobile client tests for OAuth handling exist but could be more comprehensive.

---

#### Issue #15: Test Timing Threshold Increased

**File:** `Stepper.Mobile/src/services/__tests__/tokenStorage.test.ts`
**Line:** 226 (approximately)

**Description:** The timing threshold for parallel operations was increased from 25ms to 100ms, suggesting flaky tests.

**Evidence:**
```typescript
// Was: expect(endTime - startTime).toBeLessThan(25);
expect(endTime - startTime).toBeLessThan(100);
```

**Suggestion:** Investigate root cause of flakiness. Consider removing timing assertions from unit tests as they are non-deterministic.

---

## Code Smells Detected

1. **Debug statements everywhere** - 28 total debug logging statements added across backend and mobile
2. **Dead code** - SupabaseAuthMiddleware is obsolete and duplicates functionality
3. **Magic strings** - "accepted" status string not centralized
4. **Missing null checks** - Profile could be null in controller
5. **Silent failures** - OAuth expiry doesn't notify user

---

## Positive Observations

1. **Good test coverage** - New auth handler has comprehensive unit tests
2. **Proper separation of concerns** - Query entities avoid cross-feature dependencies
3. **Security awareness** - OAuth redirect URL validation present
4. **Documentation** - API_REFERENCE.md and ARCHITECTURE.md were updated
5. **Proper ASP.NET Core auth integration** - Using AuthenticationHandler instead of custom middleware
6. **Enum serialization fixed** - JsonStringEnumConverter added to Group DTOs

---

## Recommendation

**Status**: REVISE

**Rationale**: The 3 BLOCKER issues (debug statements and null reference warning) must be addressed before merge. The MAJOR issues should also be addressed, particularly the missing authorization checks on user stats endpoints.

**Next Steps**:
- [ ] Remove all 17 `Console.WriteLine` statements from backend code
- [ ] Remove all 11 `console.log` statements from mobile code
- [ ] Fix null reference warning in UsersController line 46
- [ ] Add authorization checks to user stats/activity endpoints (or document RLS protection)
- [ ] Consider deleting obsolete SupabaseAuthMiddleware
- [ ] Extract magic string "accepted" to a constant
- [ ] Address the silent OAuth session expiry UX issue

---

> **USER ACCEPTANCE REQUIRED**: Before proceeding, the user must review and approve this assessment.

---

## Files Changed Summary

| Category | Files | Changes |
|----------|-------|---------|
| Authentication | 3 | New JWKS-based auth handler, deprecated middleware |
| User Features | 10 | New endpoints, DTOs, query entities |
| Mobile Auth | 4 | OAuth token handling, session restore |
| Mobile API | 6 | Migrated from Supabase to backend API |
| Tests | 3 | Auth handler tests, updated API tests |
| Documentation | 4 | API reference, architecture docs, diagrams |

---

## Detailed File Analysis

### Authentication (CRITICAL)

| File | Assessment |
|------|------------|
| `SupabaseAuthHandler.cs` | **NEEDS WORK** - Core logic correct, but 7 debug statements must be removed |
| `SupabaseAuthMiddleware.cs` | **DEPRECATED** - Consider deletion |
| `Program.cs` | **OK** - Properly configured auth handler |
| `SupabaseAuthDefaults.cs` | **OK** - Clean constant definition |

### Mobile Token Handling

| File | Assessment |
|------|------------|
| `tokenStorage.ts` | **NEEDS WORK** - 4 debug statements to remove |
| `client.ts` | **NEEDS WORK** - 2 debug statements, silent OAuth expiry |
| `authStore.ts` | **NEEDS WORK** - 1 debug statement to remove |
| `LoginScreen.tsx` | **NEEDS WORK** - 3 debug statements to remove |

### Backend Features

| File | Assessment |
|------|------------|
| `UserRepository.cs` | **MINOR** - Magic string "accepted" |
| `UserService.cs` | **OK** - Clean business logic |
| `UsersController.cs` | **NEEDS WORK** - 6 debug statements, null reference warning, missing authorization |
| `GroupRepository.cs` | **OK** - LINQ Contains() fix correct |
| `UserEntity.cs` | **OK** - JSONB deserialization robust |
| Group DTOs | **OK** - Enum serialization fixed |

### Tests

| File | Assessment |
|------|------------|
| `SupabaseAuthHandlerTests.cs` | **OK** - Good coverage for HS256 |
| Token storage tests | **OK** - Updated for new functionality |
| API tests | **OK** - Updated endpoints |
