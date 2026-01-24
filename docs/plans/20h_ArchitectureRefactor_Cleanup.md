# Plan: Architecture Refactor - Cleanup and Documentation

## Summary

Final cleanup phase after all feature refactoring is complete. This plan ensures all direct Supabase imports are removed from API files, documentation is updated, all tests pass, and the architecture is properly documented.

## Prerequisites

- **20a through 20g** must ALL be complete

## Affected Areas

### Mobile (WalkingApp.Mobile)
- All `services/api/*.ts` files
- Store files that may have Supabase imports
- Type definitions

### Backend (WalkingApp.Api)
- Controller route consistency
- API documentation

### Documentation
- Architecture documentation
- API reference

## Implementation Steps

### Phase 1: Mobile - Remove Direct Supabase Imports

#### Step 1.1: Audit All API Files

Check each file in `WalkingApp.Mobile/src/services/api/` for direct Supabase imports:

| File | Expected State |
|------|---------------|
| `client.ts` | Supabase import OK (for auth token) |
| `usersApi.ts` | NO Supabase imports |
| `userPreferencesApi.ts` | NO Supabase imports |
| `stepsApi.ts` | NO Supabase imports |
| `friendsApi.ts` | NO Supabase imports |
| `groupsApi.ts` | Supabase OK for real-time only |
| `activityApi.ts` | Supabase OK for real-time only |
| `notificationsApi.ts` | NO Supabase imports |

#### Step 1.2: Remove Unauthorized Imports

For any file with unauthorized Supabase imports:
1. Identify which functions still use Supabase
2. Refactor to use `apiClient`
3. Remove unused imports

#### Step 1.3: Verify Real-Time Only Usage

For files with allowed Supabase imports (groups, activity):
- Verify imports are ONLY for real-time subscriptions
- Verify no data mutations go through Supabase

### Phase 2: Mobile - Update Store Files

#### Step 2.1: Audit Store Files

Check each store in `WalkingApp.Mobile/src/store/` for direct Supabase usage:

- Stores should use API functions, not direct Supabase calls
- Auth store is exception (uses Supabase Auth)

#### Step 2.2: Update If Needed

If any store directly calls Supabase:
1. Refactor to call the appropriate API function
2. Update error handling for new response format

### Phase 3: Backend - Consistency Check

#### Step 3.1: Verify All Routes

Confirm all controllers use consistent `/api/v1/` prefix:

```
UsersController      -> /api/v1/users
StepsController      -> /api/v1/steps
FriendsController    -> /api/v1/friends
GroupsController     -> /api/v1/groups
ActivityController   -> /api/v1/activity
NotificationsController -> /api/v1/notifications
```

#### Step 3.2: Verify Response Format

All endpoints should return `ApiResponse<T>`:
```json
{
  "success": true,
  "data": { ... },
  "errors": []
}
```

#### Step 3.3: Update XML Documentation

Ensure all public endpoints have complete XML documentation:
- Summary
- Parameters
- Response codes
- Example responses (where helpful)

### Phase 4: Run All Tests

#### Step 4.1: Backend Tests

```bash
cd WalkingApp.Api.Tests
dotnet test
```

All tests must pass. Fix any failures.

#### Step 4.2: Mobile Tests

```bash
cd WalkingApp.Mobile
npm test
```

All tests must pass. Fix any failures.

#### Step 4.3: Architecture Tests

If NetArchTest rules exist, verify they pass:
- Controllers don't contain business logic
- Services don't directly access database
- Feature slices are independent

### Phase 5: Update Documentation

#### Step 5.1: Update Architecture Documentation

Update `docs/ARCHITECTURE.md`:
- Document API Gateway pattern
- Document `/api/v1/` versioning
- Document real-time subscription exceptions
- Update data flow diagrams

#### Step 5.2: Update API Reference

Create or update API reference showing all endpoints:

