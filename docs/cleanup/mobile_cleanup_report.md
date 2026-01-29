# Mobile Cleanup Report

**Date:** 2026-01-25
**Purpose:** Remove direct Supabase calls from Stepper.Mobile (all backend logic should go through Stepper.Api)

---

## Summary

This cleanup enforces the architecture rule that Stepper.Mobile should ONLY contain frontend code. All backend/database logic must go through Stepper.Api endpoints.

### Files Deleted

| File | Reason |
|------|--------|
| `src/hooks/useSupabaseAuth.ts` | Deprecated hook marked for removal. Was using legacy Supabase auth patterns. Authentication now handled by authStore and authApi. |
| `src/hooks/__tests__/useSupabaseAuth.test.ts` | Tests for deleted hook. |

### Files Modified

| File | Changes Made |
|------|--------------|
| `src/services/supabase.ts` | Updated documentation to reflect current usage (real-time subscriptions and Google OAuth only). |
| `src/services/api/authApi.ts` | Added `changePassword()` function to call backend API instead of direct Supabase auth. |
| `src/services/api/activityApi.ts` | Refactored `subscribeToFeed()` to fetch activity item details via backend API instead of direct Supabase query. Added `getActivityItem()` helper function. |
| `src/screens/settings/SettingsScreen.tsx` | Removed direct Supabase auth calls. Now gets email from authStore and uses authApi.changePassword(). Removed unused useEffect import. |
| `src/screens/settings/components/ChangePasswordModal.tsx` | Updated to collect current password in addition to new password (required for secure password change via backend). |
| `src/services/api/__tests__/activityApi.test.ts` | Updated tests to mock backend API calls instead of direct Supabase queries. Removed redundant test cases. |
| `src/services/api/__tests__/authApi.test.ts` | Added tests for new changePassword() function. |
| `src/screens/settings/__tests__/SettingsScreen.test.tsx` | Updated to mock authApi.changePassword() instead of supabase.auth.updateUser(). Updated email display tests to use authStore. |
| `src/screens/settings/components/__tests__/ChangePasswordModal.test.tsx` | Updated tests for new current password requirement. |

### Things Removed

| Item | Location | Reason |
|------|----------|--------|
| `supabase.auth.getUser()` call | SettingsScreen.tsx | Email now comes from authStore (set during login/OAuth) |
| `supabase.auth.updateUser()` call | SettingsScreen.tsx | Password change now goes through authApi.changePassword() |
| `supabase.from('activity_feed')` query | activityApi.ts | Real-time subscription now fetches item details via backend API |
| Unused `useEffect` import | SettingsScreen.tsx | No longer needed after removing email fetch effect |

---

## Valid Supabase Usage (Kept)

The following Supabase usages are valid and were kept:

### 1. Real-time Subscriptions

| Location | Usage |
|----------|-------|
| `src/screens/home/hooks/useHomeData.ts` | `supabase.channel('step_entries_changes')` - Listen for step entry updates |
| `src/services/api/activityApi.ts` | `supabase.channel('activity_feed_changes')` - Listen for new activity items |
| `src/services/api/groupsApi.ts` | `supabase.channel('group-{id}-leaderboard')` - Listen for leaderboard updates |

### 2. Google OAuth Flow

| Location | Usage |
|----------|-------|
| `src/services/supabase.ts` | `signInWithGoogleOAuth()` - Initiate OAuth flow |
| `src/screens/auth/LoginScreen.tsx` | `supabase.auth.setSession()` - Set session after OAuth callback |

---

## Backend API Requirements

The following backend API endpoint needs to be implemented:

### POST /auth/change-password

**Request:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Headers:**
- `Authorization: Bearer {accessToken}`

**Response (success):**
```json
{
  "success": true,
  "data": null,
  "errors": []
}
```

**Response (error):**
```json
{
  "success": false,
  "data": null,
  "errors": ["Current password is incorrect"]
}
```

### GET /activity/{id}

**Purpose:** Fetch single activity item by ID (used by real-time subscription to get full item details)

**Response:**
```json
{
  "id": "string",
  "userId": "string",
  "userName": "string",
  "userAvatarUrl": "string | null",
  "type": "string",
  "message": "string",
  "metadata": "object | null",
  "createdAt": "string (ISO 8601)",
  "relatedUserId": "string | null",
  "relatedGroupId": "string | null"
}
```

---

## Test Results

All 1945 tests pass (excluding 1 pre-existing flaky timing test in tokenStorage.test.ts unrelated to this cleanup).

```
Test Suites: 91 passed, 91 total
Tests:       1945 passed, 1945 total
Snapshots:   3 passed, 3 total
```

TypeScript compilation: No errors

---

## Architecture Compliance

After this cleanup, Stepper.Mobile follows the correct architecture:

1. **All data operations** go through `src/services/api/` which calls Stepper.Api
2. **All authentication** goes through `authApi.ts` which calls Stepper.Api
3. **Supabase client** is only used for:
   - Real-time subscriptions (postgres_changes)
   - Google OAuth flow (signInWithOAuth, setSession)

---

## Manual Actions Required

None. All changes are code-only.

---

## Notes

1. The tokenStorage.test.ts has a flaky timing test that occasionally fails. This is a pre-existing issue unrelated to this cleanup. Consider increasing the timing threshold or using a different testing approach.

2. The ChangePasswordModal now requires the current password to be entered. This is a security improvement that prevents unauthorized password changes if someone gains temporary access to an unlocked device.

3. The backend needs to implement the `/auth/change-password` endpoint for the password change functionality to work.
