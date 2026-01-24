# Plan: Architecture Refactor - Friends Feature

## Summary

Refactor the Friends feature to route all data operations through the .NET API instead of direct Supabase calls. The backend already has complete endpoints for friends functionality, so this is primarily a mobile-side refactoring.

## Prerequisites

- **20a_ArchitectureRefactor_HttpClient.md** must be complete

## Affected Feature Slices

### Backend (WalkingApp.Api/Friends)
- Verify existing endpoints work with `/api/v1/` prefix
- No new endpoints needed (feature is complete)

### Mobile (WalkingApp.Mobile)
- `services/api/friendsApi.ts`: Complete rewrite

## Implementation Steps

### Phase 1: Backend - Verify Existing Endpoints

Verify these endpoints exist and work correctly with `/api/v1/` prefix:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/friends` | Get friends list (includes today's steps) |
| `GET /api/v1/friends/requests/incoming` | Get incoming friend requests |
| `GET /api/v1/friends/requests/outgoing` | Get outgoing friend requests |
| `POST /api/v1/friends/requests` | Send friend request |
| `POST /api/v1/friends/requests/{id}/accept` | Accept friend request |
| `POST /api/v1/friends/requests/{id}/reject` | Reject friend request |
| `DELETE /api/v1/friends/requests/{id}` | Cancel outgoing request |
| `DELETE /api/v1/friends/{id}` | Remove friend |
| `GET /api/v1/friends/discovery/search?query=...` | Search users |
| `GET /api/v1/users/{id}` | Get user by ID (in Users controller) |

### Phase 2: Mobile - Refactor friendsApi.ts

Replace all Supabase calls with HTTP client calls:

| Current Function | New Implementation |
|------------------|-------------------|
| `getFriends()` | `GET /api/v1/friends` |
| `getFriendsWithSteps()` | `GET /api/v1/friends` (backend includes steps) |
| `getRequests()` | `GET /api/v1/friends/requests/incoming` |
| `getOutgoingRequests()` | `GET /api/v1/friends/requests/outgoing` |
| `sendRequest(userId)` | `POST /api/v1/friends/requests` |
| `acceptRequest(requestId)` | `POST /api/v1/friends/requests/{id}/accept` |
| `declineRequest(requestId)` | `POST /api/v1/friends/requests/{id}/reject` |
| `cancelRequest(requestId)` | `DELETE /api/v1/friends/requests/{id}` |
| `removeFriend(friendId)` | `DELETE /api/v1/friends/{id}` |
| `searchUsers(query)` | `GET /api/v1/friends/discovery/search?query=...` |
| `getUserById(id)` | `GET /api/v1/users/{id}` |
| `checkFriendshipStatus(userId)` | Derive from friends list locally |

```typescript
import { apiClient } from './client';
import type {
  Friend,
  FriendRequest,
  FriendWithSteps,
  UserSearchResult
} from '../../types/friends';

export const friendsApi = {
  getFriends: async (): Promise<FriendWithSteps[]> => {
    return apiClient.get<FriendWithSteps[]>('/friends');
  },

  // Alias for getFriends - backend always includes steps
  getFriendsWithSteps: async (): Promise<FriendWithSteps[]> => {
    return apiClient.get<FriendWithSteps[]>('/friends');
  },

  getIncomingRequests: async (): Promise<FriendRequest[]> => {
    return apiClient.get<FriendRequest[]>('/friends/requests/incoming');
  },

  getOutgoingRequests: async (): Promise<FriendRequest[]> => {
    return apiClient.get<FriendRequest[]>('/friends/requests/outgoing');
  },

  sendRequest: async (userId: string): Promise<FriendRequest> => {
    return apiClient.post<FriendRequest>('/friends/requests', { userId });
  },

  acceptRequest: async (requestId: string): Promise<void> => {
    return apiClient.post<void>(`/friends/requests/${requestId}/accept`);
  },

  declineRequest: async (requestId: string): Promise<void> => {
    return apiClient.post<void>(`/friends/requests/${requestId}/reject`);
  },

  cancelRequest: async (requestId: string): Promise<void> => {
    return apiClient.delete<void>(`/friends/requests/${requestId}`);
  },

  removeFriend: async (friendId: string): Promise<void> => {
    return apiClient.delete<void>(`/friends/${friendId}`);
  },

  searchUsers: async (query: string): Promise<UserSearchResult[]> => {
    const encodedQuery = encodeURIComponent(query);
    return apiClient.get<UserSearchResult[]>(
      `/friends/discovery/search?query=${encodedQuery}`
    );
  },

  getUserById: async (id: string): Promise<Friend> => {
    return apiClient.get<Friend>(`/users/${id}`);
  },

  // Check friendship status by checking if user is in friends list
  // This is derived locally, not a separate API call
  checkFriendshipStatus: async (
    userId: string,
    friends: FriendWithSteps[]
  ): Promise<'friends' | 'pending' | 'none'> => {
    const friend = friends.find(f => f.id === userId);
    if (friend) return 'friends';

    // Check outgoing requests
    const outgoing = await friendsApi.getOutgoingRequests();
    if (outgoing.some(r => r.receiverId === userId)) return 'pending';

    return 'none';
  },
};
```

### Phase 3: Update Store if Needed

Review and update `friendsStore.ts` if the response format differs from current expectations.

## Dependencies

### New Packages Required

**None**

## Database Changes

**None**

## Tests

### Backend Integration Tests
- Verify all endpoints work with `/api/v1/` prefix

### Mobile Tests
- Update `WalkingApp.Mobile/src/services/api/__tests__/friendsApi.test.ts`
- Mock `apiClient` instead of Supabase
- Test all 12 functions

## Acceptance Criteria

### Backend
- [ ] All existing endpoints work with `/api/v1/` prefix
- [ ] Response format matches mobile expectations

### Mobile
- [ ] `friendsApi.ts` makes zero direct Supabase data calls
- [ ] All 12 functions work correctly
- [ ] `getFriends()` and `getFriendsWithSteps()` return same data
- [ ] Search properly encodes query parameters
- [ ] All existing functionality works as before
- [ ] Updated tests pass

## Risks & Open Questions

### Risks
1. **Response format mismatch**: Backend DTOs may differ from current mobile types
   - Mitigation: Verify and update types as needed

### Open Questions
- None

## Agent Assignment

| Phase | Agent | Notes |
|-------|-------|-------|
| 1 | Backend Engineer | Verify endpoints |
| 2-3 | Frontend Engineer | API refactoring |
| Tests | Tester | Write and verify tests |