```markdown
## API Reference

### Users
- GET /api/v1/users/me
- PUT /api/v1/users/me
- GET /api/v1/users/me/preferences
- PUT /api/v1/users/me/preferences
- POST /api/v1/users/me/avatar
- GET /api/v1/users/{id}

### Steps
- POST /api/v1/steps
- GET /api/v1/steps/today
- GET /api/v1/steps/stats
- GET /api/v1/steps/history
- GET /api/v1/steps/daily

### Friends
- GET /api/v1/friends
- GET /api/v1/friends/requests/incoming
- GET /api/v1/friends/requests/outgoing
- POST /api/v1/friends/requests
- POST /api/v1/friends/requests/{id}/accept
- POST /api/v1/friends/requests/{id}/reject
- DELETE /api/v1/friends/requests/{id}
- DELETE /api/v1/friends/{id}
- GET /api/v1/friends/discovery/search

### Groups
- GET /api/v1/groups
- GET /api/v1/groups/search
- GET /api/v1/groups/{id}
- POST /api/v1/groups
- PUT /api/v1/groups/{id}
- DELETE /api/v1/groups/{id}
- GET /api/v1/groups/{id}/members
- POST /api/v1/groups/{id}/members
- PUT /api/v1/groups/{id}/members/{userId}
- DELETE /api/v1/groups/{id}/members/{userId}
- POST /api/v1/groups/{id}/members/{userId}/approve
- POST /api/v1/groups/{id}/join
- POST /api/v1/groups/join-by-code
- POST /api/v1/groups/{id}/leave
- GET /api/v1/groups/{id}/leaderboard
- POST /api/v1/groups/{id}/regenerate-code

### Activity
- GET /api/v1/activity/feed

### Notifications
- GET /api/v1/notifications
- GET /api/v1/notifications/unread/count
- PUT /api/v1/notifications/{id}/read
- PUT /api/v1/notifications/read-all
- DELETE /api/v1/notifications/{id}
```

#### Step 5.3: Update CLAUDE.md if Needed

If any project conventions changed, update `CLAUDE.md`.

### Phase 6: Final Verification

#### Step 6.1: Manual Testing Checklist

- [ ] User can log in (Supabase Auth still works)
- [ ] User can view/update profile
- [ ] User can upload avatar
- [ ] User can view/update preferences
- [ ] User can record steps
- [ ] User can view step history and stats
- [ ] User can view friends list
- [ ] User can send/accept/decline friend requests
- [ ] User can search for new friends
- [ ] User can create/join/leave groups
- [ ] User can view group leaderboards
- [ ] User can view activity feed
- [ ] User can view notifications
- [ ] User can mark notifications as read
- [ ] Real-time updates work for leaderboards
- [ ] Real-time updates work for activity feed

#### Step 6.2: Performance Check

- API response times are acceptable (<500ms for most operations)
- No excessive network calls
- No memory leaks

## Dependencies

### New Packages Required

**None**

## Database Changes

**None**

## Tests

This phase primarily runs existing tests, not creates new ones.

## Acceptance Criteria

### Mobile
- [ ] NO direct Supabase data calls in API files (except auth and real-time)
- [ ] All API files import from `./client`
- [ ] All stores use API functions
- [ ] All mobile tests pass

### Backend
- [ ] All controllers use `/api/v1/` prefix
- [ ] All endpoints return `ApiResponse<T>` format
- [ ] All endpoints have XML documentation
- [ ] All backend tests pass

### Documentation
- [ ] Architecture documentation is updated
- [ ] API reference is complete
- [ ] Data flow diagrams reflect new architecture

### Quality
- [ ] No build warnings
- [ ] All tests pass
- [ ] Manual testing confirms functionality

## Risks & Open Questions

### Risks
1. **Undiscovered direct Supabase usage**: May find additional places needing refactoring
   - Mitigation: Thorough code review

### Open Questions
- None

## Agent Assignment

| Phase | Agent | Notes |
|-------|-------|-------|
| 1-2 | Frontend Engineer | Code cleanup |
| 3 | Backend Engineer | Consistency check |
| 4 | Tester | Run all tests |
| 5 | Architecture Engineer | Documentation |
| 6 | Reviewer | Final verification |

## Completion

After this phase:
1. All 54+ direct Supabase data calls have been migrated
2. Architecture follows API Gateway pattern
3. Mobile app only uses Supabase for:
   - Authentication (getting JWT tokens)
   - Real-time subscriptions (leaderboards, activity feed)
4. All data operations go through .NET API
5. Documentation is complete and accurate
