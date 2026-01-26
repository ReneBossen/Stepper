# Backend Modifications Required

**Feature**: Mobile Cleanup - Remove Direct Supabase Calls
**Date**: 2026-01-25
**From**: Frontend Engineer Agent

---

## Summary

As part of the mobile cleanup effort to remove all direct Supabase database calls from WalkingApp.Mobile, the following backend API endpoints are required.

---

## New Endpoints Needed

### 1. POST /auth/change-password

**Purpose:** Allow authenticated users to change their password.

**Request Body:**
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required, min 8 chars, at least 1 letter and 1 number)"
}
```

**Headers:**
- `Authorization: Bearer {accessToken}` (required)

**Success Response (200):**
```json
{
  "success": true,
  "data": null,
  "errors": []
}
```

**Error Responses:**
- 400 Bad Request - Invalid new password format
- 401 Unauthorized - Current password incorrect or token invalid/expired

**Implementation Notes:**
- Verify the current password against Supabase before allowing change
- Use Supabase Admin API to update the password: `supabase.auth.admin.updateUserById(userId, { password: newPassword })`
- Log password change events for security auditing

---

### 2. GET /activity/{id}

**Purpose:** Fetch a single activity item by ID with full user details.

**Used By:** Real-time subscriptions in mobile app - when a new activity is detected, the app fetches full details via this endpoint.

**Parameters:**
- `id` (path, required) - The activity item ID

**Headers:**
- `Authorization: Bearer {accessToken}` (required)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "userName": "string",
    "userAvatarUrl": "string | null",
    "type": "string",
    "message": "string",
    "metadata": { ... } | null,
    "createdAt": "2026-01-25T12:00:00Z",
    "relatedUserId": "uuid | null",
    "relatedGroupId": "uuid | null"
  },
  "errors": []
}
```

**Error Responses:**
- 404 Not Found - Activity item does not exist
- 403 Forbidden - User not authorized to view this activity

**Implementation Notes:**
- Join with users table to get userName and userAvatarUrl
- Consider privacy settings when returning activity items

---

## Handoff To

- **Backend Engineer Agent** - Implement the endpoints
- **Database Engineer Agent** - If any schema changes are needed

---

## Priority

Medium - The change password functionality is currently broken without the backend endpoint. Activity item fetch has a fallback but may fail silently.

---

## Testing

Frontend tests are updated and passing. Backend tests should be added for:
1. Password change with correct current password
2. Password change with incorrect current password
3. Password change with invalid new password (too short, no letter, no number)
4. Activity item fetch by ID
5. Activity item fetch for non-existent ID
