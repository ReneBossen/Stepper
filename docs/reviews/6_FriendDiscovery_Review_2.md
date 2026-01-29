# Code Review: Friend Discovery

**Plan**: `docs/plans/6_FriendDiscovery.md`
**Iteration**: 2
**Date**: 2026-01-17

## Summary

All CRITICAL SECURITY BLOCKERS from the previous review have been successfully fixed. The overly permissive RLS policy has been removed, proper authorization checks using `auth.uid()` have been added to all SECURITY DEFINER functions, and the race condition in invite code usage tracking has been resolved with atomic database operations. The nested class has been extracted to its own file, magic strings have been centralized to a constants class, and unused code has been removed. The implementation now fully complies with the coding standards, architectural guidelines, and security best practices. All 486 tests pass with 100% success rate. The feature is ready for merge.

## Issue Resolution Summary

### BLOCKER Issues - ALL RESOLVED

#### Issue #1: Overly Permissive RLS Policy on invite_codes Table
**Status**: FIXED ✓
**File**: `/mnt/c/Users/rene_/source/repos/Stepper/docs/migrations/009_create_invite_codes_table.sql`

**Resolution**: The overly permissive policy "Anyone can read invite codes for validation" has been completely removed. Only proper role-based policies remain:
- Line 37-39: Users can view their own invite codes
- Line 42-44: Users can insert their own invite codes
- Line 47-50: Users can update their own invite codes
- Line 53-55: Users can delete their own invite codes

**Comment added** (lines 57-60): Documents the design decision that RLS policies alone are insufficient for security; the `validate_invite_code` SECURITY DEFINER function is the ONLY way to validate codes, ensuring users cannot enumerate all codes.

#### Issue #2: SECURITY DEFINER Functions Without Proper Authorization Checks
**Status**: FIXED ✓
**File**: `/mnt/c/Users/rene_/source/repos/Stepper/docs/migrations/010_create_discovery_functions.sql`

**Resolution**: All three SECURITY DEFINER functions now include proper authorization checks:

1. **search_users function** (lines 27-30):
   ```sql
   IF requesting_user_id != auth.uid() THEN
       RAISE EXCEPTION 'Unauthorized: requesting_user_id must match authenticated user';
   END IF;
   ```
   Prevents users from searching on behalf of other users.

2. **get_user_by_qr_code function** (lines 71-74):
   ```sql
   IF auth.uid() IS NULL THEN
       RAISE EXCEPTION 'Unauthorized: user must be authenticated';
   END IF;
   ```
   Ensures only authenticated users can lookup other users by QR code.

3. **validate_invite_code function** (lines 97-100):
   ```sql
   IF auth.uid() IS NULL THEN
       RAISE EXCEPTION 'Unauthorized: user must be authenticated';
   END IF;
   ```
   Ensures only authenticated users can validate and redeem invite codes.

#### Issue #3: Race Condition in Invite Code Usage Tracking
**Status**: FIXED ✓
**File**: `/mnt/c/Users/rene_/source/repos/Stepper/docs/migrations/010_create_discovery_functions.sql`

**Resolution**: The race condition has been eliminated using atomic database-level UPDATE with WHERE clause in the `validate_invite_code` function (lines 120-125):

```sql
UPDATE invite_codes
SET usage_count = usage_count + 1
WHERE code = code_to_validate
  AND (max_usages IS NULL OR usage_count < max_usages)
RETURNING invite_codes.user_id INTO validated_user_id;
```

This atomic operation ensures:
- The usage count is incremented and the limit check happen in a single database transaction
- No two concurrent requests can both pass the limit check
- The operation is guaranteed to be thread-safe

Additionally, the unused `IncrementUsageAsync` method has been removed from `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Friends/Discovery/InviteCodeRepository.cs`, which eliminates the application-level race condition that previously existed.

### MAJOR Issues - ALL RESOLVED

#### Issue #4: Nested Class Violates One-Class-Per-File Rule
**Status**: FIXED ✓
**File**: `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Friends/Discovery/InviteCodeValidationResult.cs`

**Resolution**: The `InviteCodeValidationResult` nested class has been extracted to its own file with proper XML documentation:

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

The class is properly used in `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Friends/Discovery/FriendDiscoveryService.cs` (line 217) for deserializing database function results.

#### Issue #5: Magic Strings for Deep Link URLs
**Status**: FIXED ✓
**File**: `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Friends/Discovery/DiscoveryConstants.cs`

