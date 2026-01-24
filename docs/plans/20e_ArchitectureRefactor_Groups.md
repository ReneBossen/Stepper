# Plan: Architecture Refactor - Groups Feature

## Summary

Refactor the Groups feature to route all data operations through the .NET API instead of direct Supabase calls. This includes group CRUD, membership management, leaderboards, and invite codes. Some missing endpoints need to be added to the backend.

## Prerequisites

- **20a_ArchitectureRefactor_HttpClient.md** must be complete

## Affected Feature Slices

### Backend (WalkingApp.Api/Groups)
- `GroupsController.cs`: Add missing endpoints (search, join-by-code)
- `GroupService.cs` / `IGroupService.cs`: Add search and code join logic
- Verify existing endpoints work with `/api/v1/` prefix

### Mobile (WalkingApp.Mobile)
- `services/api/groupsApi.ts`: Complete rewrite (except real-time subscription)

## Proposed Types

### Backend - New DTOs (if not existing)

| Type Name | Location | Responsibility |
|-----------|----------|----------------|
| `GroupSearchResponse` | Groups/DTOs | Search results |
| `JoinByCodeRequest` | Groups/DTOs | Request to join by invite code |

## Implementation Steps

### Phase 1: Backend - Add Missing Endpoints

#### Step 1.1: Search Public Groups

Add to `GroupsController.cs`:
```csharp
/// <summary>
/// Search public groups by name
/// </summary>
[HttpGet("search")]
public async Task<ActionResult<ApiResponse<List<GroupSummaryResponse>>>> SearchGroups(
    [FromQuery] string query,
    [FromQuery] int limit = 20)
```

Add to service/repository:
- Search public groups where name contains query
- Return summary (id, name, description, member count)
- Limit results

#### Step 1.2: Join Group by Invite Code

Add to `GroupsController.cs`:
```csharp
/// <summary>
/// Join a group using an invite code
/// </summary>
[HttpPost("join-by-code")]
public async Task<ActionResult<ApiResponse<GroupResponse>>> JoinByCode(
    [FromBody] JoinByCodeRequest request)
```

Create DTO:
```csharp
public record JoinByCodeRequest(string Code);
```

Add to service:
- Find group by invite code
- Add user as member (or pending if approval required)
- Return group details

### Phase 2: Backend - Verify Existing Endpoints

Verify these endpoints exist and work with `/api/v1/` prefix:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/groups` | Get user's groups |
| `GET /api/v1/groups/{id}` | Get group details |
| `POST /api/v1/groups` | Create group |
| `PUT /api/v1/groups/{id}` | Update group |
| `DELETE /api/v1/groups/{id}` | Delete group |
| `GET /api/v1/groups/{id}/members` | Get members |
| `GET /api/v1/groups/{id}/members?status=pending` | Get pending members |
| `POST /api/v1/groups/{id}/members` | Invite/add members |
| `PUT /api/v1/groups/{id}/members/{userId}` | Update member role |
| `DELETE /api/v1/groups/{id}/members/{userId}` | Remove member |
| `POST /api/v1/groups/{id}/members/{userId}/approve` | Approve pending member |
| `POST /api/v1/groups/{id}/join` | Request to join |
| `POST /api/v1/groups/{id}/leave` | Leave group |
| `GET /api/v1/groups/{id}/leaderboard` | Get leaderboard |
| `POST /api/v1/groups/{id}/regenerate-code` | Regenerate invite code |

### Phase 3: Mobile - Refactor groupsApi.ts

Replace all Supabase calls with HTTP client calls (except real-time):

| Current Function | New Implementation |
|------------------|-------------------|
| `getMyGroups()` | `GET /api/v1/groups` |
| `getGroups()` | `GET /api/v1/groups/search` |
| `searchPublicGroups(query)` | `GET /api/v1/groups/search?query=...` |
| `getGroup(id)` | `GET /api/v1/groups/{id}` |
| `getGroupDetails(id)` | `GET /api/v1/groups/{id}` |
| `createGroup(data)` | `POST /api/v1/groups` |
| `updateGroup(id, data)` | `PUT /api/v1/groups/{id}` |
| `deleteGroup(id)` | `DELETE /api/v1/groups/{id}` |
| `getMembers(groupId)` | `GET /api/v1/groups/{id}/members` |
| `getPendingMembers(groupId)` | `GET /api/v1/groups/{id}/members?status=pending` |
| `inviteFriends(groupId, userIds)` | `POST /api/v1/groups/{id}/members` |
| `promoteMember(groupId, userId)` | `PUT /api/v1/groups/{id}/members/{userId}` |
| `demoteMember(groupId, userId)` | `PUT /api/v1/groups/{id}/members/{userId}` |
| `removeMember(groupId, userId)` | `DELETE /api/v1/groups/{id}/members/{userId}` |
| `approveMember(groupId, userId)` | `POST /api/v1/groups/{id}/members/{userId}/approve` |
| `denyMember(groupId, userId)` | `DELETE /api/v1/groups/{id}/members/{userId}` |
| `joinGroup(groupId)` | `POST /api/v1/groups/{id}/join` |
| `joinGroupByCode(code)` | `POST /api/v1/groups/join-by-code` |
| `leaveGroup(groupId)` | `POST /api/v1/groups/{id}/leave` |
| `getLeaderboard(groupId)` | `GET /api/v1/groups/{id}/leaderboard` |
| `getInviteCode(groupId)` | Part of `GET /api/v1/groups/{id}` response |
| `generateInviteCode(groupId)` | `POST /api/v1/groups/{id}/regenerate-code` |
| `subscribeToLeaderboard(...)` | **KEEP AS-IS** - Supabase real-time |

```typescript
import { apiClient } from './client';
import { supabase } from '../supabase';
import type {
  Group,
  GroupMember,
  GroupLeaderboard,
  CreateGroupRequest,
  UpdateGroupRequest
} from '../../types/groups';

