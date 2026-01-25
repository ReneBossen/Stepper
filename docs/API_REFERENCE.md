# API Reference

This document provides a complete reference of all API endpoints in the Stepper backend.

## Overview

- **Base URL**: `/api/v1`
- **Authentication**: All endpoints require a valid Supabase JWT token in the `Authorization` header, except where noted
- **Format**: All requests and responses use JSON
- **Authentication Header**: `Authorization: Bearer {token}`

## Response Format

Successful responses return the requested data. Error responses include:

```json
{
  "error": "Error message",
  "details": "Additional context if available"
}
```

## Endpoints by Feature

---

## Auth

Authentication endpoints handle user registration, login, and session management. These endpoints work with Supabase Auth.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register a new user account | No |
| POST | `/api/v1/auth/login` | Sign in with email and password | No |
| POST | `/api/v1/auth/logout` | Sign out and invalidate session | Yes |
| POST | `/api/v1/auth/refresh` | Refresh an expired access token | Yes |
| POST | `/api/v1/auth/forgot-password` | Request password reset email | No |
| POST | `/api/v1/auth/reset-password` | Reset password with token | No |

### POST /api/v1/auth/register

Register a new user account with email and password.

### POST /api/v1/auth/login

Authenticate user and receive access token.

### POST /api/v1/auth/logout

Sign out the current user and invalidate their session.

### POST /api/v1/auth/refresh

Refresh an expired access token using the refresh token.

### POST /api/v1/auth/forgot-password

Request a password reset email for the specified email address.

### POST /api/v1/auth/reset-password

Reset the user's password using the token from the reset email.

---

## Users

User endpoints manage profiles, preferences, and user discovery.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/users/me` | Get current user's profile | Yes |
| PUT | `/api/v1/users/me` | Update current user's profile | Yes |
| GET | `/api/v1/users/me/preferences` | Get current user's preferences | Yes |
| PUT | `/api/v1/users/me/preferences` | Update current user's preferences | Yes |
| POST | `/api/v1/users/me/avatar` | Upload or update profile avatar | Yes |
| GET | `/api/v1/users/{id}` | Get a specific user's public profile | Yes |
| GET | `/api/v1/users/{id}/stats` | Get a user's activity statistics | Yes |
| GET | `/api/v1/users/{id}/activity` | Get a user's recent activity | Yes |
| GET | `/api/v1/users/{id}/mutual-groups` | Get groups shared with a user | Yes |

### GET /api/v1/users/me

Retrieve the authenticated user's full profile information.

### PUT /api/v1/users/me

Update the authenticated user's profile fields such as display name or bio.

### GET /api/v1/users/me/preferences

Retrieve the authenticated user's notification and privacy preferences.

### PUT /api/v1/users/me/preferences

Update notification settings and privacy preferences.

### POST /api/v1/users/me/avatar

Upload a new avatar image for the authenticated user.

### GET /api/v1/users/{id}

Retrieve another user's public profile. Returns limited information based on friendship status.

### GET /api/v1/users/{id}/stats

Get step and activity statistics for a user. Requires friendship or group membership.

### GET /api/v1/users/{id}/activity

Retrieve recent activity entries for a user. Access depends on privacy settings.

### GET /api/v1/users/{id}/mutual-groups

Get list of groups that both the authenticated user and the specified user belong to.

---

## Steps

Step endpoints manage activity tracking and history.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/steps` | Record new step entry | Yes |
| GET | `/api/v1/steps/today` | Get today's step count | Yes |
| GET | `/api/v1/steps/stats` | Get step statistics (weekly/monthly) | Yes |
| GET | `/api/v1/steps/history` | Get historical step data | Yes |
| GET | `/api/v1/steps/daily` | Get daily step totals for a date range | Yes |
| GET | `/api/v1/steps/{id}` | Get a specific step entry | Yes |
| DELETE | `/api/v1/steps/{id}` | Delete a step entry | Yes |

### POST /api/v1/steps

Record a new step entry with step count, distance, and optional metadata.

### GET /api/v1/steps/today

Get the current day's total step count and distance.

### GET /api/v1/steps/stats

Get aggregated statistics including weekly average, monthly total, and streaks.

### GET /api/v1/steps/history

Get paginated historical step entries with optional date filtering.

### GET /api/v1/steps/daily

Get daily totals for a specified date range. Useful for charts and graphs.

### GET /api/v1/steps/{id}

Retrieve a specific step entry by ID.

### DELETE /api/v1/steps/{id}

Delete a step entry. Users can only delete their own entries.

---

## Friends