**Resolution**: The deep link URL scheme has been extracted to a dedicated constants class:

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

The constant is properly used in the service:
- Line 89 of `FriendDiscoveryService.cs`: `var deepLink = $"{DiscoveryConstants.InviteDeepLinkScheme}{user.QrCodeId}";`
- Line 184 of `FriendDiscoveryService.cs`: `var deepLink = $"{DiscoveryConstants.InviteDeepLinkScheme}{code}";`

### MINOR Issues - ALL RESOLVED

#### Issue #6: Repository IncrementUsageAsync Method Removed
**Status**: FIXED ✓
**Files**:
- `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Friends/Discovery/IInviteCodeRepository.cs`
- `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Friends/Discovery/InviteCodeRepository.cs`

**Resolution**: The unused `IncrementUsageAsync` method has been completely removed from both the interface and implementation. The database function now handles all usage tracking atomically, eliminating the dead code and the associated race condition risk.

Current `IInviteCodeRepository` interface (verified):
- CreateAsync - creates invite codes
- GetByCodeAsync - retrieves code by string
- GetByUserIdAsync - retrieves user's codes
- UpdateAsync - updates existing code
- DeleteAsync - deletes a code

#### Issue #7: Missing XML Documentation on QrCodeId Property
**Status**: FIXED ✓
**File**: `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Users/User.cs`

**Resolution**: XML documentation has been added (lines 11-13):

```csharp
/// <summary>
/// Unique cryptographically random identifier used for QR code generation in friend discovery.
/// </summary>
public string QrCodeId { get; set; } = string.Empty;
```

#### Issue #8: Performance Note for search_users Function
**Status**: DOCUMENTED ✓
**File**: `/mnt/c/Users/rene_/source/repos/Stepper/docs/migrations/010_create_discovery_functions.sql`

**Resolution**: A performance comment has been added to the function (lines 55-57):

```sql
-- Performance Note: Similarity scoring requires computing trigram similarity for all matching rows.
-- The LIMIT 50 helps constrain this, but with a large user base, consider adding a minimum
-- similarity threshold in the WHERE clause or implementing pagination for better performance.
```

This documents the known performance consideration for future optimization efforts.

## Verification Summary

### Database Migrations
- [x] Overly permissive RLS policy removed from `009_create_invite_codes_table.sql`
- [x] Authorization checks added to all SECURITY DEFINER functions in `010_create_discovery_functions.sql`
- [x] Race condition fixed with atomic UPDATE...RETURNING in `validate_invite_code`
- [x] Performance note added to `search_users` function
- [x] All comments and documentation properly formatted

### C# Code Quality
- [x] InviteCodeValidationResult extracted to own file (`/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Friends/Discovery/InviteCodeValidationResult.cs`)
- [x] DiscoveryConstants created for deep link scheme (`/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Friends/Discovery/DiscoveryConstants.cs`)
- [x] IncrementUsageAsync removed from repository interface and implementation
- [x] XML documentation added to User.QrCodeId property
- [x] All magic strings eliminated from FriendDiscoveryService
- [x] Proper dependency injection maintained
- [x] No nested classes present

### Architecture Compliance
- [x] Dependency direction preserved (Controller → Service → Repository → Supabase)
- [x] No business logic in controllers
- [x] Feature slices independent and loosely coupled
- [x] Common folder contains only shared infrastructure
- [x] Screaming Architecture principles respected

### Testing
- [x] All 486 tests pass (100% success rate)
- [x] 78 new tests specifically for Friend Discovery feature:
  - 8 domain model tests
  - 12 repository tests
  - 27 service tests
  - 31 controller tests
- [x] Tests are deterministic and deterministic
- [x] Proper mocking and AAA pattern used

### Security Analysis
**Previous Concerns**: All resolved with proper authorization and atomic operations
- [x] No overly permissive RLS policies
- [x] Authorization checks in all SECURITY DEFINER functions
- [x] No race conditions in usage tracking
- [x] Cryptographically secure random number generation
- [x] URL-safe base64 encoding
- [x] Proper authentication checks in controllers

## Checklist Results

- [x] Dependency direction preserved (Controller → Service → Repository → Supabase)
- [x] No business logic in controllers (controllers are thin HTTP adapters)
- [x] Feature slices are independent and loosely coupled
- [x] Common folder contains only shared infrastructure
- [x] Screaming Architecture principles respected
- [x] RLS policies secure (removed overly permissive policy)
- [x] Authorization checks in all SECURITY DEFINER functions
- [x] Race condition fixed with atomic UPDATE operation
- [x] Nested class extracted to separate file
- [x] Magic strings eliminated via constants
- [x] Proper error handling with appropriate HTTP status codes
- [x] Guard clauses present
- [x] Tests cover new functionality
- [x] Tests are deterministic
- [x] All tests pass (486 total)