export const groupsApi = {
  // === Group CRUD ===

  getMyGroups: async (): Promise<Group[]> => {
    return apiClient.get<Group[]>('/groups');
  },

  searchPublicGroups: async (query: string): Promise<Group[]> => {
    const encodedQuery = encodeURIComponent(query);
    return apiClient.get<Group[]>(`/groups/search?query=${encodedQuery}`);
  },

  getGroup: async (id: string): Promise<Group> => {
    return apiClient.get<Group>(`/groups/${id}`);
  },

  createGroup: async (data: CreateGroupRequest): Promise<Group> => {
    return apiClient.post<Group>('/groups', data);
  },

  updateGroup: async (id: string, data: UpdateGroupRequest): Promise<Group> => {
    return apiClient.put<Group>(`/groups/${id}`, data);
  },

  deleteGroup: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/groups/${id}`);
  },

  // === Membership ===

  getMembers: async (groupId: string): Promise<GroupMember[]> => {
    return apiClient.get<GroupMember[]>(`/groups/${groupId}/members`);
  },

  getPendingMembers: async (groupId: string): Promise<GroupMember[]> => {
    return apiClient.get<GroupMember[]>(`/groups/${groupId}/members?status=pending`);
  },

  inviteFriends: async (groupId: string, userIds: string[]): Promise<void> => {
    return apiClient.post<void>(`/groups/${groupId}/members`, { userIds });
  },

  updateMemberRole: async (
    groupId: string,
    userId: string,
    role: 'admin' | 'member'
  ): Promise<void> => {
    return apiClient.put<void>(`/groups/${groupId}/members/${userId}`, { role });
  },

  removeMember: async (groupId: string, userId: string): Promise<void> => {
    return apiClient.delete<void>(`/groups/${groupId}/members/${userId}`);
  },

  approveMember: async (groupId: string, userId: string): Promise<void> => {
    return apiClient.post<void>(`/groups/${groupId}/members/${userId}/approve`);
  },

  denyMember: async (groupId: string, userId: string): Promise<void> => {
    return apiClient.delete<void>(`/groups/${groupId}/members/${userId}`);
  },

  // === Join/Leave ===

  joinGroup: async (groupId: string): Promise<void> => {
    return apiClient.post<void>(`/groups/${groupId}/join`);
  },

  joinGroupByCode: async (code: string): Promise<Group> => {
    return apiClient.post<Group>('/groups/join-by-code', { code });
  },

  leaveGroup: async (groupId: string): Promise<void> => {
    return apiClient.post<void>(`/groups/${groupId}/leave`);
  },

  // === Leaderboard ===

  getLeaderboard: async (groupId: string): Promise<GroupLeaderboard> => {
    return apiClient.get<GroupLeaderboard>(`/groups/${groupId}/leaderboard`);
  },

  // === Invite Codes ===

  regenerateInviteCode: async (groupId: string): Promise<{ code: string }> => {
    return apiClient.post<{ code: string }>(`/groups/${groupId}/regenerate-code`);
  },

  // === Real-time (KEEP SUPABASE) ===

  subscribeToLeaderboard: (
    groupId: string,
    callback: (leaderboard: GroupLeaderboard) => void
  ) => {
    // Keep using Supabase real-time for live updates
    return supabase
      .channel(`leaderboard:${groupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'step_entries',
        // Filter for group members would be added here
      }, () => {
        // Fetch updated leaderboard via API
        groupsApi.getLeaderboard(groupId).then(callback);
      })
      .subscribe();
  },
};
```

## Dependencies

### New Packages Required

**None**

## Database Changes

**None**

## Tests

### Backend Unit Tests
- `WalkingApp.Api.Tests/Groups/GroupServiceSearchTests.cs`
- `WalkingApp.Api.Tests/Groups/GroupServiceJoinByCodeTests.cs`

### Backend Integration Tests
- `WalkingApp.Api.Tests/Groups/GroupsControllerSearchTests.cs`
- `WalkingApp.Api.Tests/Groups/GroupsControllerJoinByCodeTests.cs`

### Mobile Tests
- Update `WalkingApp.Mobile/src/services/api/__tests__/groupsApi.test.ts`
- Mock `apiClient` instead of Supabase (except real-time)
- Test all 20+ functions

## Acceptance Criteria

### Backend
- [ ] `GET /api/v1/groups/search?query=...` returns matching public groups
- [ ] `POST /api/v1/groups/join-by-code` joins group by code
- [ ] All existing endpoints work with `/api/v1/` prefix
- [ ] New endpoints have XML documentation

### Mobile
- [ ] `groupsApi.ts` makes zero direct Supabase data calls (except real-time)
- [ ] All 20+ functions work correctly
- [ ] Real-time subscription still works
- [ ] All existing functionality works as before
- [ ] Updated tests pass

## Risks & Open Questions

### Risks
1. **Complex API surface**: Many endpoints to verify
   - Mitigation: Systematic verification checklist

2. **Real-time hybrid**: Mixing API calls with Supabase real-time
   - Mitigation: Document as intentional, well-tested

### Open Questions
- None

## Agent Assignment

| Phase | Agent | Notes |
|-------|-------|-------|
| 1 | Backend Engineer | Add missing endpoints |
| 2 | Backend Engineer | Verify existing endpoints |
| 3 | Frontend Engineer | API refactoring |
| Tests | Tester | Write and verify tests |
