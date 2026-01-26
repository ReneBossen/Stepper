# Database Cleanup Report: Redundant Preferences Storage

**Date:** 2026-01-25
**Author:** Database Engineer Agent
**Status:** Analysis Complete - Awaiting Approval

---

## Executive Summary

The database currently has **redundant storage for user preferences**:

1. **`users.preferences`** - A JSONB column in the `users` table (legacy)
2. **`user_preferences`** - A dedicated table with proper typed columns (current)

This redundancy was intentionally created during migration 015 to allow for gradual rollout. However, the cleanup to remove the legacy JSONB column was never completed. This report documents the current state, code dependencies, and provides a migration plan.

---

## Current State Analysis

### 1. Database Schema

#### users.preferences (LEGACY - TO BE REMOVED)

| Aspect | Details |
|--------|---------|
| Column | `preferences JSONB DEFAULT '{}'` |
| Location | `users` table |
| Created | Migration 002 |
| Purpose | Original storage for user preferences |
| Data Format | Nested JSONB with `units`, `dailyStepGoal`, `notifications`, `privacy` |

**Sample structure stored in JSONB:**
```json
{
  "units": "metric",
  "dailyStepGoal": 10000,
  "notifications": {
    "dailyReminder": true,
    "friendRequests": true,
    "groupInvites": true,
    "achievements": true
  },
  "privacy": {
    "showStepsToFriends": true,
    "showGroupActivity": true,
    "allowFriendRequests": true,
    "privateProfile": false
  }
}
```

#### user_preferences (CURRENT - KEEP)

| Aspect | Details |
|--------|---------|
| Table | `user_preferences` |
| Created | Migration 015 |
| Purpose | Dedicated preferences table with typed columns |
| Key Columns | `daily_step_goal`, `units`, `notifications_enabled`, `privacy_find_me`, `privacy_show_steps`, etc. |

**Table structure:**
```sql
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_step_goal INTEGER DEFAULT 10000,
    units TEXT DEFAULT 'metric',
    notifications_enabled BOOLEAN DEFAULT true,
    privacy_find_me TEXT DEFAULT 'public',
    privacy_show_steps TEXT DEFAULT 'partial',
    -- Plus granular notification preferences from migration 021
    notify_friend_requests BOOLEAN DEFAULT true,
    notify_friend_accepted BOOLEAN DEFAULT true,
    -- ... more notification columns
    privacy_profile_visibility TEXT DEFAULT 'public',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Data Flow Analysis

**Current (Redundant) Flow:**
```
Mobile App
    |
    v
.NET Backend API
    |
    +---> UserEntity.PreferencesJson --> users.preferences (JSONB)
    |                                        |
    |                                        v
    +---> StepRepository.UserPreferencesEntity --> user_preferences table
```

**Problem:** The backend writes preferences to the JSONB column but the Steps feature reads from the `user_preferences` table. This creates data inconsistency.

---

## Backend Code Usage

### Files Using users.preferences (JSONB column)

#### 1. `WalkingApp.Api/Users/UserEntity.cs` (Lines 26-27, 44-106)

```csharp
[Column("preferences")]
public object? PreferencesJson { get; set; }

public User ToUser()
{
    UserPreferences preferences;
    // ... Complex JSON deserialization logic
    if (PreferencesJson == null)
    {
        preferences = new UserPreferences();
    }
    else if (PreferencesJson is JsonElement jsonElement)
    {
        preferences = JsonSerializer.Deserialize<UserPreferences>(...);
    }
    // ... more cases
}

public static UserEntity FromUser(User user)
{
    var preferencesJson = JsonSerializer.SerializeToElement(user.Preferences, JsonOptions);
    return new UserEntity
    {
        // ...
        PreferencesJson = preferencesJson,
    };
}
```

**Impact:** This entity reads/writes the JSONB column when loading/saving users.

#### 2. `WalkingApp.Api/Users/User.cs` (Line 18)

```csharp
public UserPreferences Preferences { get; set; } = new();
```

**Impact:** Domain model carries preferences from the JSONB column.

#### 3. `WalkingApp.Api/Users/UserService.cs` (Multiple locations)

- Line 143: `Preferences = new UserPreferences()` when creating new user
- Lines 196-217: `GetPreferencesAsync` and `UpdatePreferencesAsync` methods
- Lines 285-306: `ApplyPreferencesUpdate` method
- Lines 402-409: `MapToPreferencesResponse` method

**Impact:** Business logic reads/writes preferences through the User domain model (which uses JSONB).

#### 4. `WalkingApp.Api/Users/DTOs/GetProfileResponse.cs` (Line 8)

```csharp
public UserPreferences Preferences { get; set; } = new();
```

**Impact:** API response includes preferences from JSONB column.

#### 5. `WalkingApp.Api/Users/DTOs/UpdateProfileRequest.cs` (Line 7)

```csharp
public UserPreferences? Preferences { get; set; }
```

**Impact:** API can receive preferences updates that go to JSONB column.

### Files Using user_preferences Table (Correct)

#### 1. `WalkingApp.Api/Steps/UserPreferencesEntity.cs`

```csharp
[Table("user_preferences")]
internal class UserPreferencesEntity : BaseModel
{
    [PrimaryKey("id", false)]
    public Guid Id { get; set; }

