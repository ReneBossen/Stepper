# Code Review: Groups Feature

**Plan**: `docs/plans/5_Groups.md`
**Iteration**: 1
**Date**: 2026-01-17
**Reviewer**: Claude Code (Reviewer Agent)

## Summary

The Groups feature implementation is substantially complete and demonstrates strong adherence to clean architecture principles. The implementation includes comprehensive domain models, a well-structured service layer with proper business logic encapsulation, robust repository pattern implementation, and a clean controller layer. The feature includes 110 tests (69 service tests, 19 repository tests, 22 controller tests) all passing successfully with 409 total tests across the entire solution. Security is primarily handled through Supabase RLS policies with proper authentication checks in the repository layer. However, there are **three BLOCKER issues** related to code organization policy violations and **two MAJOR performance concerns** that must be addressed before approval.

## Checklist Results

### Architecture Compliance
- [x] Dependency direction preserved (Controller → Service → Repository → Supabase)
- [x] No business logic in controllers (controllers are thin HTTP adapters)
- [x] Feature slices are independent and loosely coupled
- [x] Common folder contains only shared infrastructure
- [x] Screaming Architecture principles respected

### Code Quality
- [x] Follows coding standards (mostly)
- [ ] **No code smells** (BLOCKER #1, #2 - N+1 queries detected)
- [x] Proper error handling
- [x] No magic strings (constants defined)
- [x] Guard clauses present

### Plan Adherence
- [ ] **All plan items implemented** (BLOCKER #3 - CompetitionPeriod.cs missing)
- [x] No unplanned changes
- [x] No scope creep

### Testing
- [x] Tests cover new functionality
- [x] Tests are deterministic
- [x] All tests pass (110 Groups tests, 409 total)

### One Class Per File Rule
- [ ] **VIOLATED** (BLOCKER #4 - nested class found)

## Issues

### BLOCKER

#### Issue #1: N+1 Query Problem in GroupRepository.GetUserGroupsAsync
**File**: `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Groups/GroupRepository.cs`
**Lines**: 69-91

**Description**: The `GetUserGroupsAsync` method performs a separate database query for each group membership in a loop. If a user is a member of 10 groups, this results in 11 database queries (1 for memberships + 10 for individual groups).

```csharp
foreach (var membership in memberships.Models)
{
    var group = await GetByIdAsync(membership.GroupId);  // N+1 query
    if (group != null)
    {
        result.Add((group, membership.ToGroupMembership().Role));
    }
}
```

**Suggestion**: Refactor to use a single query with JOIN or use Supabase's batch query capabilities:
```csharp
// Option 1: Single query with filter
var groupIds = memberships.Models.Select(m => m.GroupId).ToList();
var groups = await client
    .From<GroupEntity>()
    .Where(x => groupIds.Contains(x.Id))
    .Get();

// Then match in-memory
```

#### Issue #2: N+1 Query Problem in GroupService.GetMembersAsync
**File**: `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Groups/GroupService.cs`
**Lines**: 472-489

**Description**: The `GetMembersAsync` method queries the user repository once per member in a loop. For a group with 50 members, this results in 51 database queries.

```csharp
foreach (var m in memberships)
{
    var user = await _userRepository.GetByIdAsync(m.UserId);  // N+1 query
    if (user != null)
    {
        responses.Add(new GroupMemberResponse { ... });
    }
}
```

**Suggestion**: The leaderboard function already demonstrates the correct pattern by using a database function with JOINs. Consider:
1. Add a `GetMemberDetailsAsync(Guid groupId)` method to the repository that uses a database function or JOIN
2. Or add `GetUsersByIdsAsync(List<Guid> userIds)` to IUserRepository for batch fetching

#### Issue #3: Missing CompetitionPeriod Domain Model
**File**: Expected at `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Groups/CompetitionPeriod.cs`
**Status**: Not found

**Description**: Plan 5 specifies `CompetitionPeriod` as a domain model in the "Proposed Types" table (line 23), but this class was not implemented. The functionality is embedded in `GroupService.CalculateCompetitionPeriod()` method instead.

**Suggestion**: Either:
1. Create the `CompetitionPeriod` domain model as specified in the plan
2. OR update the plan to reflect that period calculation is handled by a private method rather than a separate domain model

Since the current implementation works well and period calculation is internal logic, Option 2 is recommended, but this requires explicit plan amendment approval.

#### Issue #4: Nested Class Violates "One Class Per File" Policy
**File**: `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Groups/GroupRepository.cs`
**Line**: 319

**Description**: A private nested class `LeaderboardEntryResult` is defined inside `GroupRepository`, violating the coding standards policy that states "No nested classes" (coding-standards.md line 42).

```csharp
private class LeaderboardEntryResult
{
    public long Rank { get; set; }
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public long TotalSteps { get; set; }
    public double TotalDistanceMeters { get; set; }
}
```

**Suggestion**: Extract to a separate file: `Stepper.Api/Groups/LeaderboardEntryResult.cs` with `internal` visibility since it's only used within the Groups feature for JSON deserialization.

### MAJOR

#### Issue #5: Cross-Feature Dependency on Steps.DTOs.DateRange
**Files**:
- `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Groups/IGroupRepository.cs` (line 1)
- `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Groups/GroupRepository.cs` (line 4)
- `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Groups/GroupService.cs` (line 3)

**Description**: The Groups feature has a cross-feature dependency on `Stepper.Api.Steps.DTOs.DateRange`. According to the architecture policy, features should be loosely coupled, and shared types should live in `/Common`.

**Current**:
```csharp
using Stepper.Api.Steps.DTOs;
```

**Suggestion**: Move `DateRange` to a shared location such as:
- `/Stepper.Api/Common/Models/DateRange.cs`

This is a shared value object used by multiple features, not specific to Steps. This promotes better separation of concerns and reduces coupling between Groups and Steps features.

**Impact**: LOW - The code works correctly, but violates architectural boundaries. Future changes to the Steps feature could inadvertently break Groups.

#### Issue #6: GroupEntity and GroupMembershipEntity Are Not Domain Models
**Files**:
- `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Groups/GroupEntity.cs`
- `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Groups/GroupMembershipEntity.cs`

**Description**: The plan does not specify `GroupEntity` and `GroupMembershipEntity` as separate types. These are Supabase-specific infrastructure concerns, not domain models. While this is a good design pattern (separating database entities from domain models), it introduces extra types not in the plan.

**Rationale**: This is actually a positive deviation - it follows the repository pattern correctly by keeping Supabase attributes out of domain models. However, it should have been documented in the plan.

**Suggestion**: No code change needed. Document this pattern in the architecture.md as the standard approach for all features. Acknowledge this as an acceptable implementation detail.

**Impact**: LOW - Improves code quality but wasn't in the plan.

### MINOR

#### Issue #7: JoinCode Visibility Logic Could Be More Explicit
**File**: `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Groups/GroupService.cs`
**Line**: 585

**Description**: The join code visibility logic uses a ternary operator that could be more explicit about security concerns:

```csharp
JoinCode = (role == MemberRole.Owner || role == MemberRole.Admin) ? group.JoinCode : null,
```

**Suggestion**: Add a comment explaining this is intentional security filtering:
```csharp
// Only owners and admins can see join codes (security requirement)
JoinCode = (role == MemberRole.Owner || role == MemberRole.Admin) ? group.JoinCode : null,
```

#### Issue #8: GetByJoinCodeAsync Missing Usage Example in Tests
**File**: `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Groups/IGroupRepository.cs`
**Line**: 78-81

**Description**: While `GetByJoinCodeAsync` is defined in the repository interface, there are no tests verifying it's actually used in the join flow. The join flow calls `GetByIdAsync`, not `GetByJoinCodeAsync`.

**Observation**: Looking at the code flow in `GroupService.JoinGroupAsync`:
1. It receives `groupId` and validates it exists via `GetByIdAsync`
2. Then validates the join code matches `group.JoinCode`

This is correct but inefficient. If users join via a join code (not a group ID), the API would need a separate endpoint like `POST /api/groups/join-by-code` that calls `GetByJoinCodeAsync`.

**Suggestion**: Either:
1. Add a `JoinGroupByCodeAsync` service method and controller endpoint
2. OR remove `GetByJoinCodeAsync` if joining always requires knowing the group ID first
3. OR document that `GetByJoinCodeAsync` is reserved for future use

#### Issue #9: Member Count Consistency
**File**: `/mnt/c/Users/rene_/source/repos/Stepper/Stepper.Api/Groups/GroupRepository.cs`
**Lines**: Multiple locations (45, 64, 111, 238, 297)

**Description**: The member count is calculated on-demand via `GetMemberCountAsync()` every time a group is retrieved. This is correct for consistency but has performance implications.

**Current Approach**: Real-time calculation ensures accuracy
**Trade-off**: Extra query per group fetch

**Observation**: The plan specifies `MemberCount` as a property on the Group model (line 82), suggesting it's stored. However, the database schema doesn't have this column, and the implementation correctly calculates it dynamically.

**Suggestion**: This is acceptable for MVP. For future optimization, consider:
1. Database trigger to maintain a cached count
2. OR accept eventual consistency with periodic recalculation
3. Document this design decision

## Code Smells Detected

1. **N+1 Query Pattern** (2 instances - BLOCKER #1, #2)
   - `GroupRepository.GetUserGroupsAsync` (line 69-91)
   - `GroupService.GetMembersAsync` (line 472-489)

2. **Nested Class** (1 instance - BLOCKER #4)
   - `LeaderboardEntryResult` inside `GroupRepository` (line 319)

3. **Feature Coupling** (1 instance - MAJOR #5)
   - Dependency on `Steps.DTOs.DateRange` (3 files)

4. **Potential Dead Code** (1 instance - MINOR #8)
   - `GetByJoinCodeAsync` may be unused

## Positive Observations

### Excellent Implementation Aspects

1. **Security-First Design**
   - Join codes use `RandomNumberGenerator` for cryptographic randomness
   - Join codes exclude ambiguous characters (I, O, 0, 1, L)
   - RLS policies properly configured in migration
   - `SECURITY DEFINER` used for leaderboard function to bypass RLS for aggregation
   - Authentication checks in repository layer prevent unauthorized access

2. **Proper Business Logic Encapsulation**
   - Controllers are thin (48 lines average per endpoint)
   - All validation in service layer
   - Authorization checks before operations
   - Owner cannot leave group without transferring ownership (line 316-322)
   - Admins cannot remove other admins (line 439-442)

3. **Comprehensive Validation**
   - Guard clauses for all inputs
   - Name length validation (2-50 characters)
   - Guid.Empty checks preventing invalid IDs
   - Role-based authorization for all privileged operations

4. **Clean Error Handling**
   - Specific exception types (`ArgumentException`, `KeyNotFoundException`, `UnauthorizedAccessException`, `InvalidOperationException`)
   - Proper HTTP status code mapping in controller
   - Meaningful error messages

5. **Test Coverage**
   - 110 tests for Groups feature (26.9% of total test suite)
   - All tests passing
   - Good test names following AAA pattern
   - Edge cases covered (owner leaving, invalid codes, etc.)

6. **Database Design**
   - Proper indexes on foreign keys and join codes
   - Cascade deletes configured correctly
   - Unique constraint on (group_id, user_id) prevents duplicate memberships
   - CHECK constraints enforce data integrity at database level
   - Comprehensive RLS policies for security

7. **Performance Optimization**
   - Leaderboard calculation uses server-side database function
   - Single query with JOINs for leaderboard (not N+1)
   - Proper use of `STABLE` and `IMMUTABLE` function hints

8. **Code Organization**
   - DTOs properly separated in subfolder
   - Interfaces defined for testability
   - DI registration properly configured
   - XML documentation on public APIs

## Security Analysis

### Authentication & Authorization

**SECURE**:
- All repository methods call `GetAuthenticatedClientAsync()` which validates JWT token
- Controllers use `User.GetUserId()` extension method
- Unauthenticated requests properly rejected with 401

### Row-Level Security (RLS)

**SECURE**:
- RLS enabled on both `groups` and `group_memberships` tables
- Public groups visible to all (appropriate for feature)
- Private groups only visible to members
- Only owner can delete groups
- Only admins/owners can update groups
- Members can leave groups (delete own membership)
- Admins can remove members (separate policy)

### Join Code Security

**SECURE**:
- Join codes are 8 characters (sufficient entropy: 32^8 = 1.2 trillion combinations)
- Uses `RandomNumberGenerator.Fill()` (cryptographically secure)
- No ambiguous characters (prevents social engineering)
- Join codes validated server-side (not client-side)
- Private groups require valid join code to join

**MINOR CONCERN**: Join codes are stored in plain text in database. This is acceptable since:
- They're meant to be shared
- They're invalidated on regeneration
- They don't grant persistent access (membership can be revoked)

### SQL Injection

**SECURE**:
- All queries use Supabase client with parameterized queries
- No string concatenation for SQL
- No raw SQL execution in application code
- Database functions use proper parameter binding

### Data Exposure

**SECURE**:
- Join codes only visible to owners/admins (line 585)
- Member lists only visible to group members
- Leaderboards only visible to group members
- DTOs don't expose internal IDs unnecessarily

## Performance Concerns

### Critical (BLOCKER)
1. **N+1 Queries in GetUserGroupsAsync** - Issue #1
2. **N+1 Queries in GetMembersAsync** - Issue #2

### Minor
3. **Member Count Calculation** - Issue #9 (acceptable for MVP, document for future)
4. **Multiple GetByIdAsync Calls** - Service methods often call `GetByIdAsync` followed by `GetMembershipAsync`. Consider a single repository method that returns both.

## Maintainability Assessment

**RATING**: GOOD

**Strengths**:
- Clear separation of concerns
- Well-named methods and variables
- Comprehensive XML documentation
- Consistent error handling patterns
- Extensive test coverage

**Weaknesses**:
- N+1 query patterns will cause issues at scale
- Cross-feature dependency creates coupling
- Nested class violates policy

## Plan Adherence Analysis

### Implemented ✓
- [x] All 12 controller endpoints (lines 149-161 in plan)
- [x] All 8 DTOs as specified
- [x] 2 enums (MemberRole, CompetitionPeriodType)
- [x] Domain models (Group, GroupMembership, LeaderboardEntry)
- [x] Service layer with all 12 methods
- [x] Repository layer with all required methods
- [x] DI registration in ServiceCollectionExtensions
- [x] SQL migration with tables, indexes, RLS policies
- [x] Database functions (get_group_leaderboard, get_competition_period_dates)
- [x] Comprehensive test coverage

### Deviations from Plan

1. **NOT Implemented**: `CompetitionPeriod.cs` domain model (BLOCKER #3)
   - Functionality exists in service method instead

2. **Extra Implementation** (beneficial):
   - `GroupEntity.cs` and `GroupMembershipEntity.cs` for clean separation
   - `LeaderboardEntryResult.cs` (though as nested class - needs extraction)

3. **Database Schema Deviation**: `member_count` column not in database
   - Plan line 82 shows it as a property
   - Implementation calculates it dynamically (better design)

### Acceptance Criteria Status

From Plan 5, lines 403-416:

- [x] groups and group_memberships tables are created
- [x] RLS policies correctly restrict access
- [x] Users can create groups (become owner)
- [x] Private groups have join codes
- [x] Users can join public groups
- [x] Users can join private groups with valid code
- [x] Owners can update and delete groups
- [x] Admins can manage members
- [x] Leaderboard shows ranked members with step totals
- [x] Leaderboard respects competition period (daily/weekly/monthly)
- [x] Users can leave groups
- [x] Owner cannot leave without transferring ownership
- [x] Member count is tracked correctly

**All acceptance criteria met** ✓

## Recommendation

**Status**: REVISE

**Severity Summary**:
- BLOCKER Issues: 4 (N+1 queries x2, missing plan item x1, nested class x1)
- MAJOR Issues: 2 (cross-feature dependency, undocumented entities)
- MINOR Issues: 3 (comments, potential dead code, member count documentation)

**Required Changes Before Approval**:

1. **Fix N+1 Queries** (BLOCKER #1, #2)
   - Refactor `GroupRepository.GetUserGroupsAsync` to use single query or batch fetch
   - Refactor `GroupService.GetMembersAsync` to batch fetch users or use database function

2. **Extract Nested Class** (BLOCKER #4)
   - Move `LeaderboardEntryResult` to separate file
   - Make it `internal` visibility

3. **Resolve CompetitionPeriod Discrepancy** (BLOCKER #3)
   - Either implement the missing class OR get approval for plan deviation

4. **Move DateRange to Common** (MAJOR #5)
   - Move `DateRange` from `Steps.DTOs` to `Common.Models`
   - Update all references

**Optional Improvements** (can be deferred):
- Add explicit security comment for join code visibility (MINOR #7)
- Clarify `GetByJoinCodeAsync` usage or remove if unused (MINOR #8)
- Document member count calculation approach (MINOR #9)

**Next Steps**:
1. Implementer addresses the 4 BLOCKER issues
2. Re-run all tests to ensure fixes don't break functionality
3. Re-review (Iteration 2)

## Test Summary

**Total Tests**: 409 (all passing)
**Groups Tests**: 110 (26.9% of total)

**Breakdown**:
- GroupServiceTests: 69 tests
- GroupRepositoryTests: 19 tests
- GroupsControllerTests: 22 tests

**Coverage Assessment**: EXCELLENT

The test suite covers:
- Constructor validation
- All service methods (create, get, update, delete, join, leave, invite, remove, members, leaderboard, regenerate code)
- Authorization scenarios (owner, admin, member, non-member)
- Validation scenarios (empty IDs, null requests, invalid codes)
- Edge cases (owner leaving, admins removing admins)
- Repository authentication checks
- Controller HTTP status code mapping

**Test Quality**: Tests follow AAA pattern, have descriptive names, use FluentAssertions, and properly mock dependencies.

## File Inventory

**Implementation Files** (19):
- Domain Models: 5 files (Group, GroupMembership, LeaderboardEntry, MemberRole, CompetitionPeriodType)
- Entities: 2 files (GroupEntity, GroupMembershipEntity)
- DTOs: 8 files (all specified in plan)
- Repository: 2 files (IGroupRepository, GroupRepository)
- Service: 2 files (IGroupService, GroupService)
- Controller: 1 file (GroupsController)

**Test Files** (3):
- GroupServiceTests.cs (1421 lines)
- GroupRepositoryTests.cs (401 lines)
- GroupsControllerTests.cs (999 lines)

**Migration Files** (1):
- 006_create_groups_tables.sql (212 lines)

**Total Lines of Implementation Code**: ~1,850 lines
**Total Lines of Test Code**: ~2,821 lines
**Test-to-Code Ratio**: 1.52:1 (excellent)

---

> **USER ACCEPTANCE REQUIRED**: Before proceeding with revisions, the user must review and approve this assessment. The 4 BLOCKER issues must be addressed before this feature can be approved for merge.