Friend endpoints manage social connections and friend discovery.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/friends` | Get list of friends | Yes |
| GET | `/api/v1/friends/requests/incoming` | Get incoming friend requests | Yes |
| GET | `/api/v1/friends/requests/outgoing` | Get outgoing friend requests | Yes |
| POST | `/api/v1/friends/requests` | Send a friend request | Yes |
| POST | `/api/v1/friends/requests/{id}/accept` | Accept a friend request | Yes |
| POST | `/api/v1/friends/requests/{id}/reject` | Reject a friend request | Yes |
| DELETE | `/api/v1/friends/requests/{id}` | Cancel an outgoing friend request | Yes |
| DELETE | `/api/v1/friends/{id}` | Remove a friend | Yes |
| GET | `/api/v1/friends/discovery/search` | Search for users to add as friends | Yes |

### GET /api/v1/friends

Get the authenticated user's list of accepted friends.

### GET /api/v1/friends/requests/incoming

Get pending friend requests received by the authenticated user.

### GET /api/v1/friends/requests/outgoing

Get pending friend requests sent by the authenticated user.

### POST /api/v1/friends/requests

Send a friend request to another user by their user ID.

### POST /api/v1/friends/requests/{id}/accept

Accept a pending incoming friend request.

### POST /api/v1/friends/requests/{id}/reject

Reject a pending incoming friend request.

### DELETE /api/v1/friends/requests/{id}

Cancel a pending outgoing friend request.

### DELETE /api/v1/friends/{id}

Remove an existing friend connection. Both users lose access to each other's friend-only content.

### GET /api/v1/friends/discovery/search

Search for users by name or email to send friend requests. Query parameter: `?q={searchTerm}`

---

## Groups

Group endpoints manage group creation, membership, and competitions.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/groups` | Get user's groups | Yes |
| GET | `/api/v1/groups/search` | Search for public groups | Yes |
| GET | `/api/v1/groups/{id}` | Get group details | Yes |
| POST | `/api/v1/groups` | Create a new group | Yes |
| PUT | `/api/v1/groups/{id}` | Update group settings | Yes |
| DELETE | `/api/v1/groups/{id}` | Delete a group | Yes |
| GET | `/api/v1/groups/{id}/members` | Get group members | Yes |
| POST | `/api/v1/groups/{id}/members` | Add a member (admin only) | Yes |
| PUT | `/api/v1/groups/{id}/members/{userId}` | Update member role | Yes |
| DELETE | `/api/v1/groups/{id}/members/{userId}` | Remove a member | Yes |
| POST | `/api/v1/groups/{id}/members/{userId}/approve` | Approve pending member | Yes |
| POST | `/api/v1/groups/{id}/join` | Request to join a group | Yes |
| POST | `/api/v1/groups/join-by-code` | Join group using invite code | Yes |
| POST | `/api/v1/groups/{id}/leave` | Leave a group | Yes |
| GET | `/api/v1/groups/{id}/leaderboard` | Get group leaderboard | Yes |
| POST | `/api/v1/groups/{id}/regenerate-code` | Generate new invite code | Yes |

### GET /api/v1/groups

Get all groups the authenticated user is a member of.

### GET /api/v1/groups/search

Search for public groups by name. Query parameter: `?q={searchTerm}`

### GET /api/v1/groups/{id}

Get detailed information about a specific group.

### POST /api/v1/groups

Create a new group. The creator becomes the group admin.

### PUT /api/v1/groups/{id}

Update group settings such as name, description, or privacy. Admin only.

### DELETE /api/v1/groups/{id}

Permanently delete a group. Admin only.

### GET /api/v1/groups/{id}/members

Get list of all members in a group with their roles.

### POST /api/v1/groups/{id}/members

Directly add a user to the group. Admin only.

### PUT /api/v1/groups/{id}/members/{userId}

Update a member's role (e.g., promote to admin). Admin only.

### DELETE /api/v1/groups/{id}/members/{userId}

Remove a member from the group. Admins can remove others; members can only remove themselves.

### POST /api/v1/groups/{id}/members/{userId}/approve

Approve a pending membership request. Admin only for private groups.

### POST /api/v1/groups/{id}/join

Request to join a group. For public groups, joins immediately. For private groups, creates pending request.

### POST /api/v1/groups/join-by-code

Join a group using an invite code. Works for both public and private groups.

### POST /api/v1/groups/{id}/leave

Leave a group. The last admin cannot leave without transferring ownership.

### GET /api/v1/groups/{id}/leaderboard

Get the group's step leaderboard showing member rankings.

### POST /api/v1/groups/{id}/regenerate-code

Generate a new invite code, invalidating the previous one. Admin only.

---

## Activity

Activity endpoints provide the social activity feed.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/activity/feed` | Get activity feed | Yes |

### GET /api/v1/activity/feed

Get the activity feed showing recent actions from friends and group members. Supports pagination with `?page={n}&limit={n}` parameters.

---

## Notifications

Notification endpoints manage user notifications.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/notifications` | Get all notifications | Yes |
| GET | `/api/v1/notifications/unread/count` | Get unread notification count | Yes |
| PUT | `/api/v1/notifications/{id}/read` | Mark notification as read | Yes |
| PUT | `/api/v1/notifications/read-all` | Mark all notifications as read | Yes |
| DELETE | `/api/v1/notifications/{id}` | Delete a notification | Yes |

### GET /api/v1/notifications

Get all notifications for the authenticated user. Supports pagination.

### GET /api/v1/notifications/unread/count

Get the count of unread notifications. Useful for badge displays.

### PUT /api/v1/notifications/{id}/read

Mark a specific notification as read.

### PUT /api/v1/notifications/read-all

Mark all of the user's notifications as read.

### DELETE /api/v1/notifications/{id}

Delete a specific notification.

---

## Error Codes

Common HTTP status codes returned by the API:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (invalid or missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (e.g., duplicate resource) |
| 422 | Unprocessable Entity (validation failed) |
| 500 | Internal Server Error |

---

## Rate Limiting

The API implements rate limiting to ensure fair usage. Current limits:

- **Authentication endpoints**: 10 requests per minute
- **All other endpoints**: 100 requests per minute

When rate limited, the API returns a 429 status code with a `Retry-After` header.
