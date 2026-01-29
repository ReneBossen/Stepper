# Code Review: Friend Discovery

**Plan**: `docs/plans/6_FriendDiscovery.md`
**Iteration**: 1
**Date**: 2026-01-17

## Summary

The Friend Discovery implementation provides user search, QR code generation, and shareable invite links functionality. The code follows clean architecture principles with proper separation of concerns across controllers, services, and repositories. The domain model includes validation logic, and the feature is well-tested with 78 new tests (8 domain tests, 12 repository tests, 27 service tests, 31 controller tests). However, there are **CRITICAL SECURITY ISSUES** with the RLS policies and database functions that must be addressed before deployment, along with several architectural and code quality concerns.

## Checklist Results

- [x] Dependency direction preserved (Controller → Service → Repository → Supabase)
- [x] No business logic in controllers (controllers are thin HTTP adapters)
- [x] Feature slices are independent and loosely coupled
- [x] Common folder contains only shared infrastructure
- [x] Screaming Architecture principles respected
- [ ] **BLOCKER**: RLS policies expose sensitive invite code data (Issue #1)
- [ ] **BLOCKER**: SECURITY DEFINER functions bypass RLS without proper authorization (Issue #2)
- [ ] **BLOCKER**: Race condition in invite code usage tracking (Issue #3)
- [ ] **MAJOR**: Nested class violates one-class-per-file rule (Issue #4)
- [ ] **MAJOR**: Magic strings for deep link URLs (Issue #5)
- [x] Proper error handling with appropriate HTTP status codes
- [x] Guard clauses present
- [x] Tests cover new functionality
- [x] Tests are deterministic
- [x] All tests pass (487 total, 78 new)

## Issues

### BLOCKER

#### Issue #1: Overly Permissive RLS Policy on invite_codes Table
**File**: `docs/migrations/009_create_invite_codes_table.sql`
**Line**: 59-61
**Description**: The RLS policy "Anyone can read invite codes for validation" allows ANY authenticated user to read ALL invite codes using `USING (true)`. This exposes:
- User IDs of code creators (privacy leak)
- Expiration times (allows users to know when to retry)
- Usage counts (reveals popularity/activity patterns)
- Creation timestamps (metadata leak)

This violates the principle of least privilege and exposes sensitive information that could be used to enumerate users or plan attacks.

**Suggestion**: Remove this overly permissive policy entirely. The `validate_invite_code` function uses `SECURITY DEFINER` which already bypasses RLS, so this policy is unnecessary and creates a security vulnerability. The function should be the ONLY way to validate codes, not a public SELECT policy.

```sql
-- REMOVE THIS POLICY:
-- CREATE POLICY "Anyone can read invite codes for validation"
--     ON invite_codes FOR SELECT
--     USING (true);
```

#### Issue #2: SECURITY DEFINER Functions Without Proper Authorization Checks
**File**: `docs/migrations/010_create_discovery_functions.sql`
**Line**: 51, 69, 114
**Description**: All three database functions (`search_users`, `get_user_by_qr_code`, `validate_invite_code`) use `SECURITY DEFINER`, which executes them with the privileges of the function owner (typically the superuser), bypassing Row-Level Security. While this is necessary for cross-user queries, it creates security risks:

1. `search_users`: Correctly checks that `u.id != requesting_user_id` but does not validate that `requesting_user_id` matches `auth.uid()` - a malicious user could search on behalf of another user.

2. `get_user_by_qr_code`: No authorization check at all - any authenticated user can lookup ANY user by QR code without restriction.

3. `validate_invite_code`: Increments usage count without checking if the requesting user has permission, enabling potential abuse.

**Suggestion**: Add authorization checks to ensure `auth.uid()` matches the expected caller:

```sql
-- For search_users, add at the beginning of the function:
IF requesting_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: requesting_user_id must match authenticated user';
END IF;

-- For get_user_by_qr_code, add:
IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user must be authenticated';
END IF;

-- For validate_invite_code, add:
IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user must be authenticated';
END IF;
```

#### Issue #3: Race Condition in Invite Code Usage Tracking
**File**: `docs/migrations/010_create_discovery_functions.sql`
**Line**: 100-109
**File**: `Stepper.Api/Friends/Discovery/InviteCodeRepository.cs`
**Line**: 104-116

**Description**: Both the database function and repository method have a race condition in usage tracking:

**Database function**: The sequence is:
1. Read `usage_count` (line 84-86)
2. Check if `usage_count >= max_usages` (line 101)
3. Increment `usage_count` (line 107-109)

Between steps 2 and 3, another concurrent request could also pass the check, allowing more usages than `max_usages` permits.

**Repository method**: The sequence is:
1. `GetByCodeAsync` reads the invite code (line 108)
2. Increment in memory (line 114)
3. `UpdateAsync` writes back (line 115)

This is a classic read-modify-write race condition. Two concurrent requests could both read `usage_count = 4`, both pass the `max_usages = 5` check, both increment to 5, both write, resulting in 6 total usages.

**Suggestion**: Use database-level atomic operations:

```sql
-- In validate_invite_code function, replace the UPDATE with:
UPDATE invite_codes
SET usage_count = usage_count + 1
WHERE code = code_to_validate
  AND (max_usages IS NULL OR usage_count < max_usages)
RETURNING user_id INTO invite_record.user_id;

IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Invite code has reached maximum usage limit';
    RETURN;
END IF;
```

For the repository, remove the `IncrementUsageAsync` method entirely and rely solely on the database function's atomic increment.

### MAJOR

#### Issue #4: Nested Class Violates One-Class-Per-File Rule
**File**: `Stepper.Api/Friends/Discovery/FriendDiscoveryService.cs`
**Line**: 272-277
**Description**: The `InviteCodeValidationResult` class is defined as a private nested class inside `FriendDiscoveryService`. This violates the coding standard "No nested classes" (`.claude/policies/coding-standards.md` line 42) and the "One class per file" rule (line 48).

**Suggestion**: Extract `InviteCodeValidationResult` to its own file:

**New file**: `Stepper.Api/Friends/Discovery/InviteCodeValidationResult.cs`
```csharp
namespace Stepper.Api.Friends.Discovery;

/// <summary>
/// Internal class for deserializing the validate_invite_code function result.
/// </summary>
internal class InviteCodeValidationResult
{
    public bool Valid { get; set; }
    public Guid UserId { get; set; }
    public string? ErrorMessage { get; set; }
}
```

Update `FriendDiscoveryService.cs` to remove the nested class definition.

#### Issue #5: Magic Strings for Deep Link URLs
**File**: `Stepper.Api/Friends/Discovery/FriendDiscoveryService.cs`
**Line**: 89, 184
**Description**: The deep link URL scheme `"Stepper://invite/"` is hardcoded as a magic string in two places. This violates the coding standard "No magic strings; use constants or strongly typed identifiers" (`.claude/policies/coding-standards.md` line 35). If the deep link scheme changes, it must be updated in multiple locations.

**Suggestion**: Extract to a constant in a configuration class:

**New file**: `Stepper.Api/Friends/Discovery/DiscoveryConstants.cs`
```csharp
namespace Stepper.Api.Friends.Discovery;

/// <summary>
/// Constants for friend discovery feature.
/// </summary>
internal static class DiscoveryConstants
{
    /// <summary>
    /// Deep link URL scheme for invite codes.
    /// </summary>
    public const string InviteDeepLinkScheme = "Stepper://invite/";
}
```

Then update `FriendDiscoveryService.cs`:
```csharp
// Line 89
var deepLink = $"{DiscoveryConstants.InviteDeepLinkScheme}{user.QrCodeId}";

// Line 184
var deepLink = $"{DiscoveryConstants.InviteDeepLinkScheme}{code}";
```

Alternatively, consider making this configurable via `appsettings.json` to support different environments (dev, staging, production) or white-label scenarios.

### MINOR

#### Issue #6: Repository IncrementUsageAsync Method Should Be Removed
**File**: `Stepper.Api/Friends/Discovery/InviteCodeRepository.cs`
**Line**: 104-116
**File**: `Stepper.Api/Friends/Discovery/IInviteCodeRepository.cs`
**Line**: 42-46

**Description**: The `IncrementUsageAsync` method is not used anywhere in the codebase (the service uses the database function for validation which handles incrementing atomically). This method also has the race condition mentioned in Issue #3. Dead code should be removed to reduce maintenance burden.

**Suggestion**: Remove the method from both the interface and implementation:
- Delete lines 42-46 from `IInviteCodeRepository.cs`
- Delete lines 104-116 from `InviteCodeRepository.cs`

#### Issue #7: Missing XML Documentation on QrCodeId Property
**File**: `Stepper.Api/Users/User.cs`
**Line**: 10
**Description**: The `QrCodeId` property lacks XML documentation comments. The coding standard states "Public APIs must have XML documentation" (`.claude/policies/coding-standards.md` line 44). While this is a public property on a domain model, it should have documentation explaining its purpose.

**Suggestion**: Add XML documentation:
```csharp
/// <summary>
/// Unique cryptographically random identifier used for QR code generation in friend discovery.
/// </summary>
public string QrCodeId { get; set; } = string.Empty;
```

#### Issue #8: Potential Performance Issue in search_users Function
**File**: `docs/migrations/010_create_discovery_functions.sql`
**Line**: 46-48
**Description**: The `ORDER BY similarity(u.display_name, search_query) DESC` requires computing the trigram similarity for every matching row before ordering. For large user bases, this could be expensive. The `LIMIT 50` helps, but the similarity calculation still happens for all matches.

**Suggestion**: This is acceptable for now given the 50-row limit, but consider adding monitoring for query performance. If search becomes slow with a large user base, consider:
1. Pre-computing similarity scores
2. Using materialized views
3. Implementing pagination with offset/limit
4. Adding a minimum similarity threshold in the WHERE clause

Document this as a known performance consideration for future optimization.

## Code Smells Detected

1. **Duplicate authentication logic** (`FriendDiscoveryService.cs` line 242-256, `InviteCodeRepository.cs` line 118-132): The `GetAuthenticatedClientAsync` method is duplicated across services and repositories. Consider extracting to a base class or helper in `Common/Database/`.

2. **Unused Type field in InviteCodeType enum**: QR codes don't create invite_codes records (they use the user's qr_code_id directly), so only ShareLink type is stored in the database. The QrCode enum value might be confusing. Consider documenting this distinction or renaming the enum to `ShareLinkType` if QR codes don't actually use it.

3. **SearchUsersRequest DTO is not used**: The controller receives the query as a query string parameter directly, not as a DTO. Either use the DTO or remove it to avoid confusion.

## Security Analysis

### Strengths
- Cryptographically secure random number generation for codes (`RandomNumberGenerator.GetBytes(16)`)
- URL-safe base64 encoding for invite codes
- QR code IDs use `gen_random_bytes(8)` for sufficient entropy (16 hex characters)
- Proper authentication checks in controllers
- Expiration and usage limit support
- Database cascade deletion ensures cleanup when users are deleted

### Weaknesses (Beyond BLOCKERs)
- No rate limiting on invite link generation (users could spam-create links)
- No rate limiting on search (could be used for user enumeration)
- No audit trail for who redeemed which codes
- Database functions don't log security-relevant events
- No mechanism to revoke or invalidate QR codes (they're permanent)

### Recommendations
1. Add rate limiting middleware for discovery endpoints (especially search and link generation)
2. Consider adding an audit log table for redemptions
3. Add application-level logging for security events (failed validations, enumeration attempts)
4. Consider allowing users to regenerate their QR code ID in case of compromise

## Test Coverage Analysis

**Coverage**: Excellent (78 new tests across 4 test files)

**Strengths**:
- Domain model validation thoroughly tested (8 tests for `InviteCode.IsValid()`)
- Repository tests cover CRUD operations and error cases (12 tests)
- Service tests cover business logic, validation, and error handling (27 tests)
- Controller tests validate HTTP endpoints, status codes, and authorization (31 tests)
- Tests use proper mocking and AAA pattern
- Tests are deterministic (no timing dependencies)

**Gaps** (not blockers, but noted):
- No integration tests for database functions (`search_users`, `get_user_by_qr_code`, `validate_invite_code`)
- No tests for concurrent redemption of invite codes (race condition)
- No tests for QR code image generation (QRCoder library usage)
- No tests for base64 encoding correctness of QR images

## Architecture Compliance

**Compliant**:
- Clean dependency direction: Controller → Service → Repository → Supabase
- Controllers contain only HTTP endpoint logic (lines 23-185 in `FriendDiscoveryController.cs`)
- Service contains all business logic (validation, QR generation, code generation)
- Repository handles only data access via Supabase
- Feature slice is self-contained in `Friends/Discovery/` folder
- Proper entity separation pattern (InviteCode domain model, InviteCodeEntity for Supabase)
- Explicit dependency injection
- No static state or hidden dependencies

**Non-Compliant**:
- Nested class violates structure rules (Issue #4)
- Magic strings violate coding standards (Issue #5)

## Database Migration Quality

**Strengths**:
- Migrations are well-documented with execution instructions
- Proper use of constraints (UNIQUE, NOT NULL, CHECK)
- Appropriate indexes on frequently queried columns
- RLS enabled on invite_codes table
- Good use of PostgreSQL features (pg_trgm extension, trigram indexes)
- Comments added to tables, columns, indexes, and functions

**Weaknesses**:
- Security issues in RLS policies (Issue #1)
- Missing authorization in SECURITY DEFINER functions (Issue #2)
- Race condition in usage tracking (Issue #3)

## Plan Adherence

**Implemented as planned**:
- [x] User search by display name with trigram matching
- [x] QR code generation with QRCoder library
- [x] Invite link generation with expiration and usage limits
- [x] Deep link URL format: `Stepper://invite/{code}`
- [x] 5 REST API endpoints
- [x] Database migrations (4 files: 007, 008, 009, 010)
- [x] RLS policies on invite_codes table
- [x] Database functions for search, QR lookup, and validation
- [x] User model updated with QrCodeId property
- [x] Services registered in DI container

**Deviations**:
- None. Implementation follows the plan accurately.

**Out of Scope**:
- Privacy settings (noted in plan as "Plan 8")
- Rate limiting (not in plan, but recommended)
- Audit logging (not in plan, but recommended)

## Dependencies

**New Dependency**: QRCoder v1.7.0
- **Justification**: Required for QR code generation (per plan)
- **Status**: Appropriate choice, widely used, MIT licensed
- **Concern**: None. Version 1.7.0 is recent and stable.

## Recommendation

**Status**: REVISE

**Severity**: CRITICAL - Security issues prevent deployment

**Next Steps**:
- [ ] **BLOCKER #1**: Remove overly permissive RLS policy "Anyone can read invite codes for validation"
- [ ] **BLOCKER #2**: Add `auth.uid()` authorization checks to all SECURITY DEFINER functions
- [ ] **BLOCKER #3**: Fix race condition in `validate_invite_code` function using atomic UPDATE with WHERE clause
- [ ] **BLOCKER #3**: Remove `IncrementUsageAsync` method from repository (relies on database function)
- [ ] **MAJOR #4**: Extract `InviteCodeValidationResult` nested class to its own file
- [ ] **MAJOR #5**: Extract deep link URL scheme to a constant (or configuration)
- [ ] **MINOR #6**: Remove unused `IncrementUsageAsync` method
- [ ] **MINOR #7**: Add XML documentation to `User.QrCodeId` property
- [ ] **MINOR #8**: Document performance considerations for `search_users` function
- [ ] Re-run all tests after fixes
- [ ] Consider adding integration tests for database functions
- [ ] Consider adding rate limiting to discovery endpoints (future enhancement)

**Estimated effort**: 2-3 hours for blocker fixes, 1 hour for major issues, 30 minutes for minor issues

---

> **USER ACCEPTANCE REQUIRED**: Before proceeding with revisions, the user must review and approve this assessment. Please confirm:
> 1. Agreement with the identified security blockers
> 2. Priority of issues (security first, then code quality)
> 3. Any additional concerns or requirements
> 4. Approval to proceed with fixes
