# Backend Technical Debt

**Date**: 2026-02-02
**Author**: Architecture Engineer Agent

---

## Summary

| Priority | Count |
|----------|-------|
| Critical | 1 |
| High | 4 |
| Medium | 7 |
| Low | 3 |
| **Total** | **15** |

---

## Critical Priority

### [BE-001] Duplicate Preferences Storage

**Priority**: Critical
**Area**: Backend
**Effort**: Large

**What is it:**
User preferences are stored in two separate locations:
1. `users.preferences` column (JSONB) - contains `dailyStepGoal`, `notificationsEnabled`, `reminderTime`
2. `user_preferences` table - contains `daily_step_goal` and notification preferences

Both locations are actively read and written to by different parts of the application.

**Why it's debt:**
- Data can become inconsistent between the two storage locations
- No single source of truth for preferences
- Maintenance overhead when changing preference logic
- Risk of showing different values in different screens
- The `StepRepository` reads from `user_preferences` while `UserService` reads from `users.preferences`

**How to fix:**
1. Audit all code paths that read/write preferences
2. Choose a single source of truth (recommend the `user_preferences` table for normalized data)
3. Create migration to move all data to the chosen location
4. Update all services and repositories to use single location
5. Remove the deprecated storage location
6. Add validation to prevent future duplication

**Files affected:**
- Stepper.Api/Users/UserEntity.cs (PreferencesJson property)
- Stepper.Api/Users/UserPreferencesEntity.cs
- Stepper.Api/Users/UserRepository.cs
- Stepper.Api/Users/UserService.cs
- Stepper.Api/Users/IUserPreferencesRepository.cs
- Stepper.Api/Users/UserPreferencesRepository.cs
- Stepper.Api/Steps/StepRepository.cs (GetDailyGoalAsync method)

---

## High Priority

### [BE-002] Redundant Exception Handling in Controllers

**Priority**: High
**Area**: Backend
**Effort**: Medium

**What is it:**
Controllers have extensive try-catch blocks that catch generic exceptions and return 500 status codes, despite having a global `ExceptionHandlingMiddleware` that already handles unhandled exceptions.

There are 58 instances of `StatusCode(500, ...)` across 7 controller files.

**Why it's debt:**
- Duplicates functionality already provided by middleware
- Makes controllers verbose and harder to read
- Inconsistent error messages (some include `ex.Message`, which could leak sensitive information)
- Violates DRY principle
- Controllers should be thin, not contain exception handling logic

**How to fix:**
1. Audit current error messages for security (avoid exposing internal details)
2. Remove catch blocks for generic exceptions in controllers
3. Keep only business-specific exception catches (ArgumentException, KeyNotFoundException, etc.)
4. Let global middleware handle truly unexpected exceptions
5. Consider using Result pattern or custom exception types for business errors

**Files affected:**
- Stepper.Api/Users/UsersController.cs (10 instances)
- Stepper.Api/Notifications/NotificationsController.cs (5 instances)
- Stepper.Api/Steps/StepsController.cs (9 instances)
- Stepper.Api/Activity/ActivityController.cs (2 instances)
- Stepper.Api/Friends/FriendsController.cs (10 instances)
- Stepper.Api/Groups/GroupsController.cs (17 instances)
- Stepper.Api/Friends/Discovery/FriendDiscoveryController.cs (5 instances)

---

### [BE-003] AuthService Creates New Supabase Clients Per Request

**Priority**: High
**Area**: Backend
**Effort**: Medium

**What is it:**
The `AuthService` creates new Supabase client instances for each authentication operation via `CreateSupabaseClientAsync()` and `CreateAuthenticatedClientAsync()` methods, instead of using the injected `ISupabaseClientFactory`.

**Why it's debt:**
- Inconsistent with other services that use the factory pattern
- Cannot benefit from connection pooling or caching
- Makes the auth service harder to test (cannot mock the client)
- Duplicates client creation logic
- Each request initializes a new client (`await client.InitializeAsync()`)

**How to fix:**
1. Inject `ISupabaseClientFactory` into `AuthService`
2. Use factory methods for client creation
3. Remove private client creation methods
4. Update constructor and registration

**Files affected:**
- Stepper.Api/Auth/AuthService.cs
- Stepper.Api/Common/Extensions/ServiceCollectionExtensions.cs (AddAuthServices method)

---

### [BE-004] Missing Repository for Auth Feature

**Priority**: High
**Area**: Backend
**Effort**: Small