    [Column("daily_step_goal")]
    public int DailyStepGoal { get; set; } = 10000;
}
```

**Usage:** StepRepository uses this to get daily step goal for goal progress calculations.

#### 2. `WalkingApp.Api/Steps/StepRepository.cs` (Lines 159-169)

```csharp
public async Task<int> GetDailyGoalAsync(Guid userId)
{
    var client = await GetAuthenticatedClientAsync();
    var response = await client
        .From<UserPreferencesEntity>()
        .Where(x => x.Id == userId)
        .Single();
    return response?.DailyStepGoal ?? DefaultDailyGoal;
}
```

**Impact:** Correctly reads from `user_preferences` table.

---

## Mobile App Usage

### Files Using Backend Preferences API

#### 1. `WalkingApp.Mobile/src/services/api/userPreferencesApi.ts`

The mobile app calls the backend API at `/users/me/preferences`:
- `getPreferences()` - calls `GET /users/me/preferences`
- `updatePreferences()` - calls `PUT /users/me/preferences`

The mobile app receives a simplified response from the backend and maps it to a full preferences model. The backend response structure comes from the JSONB column.

#### 2. `WalkingApp.Mobile/src/store/userStore.ts`

Uses `userPreferencesApi` to fetch and update preferences. The store combines user profile data with preferences.

---

## Data Consistency Issues

### Current Problem

1. **Backend writes to JSONB:** When user updates preferences via `/users/me/preferences`, the backend writes to `users.preferences` JSONB column.

2. **Steps reads from table:** When calculating goal progress, `StepRepository.GetDailyGoalAsync()` reads from `user_preferences` table.

3. **Data migration exists:** Migration 015 copied existing JSONB data to the new table, but ongoing updates only go to JSONB.

### Consequence

If a user changes their daily step goal, the change is saved to the JSONB column but the Steps feature continues using the old value from `user_preferences` table (unless the user happened to have preferences before migration 015 ran).

---

## Recommended Migration Steps

### Phase 1: Backend Code Changes (Must be done first)

Modify the backend to read/write from `user_preferences` table instead of JSONB column:

1. **Create new UserPreferencesRepository:**
   - Add `WalkingApp.Api/Users/UserPreferencesRepository.cs`
   - Implement CRUD operations against `user_preferences` table
   - Use existing `Steps/UserPreferencesEntity.cs` as template (expand it)

2. **Update UserPreferencesEntity:**
   - Move from `Steps/` to `Users/` folder
   - Add all preference columns (not just `daily_step_goal`)

3. **Update UserService:**
   - `GetPreferencesAsync()` - read from `user_preferences` table
   - `UpdatePreferencesAsync()` - write to `user_preferences` table
   - Remove preference logic from `UpdateProfileAsync()`

4. **Update UserEntity:**
   - Remove `PreferencesJson` property
   - Remove `ToUser()` preferences deserialization
   - Remove `FromUser()` preferences serialization

5. **Update User domain model:**
   - Remove `Preferences` property (preferences accessed separately)

6. **Update DTOs:**
   - Remove `Preferences` from `GetProfileResponse`
   - Remove `Preferences` from `UpdateProfileRequest`

7. **Update UsersController:**
   - Ensure `/users/me/preferences` endpoints work correctly

### Phase 2: Database Migration

After backend changes are deployed and verified:

```sql
-- Migration: Remove deprecated preferences JSONB column from users table
-- Description: Removes the legacy preferences JSONB column now that all code uses user_preferences table
-- Author: Database Engineer Agent
-- Date: {YYYY-MM-DD}

-- ============================================================================
-- PRE-MIGRATION VERIFICATION
-- ============================================================================
-- Run these queries to verify data has been migrated:
/*
-- 1. Check all users have a user_preferences row
SELECT COUNT(*) AS users_without_preferences
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_preferences up WHERE up.id = u.id);

-- 2. Verify no data loss (compare counts)
SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM user_preferences) AS total_preferences;
*/

-- ============================================================================
-- COLUMN REMOVAL
-- ============================================================================

-- Remove the deprecated preferences JSONB column
ALTER TABLE users DROP COLUMN IF EXISTS preferences;

-- Update table comment to reflect removal
COMMENT ON TABLE users IS 'User profile data linked to Supabase Auth users. Preferences are stored in user_preferences table.';

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================
-- Verify column was removed:
/*
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
*/