## Code Quality Metrics

**Files Modified**: 4
- `/mnt/c/Users/rene_/source/repos/Stepper/docs/migrations/009_create_invite_codes_table.sql`
- `/mnt/c/Users/rene_/source/repos/Stepper/docs/migrations/010_create_discovery_functions.sql`
- `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Friends/Discovery/FriendDiscoveryService.cs`
- `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Users/User.cs`

**Files Created**: 2
- `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Friends/Discovery/DiscoveryConstants.cs`
- `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Friends/Discovery/InviteCodeValidationResult.cs`

**Files with Removed Code**: 2
- `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Friends/Discovery/IInviteCodeRepository.cs` (removed method signature)
- `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Friends/Discovery/InviteCodeRepository.cs` (removed method implementation)

## Test Results

```
Test run for /mnt/c/Users/rene_/source/repos/Stepper/tests/Stepper.UnitTests/bin/Debug/net10.0/Stepper.UnitTests.dll (.NETCoreApp,Version=v10.0)

Passed!  - Failed: 0, Passed: 486, Skipped: 0, Total: 486
Duration: 515 ms
```

## Architecture Review

### Control Flow (Clean Architecture Preserved)
```
HTTP Request
    ↓
FriendDiscoveryController (lines 23-185)
    ↓
IFriendDiscoveryService (interface)
    ↓
FriendDiscoveryService (business logic)
    ↓
IInviteCodeRepository (interface)
    ↓
InviteCodeRepository (data access)
    ↓
Supabase (database + functions)
```

### Feature Structure (Self-Contained Slice)
```
/Friends/Discovery/
├── Controllers
│   └── FriendDiscoveryController.cs
├── Services
│   ├── IFriendDiscoveryService.cs
│   └── FriendDiscoveryService.cs
├── Repositories
│   ├── IInviteCodeRepository.cs
│   └── InviteCodeRepository.cs
├── Domain Models
│   ├── InviteCode.cs
│   └── InviteCodeType.cs
├── Data Entities
│   └── InviteCodeEntity.cs
├── DTOs
│   ├── GenerateInviteLinkRequest.cs
│   ├── GenerateInviteLinkResponse.cs
│   ├── QrCodeResponse.cs
│   ├── RedeemInviteCodeRequest.cs
│   ├── SearchUsersRequest.cs
│   ├── SearchUsersResponse.cs
│   └── UserSearchResult.cs
└── Constants & Results
    ├── DiscoveryConstants.cs
    └── InviteCodeValidationResult.cs
```

## Security Assessment

**Authorization Model**:
- Client provides JWT token in HTTP Authorization header
- Token is extracted and passed to database functions
- Database functions verify `auth.uid()` matches expected caller
- SECURITY DEFINER functions execute with controlled scope

**Data Protection**:
- Invite code validation is atomic (no race conditions)
- Usage limits are enforced at database level
- Expiration times checked before validation
- User IDs and metadata not exposed via RLS

**Cryptographic Strengths**:
- `RandomNumberGenerator.GetBytes(16)` for invite code generation (128-bit entropy)
- `gen_random_bytes(8)` for QR code IDs (64-bit entropy, sufficient for non-colliding hex strings)
- URL-safe base64 encoding (no special characters requiring escaping)

## Recommendation

**Status**: APPROVE

**Rationale**:
1. All CRITICAL SECURITY BLOCKERS have been successfully resolved
2. All MAJOR code quality issues have been addressed
3. All MINOR improvements have been implemented
4. 100% of tests pass (486/486)
5. Architecture compliance fully verified
6. Security best practices implemented throughout
7. Code follows all policies and standards

The Friend Discovery feature is now ready for merge to the main branch.

## Sign-Off

**Reviewer**: Reviewer Agent
**Review Date**: 2026-01-17
**Review Type**: Iteration 2 - Fix Verification
**Approval Status**: ✓ APPROVED FOR MERGE

The implementation addresses all previously identified issues with security fixes, code quality improvements, and proper documentation. The feature meets all requirements from the plan and is production-ready.

---

> **MERGE READY**: All issues resolved. Feature approved for merge to master.