**What is it:**
The Auth feature slice has no repository layer. The `AuthService` directly interacts with Supabase Auth, which mixes service logic with data access.

**Why it's debt:**
- Violates Screaming Architecture pattern (all other features have Controller -> Service -> Repository)
- Makes the auth service harder to test in isolation
- Couples business logic directly to Supabase implementation
- Inconsistent with the rest of the codebase

**How to fix:**
1. Create `IAuthRepository` interface
2. Create `AuthRepository` implementation that wraps Supabase Auth calls
3. Move all Supabase-specific code from `AuthService` to repository
4. Keep validation and business logic in service
5. Register repository in DI container

**Files affected:**
- Stepper.Api/Auth/AuthService.cs
- Stepper.Api/Auth/ (new IAuthRepository.cs and AuthRepository.cs)
- Stepper.Api/Common/Extensions/ServiceCollectionExtensions.cs

---

### [BE-005] Inconsistent String Constants Usage

**Priority**: High
**Area**: Backend
**Effort**: Small

**What is it:**
Friendship status strings ("pending", "accepted", "rejected", "blocked") are defined in `FriendshipStatusStrings` constants class, but repositories use magic strings directly instead of the constants.

**Why it's debt:**
- Typos in magic strings won't be caught at compile time
- Makes refactoring status values risky
- Inconsistent code style across the codebase
- Constants exist but are underutilized

**How to fix:**
1. Audit all usages of friendship status strings in repositories
2. Replace magic strings with `FriendshipStatusStrings` constants
3. Consider creating an enum for stronger typing
4. Add compiler warning if magic strings are detected (via analyzer)

**Files affected:**
- Stepper.Api/Friends/FriendRepository.cs
- Stepper.Api/Friends/Discovery/InviteCodeRepository.cs
- Stepper.Api/Users/UserRepository.cs
- Stepper.Api/Common/Constants/FriendshipStatusStrings.cs

---

## Medium Priority

### [BE-006] Fat Controllers - Business Logic in Controllers

**Priority**: Medium
**Area**: Backend
**Effort**: Medium

**What is it:**
Some controller actions contain business logic that should be in services:
- `AuthController.ExtractAccessToken()` method
- Date validation in `StepsController.GetDailyHistory`
- User authentication checks repeated in every action

**Why it's debt:**
- Controllers should be thin (HTTP concerns only)
- Business logic in controllers cannot be reused
- Makes unit testing controllers more complex
- Violates single responsibility principle

**How to fix:**
1. Move token extraction to an extension method or service
2. Move date validation to service layer
3. Consider using a base controller or action filter for common auth checks

**Files affected:**
- Stepper.Api/Auth/AuthController.cs
- Stepper.Api/Steps/StepsController.cs
- All controllers (authentication check pattern)

---

### [BE-007] Large GroupService Class

**Priority**: Medium
**Area**: Backend
**Effort**: Medium

**What is it:**
`GroupService.cs` is 930 lines and contains extensive functionality including group management, membership, leaderboards, search, and role management.

**Why it's debt:**
- Single Responsibility Principle violation
- Difficult to navigate and understand
- Changes in one area risk breaking others
- Harder to test comprehensively

**How to fix:**
1. Extract membership logic to `GroupMembershipService`
2. Extract search/discovery logic to `GroupDiscoveryService`
3. Extract leaderboard logic to `GroupLeaderboardService`
4. Keep `GroupService` for core group CRUD operations
5. Consider using the mediator pattern for complex operations

**Files affected:**
- Stepper.Api/Groups/GroupService.cs
- Stepper.Api/Groups/IGroupService.cs
- Stepper.Api/Common/Extensions/ServiceCollectionExtensions.cs

---

### [BE-008] Validation Logic Duplicated Across Services

**Priority**: Medium
**Area**: Backend
**Effort**: Medium

**What is it:**
Common validation patterns (user ID checks, date range validation, pagination validation) are duplicated across multiple services.

**Why it's debt:**
- Violates DRY principle
- Inconsistent validation messages
- Changes require updates in multiple places
- Easy to miss validation in new code

**How to fix:**
1. Create a `ValidationHelper` class in Common
2. Extract common validations (ValidateUserId, ValidateDateRange, ValidatePagination)
3. Replace duplicated validation code with helper methods
4. Consider FluentValidation for complex DTOs

**Files affected:**
- Stepper.Api/Steps/StepService.cs
- Stepper.Api/Groups/GroupService.cs
- Stepper.Api/Friends/FriendService.cs
- Stepper.Api/Users/UserService.cs