-- Expected columns after migration:
-- id, display_name, avatar_url, created_at, updated_at, qr_code_id, onboarding_completed
```

### Phase 3: Verification

1. Test all preferences-related endpoints
2. Verify mobile app functionality
3. Monitor for any errors in production

---

## Other Database Observations

### Potentially Unused Tables

| Table | Status | Notes |
|-------|--------|-------|
| `invite_codes` | **Review needed** | Created for QR/link invitations. Verify if friend discovery uses this or `users.qr_code_id` directly. |

### Index Review

| Index | Status | Notes |
|-------|--------|-------|
| `idx_users_created_at` | Keep | Used for user listing queries |
| `idx_users_qr_code_id` | Keep | Used for QR code lookups |
| `idx_users_display_name_trgm` | Keep | Used for fuzzy search |
| `idx_users_display_name_lower` | Keep | Used for case-insensitive search |
| `idx_user_preferences_privacy_find_me_public` | Keep | Used for discovery filtering |
| `idx_user_preferences_privacy_find_me_partial` | Keep | Used for friends-of-friends discovery |

### Potential Missing Indexes

None identified - the current index coverage appears adequate.

### RLS Policy Considerations

When removing the `preferences` column, no RLS policy changes are needed as the column is not referenced in any policies.

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Data loss during migration | Low | Migration 015 already copied data; verify before removal |
| Backend code breaks | Medium | Thorough testing of all preference endpoints |
| Mobile app breaks | Low | API contract remains the same |
| Steps feature affected | Low | Already reads from correct table |

---

## Files to Modify (Summary)

### Backend (.NET)

| File | Change Type | Description |
|------|-------------|-------------|
| `WalkingApp.Api/Users/UserEntity.cs` | Modify | Remove `PreferencesJson`, update `ToUser()`, `FromUser()` |
| `WalkingApp.Api/Users/User.cs` | Modify | Remove `Preferences` property |
| `WalkingApp.Api/Users/UserService.cs` | Modify | Update to use UserPreferencesRepository |
| `WalkingApp.Api/Users/UserRepository.cs` | No change | Does not handle preferences |
| `WalkingApp.Api/Users/DTOs/GetProfileResponse.cs` | Modify | Remove `Preferences` property |
| `WalkingApp.Api/Users/DTOs/UpdateProfileRequest.cs` | Modify | Remove `Preferences` property |
| `WalkingApp.Api/Users/DTOs/UserPreferences.cs` | Keep | Still needed for preferences endpoint |
| `WalkingApp.Api/Steps/UserPreferencesEntity.cs` | Move | Move to Users/ and expand columns |

### Database

| Migration | Description |
|-----------|-------------|
| `022_remove_users_preferences_column.sql` | Remove JSONB column after backend updated |

### Mobile (No changes needed)

The mobile app uses the `/users/me/preferences` API endpoint which will continue to work with the same response format.

---

## Approval Required

Before proceeding with implementation:

1. [ ] Review this analysis
2. [ ] Approve backend code changes
3. [ ] Approve database migration timing
4. [ ] Schedule deployment window

---

## Appendix: Migration SQL Script

Save this as `docs/migrations/022_remove_users_preferences_column.sql`:

```sql
-- Migration: Remove deprecated preferences JSONB column
-- Description: Removes the legacy preferences JSONB column from the users table.
--              The user_preferences table now stores all preference data.
-- Author: Database Engineer Agent
-- Date: {YYYY-MM-DD}
--
-- IMPORTANT: Only run this migration AFTER the backend code has been updated
-- to use the user_preferences table exclusively.
--
-- Pre-requisites:
-- 1. Backend code updated to not reference users.preferences
-- 2. All users have corresponding user_preferences rows
-- 3. Production deployment completed and verified
--
-- Execution Instructions:
-- 1. Log in to Supabase Dashboard (https://app.supabase.com)
-- 2. Navigate to your project
-- 3. Go to the SQL Editor section
-- 4. Run the verification queries first
-- 5. If verification passes, run the migration

-- ============================================================================
-- PRE-MIGRATION VERIFICATION (Run these first!)
-- ============================================================================

-- 1. Verify all users have user_preferences rows
-- This should return 0
SELECT COUNT(*) AS users_missing_preferences
FROM users u
LEFT JOIN user_preferences up ON up.id = u.id
WHERE up.id IS NULL;

-- 2. If any users are missing preferences, create them first:
/*
INSERT INTO user_preferences (id)
SELECT u.id
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_preferences up WHERE up.id = u.id)
ON CONFLICT (id) DO NOTHING;
*/

-- ============================================================================
-- MIGRATION
-- ============================================================================

-- Remove the deprecated preferences JSONB column
ALTER TABLE users DROP COLUMN IF EXISTS preferences;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

-- Verify the column was removed
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Expected columns:
-- id, display_name, avatar_url, created_at, updated_at, qr_code_id, onboarding_completed
```
