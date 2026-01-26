# Backend Cleanup Report

**Date**: 2026-01-25
**Performed by**: Backend Engineer Agent

---

## Summary

This report documents the comprehensive cleanup of the WalkingApp.Api backend codebase. The cleanup focused on identifying and removing unused code, checking for consistency, and documenting questionable items that require user decision.

---

## Files Modified

| File | Change |
|------|--------|
| `WalkingApp.Api/Friends/IFriendRepository.cs` | Removed unused `BlockUserAsync` method declaration |
| `WalkingApp.Api/Friends/FriendRepository.cs` | Removed unused `BlockUserAsync` method implementation |

## Files Deleted

| File | Reason |
|------|--------|
| `WalkingApp.Api/Friends/Discovery/DTOs/SearchUsersRequest.cs` | Unused DTO - controller uses `[FromQuery] string query` instead |

---

## Things Removed

### 1. BlockUserAsync Method (Unused)

**Location**:
- `WalkingApp.Api/Friends/IFriendRepository.cs` (interface declaration)
- `WalkingApp.Api/Friends/FriendRepository.cs` (implementation)

**Reason**: This method was defined in the repository interface and implemented, but was never used by any service or controller. The blocking functionality was never exposed through the API endpoints.

**Lines removed**: ~55 lines of code

### 2. SearchUsersRequest DTO (Unused)

**Location**: `WalkingApp.Api/Friends/Discovery/DTOs/SearchUsersRequest.cs`

**Reason**: The `FriendDiscoveryController.SearchUsers` method takes the search query directly as a `[FromQuery] string query` parameter, so this request DTO class was never used.

---

## Items Requiring User Decision

### 1. Preferences Redundancy (CRITICAL)

**Issue**: There are TWO places where user preferences are stored:

1. **`UserEntity.PreferencesJson`** (in `Users/UserEntity.cs`)
   - Column: `preferences` (JSONB)
   - Table: `users`
   - Contains: `dailyStepGoal`, `notificationsEnabled`, `reminderTime`
   - Used by: `UserRepository`, `UserService`

2. **`UserPreferencesEntity`** (in `Steps/UserPreferencesEntity.cs`)
   - Column: `daily_step_goal`
   - Table: `user_preferences`
   - Contains: `DailyStepGoal` only
   - Used by: `StepRepository` for getting user's step goal

**Question for User**:
- Which is the source of truth for user preferences?
- Should we keep preferences in the `users.preferences` JSONB column only and remove the `user_preferences` table?
- Or should we migrate to a fully normalized `user_preferences` table and remove the `preferences` column from users?

**Recommendation**: The current implementation has potential data inconsistency risks. A single source of truth should be established.

---

## Consistency Check Results

### Controllers

All controllers follow consistent patterns:
- Use `[ApiController]` attribute
- Use `[Authorize]` attribute
- Use `[Route("api/v1/{feature}")]` pattern
- Extract user ID via `User.GetUserId()` extension
- Return `ApiResponse<T>` wrapper
- Handle exceptions consistently with appropriate HTTP status codes

### Services

All services follow consistent patterns:
- Constructor injection with `ArgumentNullException.ThrowIfNull()` guards
- Guard clauses for parameter validation
- Async/await pattern throughout
- XML documentation on public methods
- Interfaces defined for all services

### Repositories

All repositories follow consistent patterns:
- Constructor injection with `ArgumentNullException.ThrowIfNull()` guards
- Use `GetAuthenticatedClientAsync()` helper method
- Consistent entity to domain model mapping
- Proper exception handling

---

## Code Quality Assessment

### Positive Findings

1. **No TODO/FIXME comments** - The codebase is clean of technical debt markers
2. **No debug code** - No `#if DEBUG` pragmas or console logging
3. **No commented-out code blocks** - All code is active
4. **No deprecated/obsolete markers** - No `[Obsolete]` attributes
5. **Proper authentication** - JWKS-based auth is properly implemented in `SupabaseAuthHandler`
6. **Proper exception handling** - Global exception middleware is in place

### Minor Observations

1. **FriendshipStatusStrings** is defined in `Common/Constants/` but only used in `UserRepository`. Consider moving to `Friends/` folder if not used elsewhere in the future.

2. **Magic strings in repositories** - Some status strings like `"pending"`, `"accepted"`, `"rejected"`, `"blocked"` are used directly instead of using `FriendshipStatusStrings` constants. This is inconsistent (e.g., `FriendRepository` uses strings directly while `UserRepository` uses the constants).

---

## Verification

- [x] Solution builds without errors
- [x] No compiler warnings
- [x] Build passed after all changes

---

## Recommendations for Future Cleanup

1. **Standardize status string usage** - Either use `FriendshipStatusStrings` constants everywhere or remove them entirely

2. **Resolve preferences redundancy** - User decision required (see above)

3. **Consider adding BlockUser feature** - The repository implementation was removed, but if blocking is a planned feature, it should be re-implemented through the proper service layer when needed

---

## Next Steps

1. User should decide on the preferences storage question
2. If any changes are needed for preferences, a Database Handoff should be created
3. Consider creating a plan for standardizing magic strings if desired