---

### [BE-009] Hardcoded Date "2020-01-01" in StepRepository

**Priority**: Medium
**Area**: Backend
**Effort**: Small

**What is it:**
`GetAllDailySummariesAsync` uses a hardcoded start date of January 1, 2020 to query "all" step summaries.

**Why it's debt:**
- Magic number in code
- May not retrieve data from before 2020 (edge case)
- Not configurable
- The comment says "Reasonable start date" but this is arbitrary

**How to fix:**
1. Make the start date configurable via app settings
2. Or use user's registration date as start date
3. Or remove the start date filter and query all data

**Files affected:**
- Stepper.Api/Steps/StepRepository.cs (GetAllDailySummariesAsync method)

---

### [BE-010] NotImplementedException in FriendService

**Priority**: Medium
**Area**: Backend
**Effort**: Medium

**What is it:**
`GetFriendStepsAsync` in `FriendService` throws `NotImplementedException`, indicating incomplete feature.

**Why it's debt:**
- Exposed API endpoint that doesn't work
- Can cause runtime errors if called
- Frontend must handle 501 responses
- Incomplete feature shipped

**How to fix:**
1. Implement the method using StepRepository
2. Or remove the endpoint if not needed
3. Or return 404 with meaningful message instead of 501

**Files affected:**
- Stepper.Api/Friends/FriendService.cs
- Stepper.Api/Friends/IFriendService.cs
- Stepper.Api/Friends/FriendsController.cs

---

### [BE-011] Missing XML Documentation on Some Interfaces

**Priority**: Medium
**Area**: Backend
**Effort**: Small

**What is it:**
While most interfaces have XML documentation, some interface methods lack documentation, particularly in newer features.

**Why it's debt:**
- Inconsistent documentation standards
- Harder for developers to understand contract
- IntelliSense less helpful

**How to fix:**
1. Add XML documentation to all interface methods
2. Enable documentation warnings in project file
3. Consider using a documentation template

**Files affected:**
- Stepper.Api/Groups/IGroupRepository.cs
- Stepper.Api/Activity/IActivityService.cs
- Stepper.Api/Notifications/INotificationService.cs

---

### [BE-012] Repeated User ID Extraction Pattern

**Priority**: Medium
**Area**: Backend
**Effort**: Small

**What is it:**
Every controller action starts with:
```
var userId = User.GetUserId();
if (userId == null) { return Unauthorized(...); }
```

This pattern is repeated in every authenticated endpoint (approximately 60+ times).

**Why it's debt:**
- Massive code duplication
- Easy to forget in new endpoints
- Changes require updates everywhere

**How to fix:**
1. Create a base controller with a `CurrentUserId` property
2. Or use an action filter to validate and inject user ID
3. Or use a custom model binder
4. Consider using MediatR with pipeline behaviors

**Files affected:**
- All controller files (60+ instances)

---

## Low Priority

### [BE-013] DTOs Not Using Records Where Appropriate

**Priority**: Low
**Area**: Backend
**Effort**: Small

**What is it:**
Some DTOs use classes with get-only properties when they could be immutable records.

**Why it's debt:**
- More verbose than necessary
- Records provide better equality semantics
- Records are more explicit about immutability

**How to fix:**
1. Convert request/response DTOs to records where appropriate
2. Keep classes for entities that need mutability

**Files affected:**
- Various DTOs in Stepper.Api/**/DTOs/

---

### [BE-014] FriendshipStatusStrings in Wrong Location

**Priority**: Low
**Area**: Backend
**Effort**: Small

**What is it:**
`FriendshipStatusStrings` is located in `Common/Constants/` but is only used by the Friends feature.

**Why it's debt:**
- Violates Screaming Architecture (feature code should be in feature folders)
- Common folder should only have truly shared code

**How to fix:**
1. Move `FriendshipStatusStrings.cs` to `Friends/` folder
2. Or if used elsewhere, document why it's in Common

**Files affected:**
- Stepper.Api/Common/Constants/FriendshipStatusStrings.cs

---

### [BE-015] Inconsistent Async Naming

**Priority**: Low
**Area**: Backend
**Effort**: Small

**What is it:**
Some methods don't follow the `Async` suffix convention for async methods, though this is rare.

**Why it's debt:**
- Inconsistent naming convention
- Can cause confusion about method behavior

**How to fix:**
1. Audit all async methods
2. Ensure all async methods end with "Async"
3. Update any callers

**Files affected:**
- Audit required across all services
