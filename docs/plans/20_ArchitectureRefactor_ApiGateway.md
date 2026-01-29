# Plan: Architecture Refactor - API Gateway Pattern (Master Plan)

## Summary

The Stepper mobile application currently bypasses the .NET API backend and makes direct calls to Supabase for all data operations. This violates the intended architecture where the mobile app should route ALL operations through the .NET API, including authentication. This master plan coordinates the complete refactoring effort.

**User Decisions:**
1. **API Versioning**: YES - All endpoints will use `/api/v1/` prefix
2. **Avatar Uploads**: Through backend - All file uploads go through .NET API (no direct Supabase Storage access from mobile)
3. **Scope**: Split by feature - Each feature area has its own sub-plan for independent execution
4. **Authentication**: Through backend - All auth operations go through .NET API (no direct Supabase Auth calls from mobile)

## Current Architecture (Incorrect)

```
Mobile App --> Supabase --> PostgreSQL
     |
     +--> Supabase Auth (JWT) [DIRECT - TO BE REMOVED]
```

## Target Architecture (Correct)

```
Mobile App --> .NET API (/api/v1/) --> Supabase --> PostgreSQL
                    |                      |
                    +--> Auth endpoints    +--> Supabase Auth
                    +--> Validates JWT     +--> Supabase Storage (avatars)
                    +--> Uses Supabase Client
```

**Goal**: ZERO Supabase SDK usage in mobile app - all communication goes through .NET API.

## Sub-Plans

This refactoring is split into 9 self-contained sub-plans. Authentication (20i) must be done after HTTP client (20a) but before other feature plans.

| Sub-Plan | Name | Dependencies | Description |
|----------|------|--------------|-------------|
| **20a** | HttpClient | None | HTTP client infrastructure setup (MUST be done first) |
| **20i** | Auth | 20a | Authentication through backend (MUST be done second) |
| **20b** | Users | 20a, 20i | Users feature (profile, preferences, avatar upload) |
| **20c** | Steps | 20a, 20i | Steps feature (recording, history, stats) |
| **20d** | Friends | 20a, 20i | Friends feature (list, requests, search) |
| **20e** | Groups | 20a, 20i | Groups feature (CRUD, members, leaderboards) |
| **20f** | Activity | 20a, 20i | Activity feed (NEW backend feature + mobile) |
| **20g** | Notifications | 20a, 20i | Notifications (NEW backend feature + mobile) |
| **20h** | Cleanup | All above | Final cleanup, documentation, verification |

## Execution Order

```
                    [20a: HttpClient]
                          |
                    [20i: Auth]
                          |
        +-----------------+------------------+
        |        |        |        |         |
      [20b]    [20c]    [20d]    [20e]    [20f]    [20g]
      Users    Steps   Friends  Groups  Activity  Notif
        |        |        |        |         |       |
        +-----------------+------------------+-------+
                          |
                    [20h: Cleanup]
```

**Execution Notes**:
- 20a MUST be done first (HTTP client infrastructure)
- 20i MUST be done second (auth through backend - other features depend on auth working)
- Plans 20b through 20g can be executed in parallel after 20i is complete

## API Versioning

All API endpoints will use the `/api/v1/` prefix:

- `GET /api/v1/users/me` (not `/api/users/me`)
- `POST /api/v1/steps` (not `/api/steps`)
- `GET /api/v1/friends` (not `/api/friends`)

This allows for future API evolution without breaking existing clients.

## Avatar Upload Architecture

All avatar uploads go through the .NET API backend:

```
Mobile App --> .NET API --> Supabase Storage
               (multipart/form-data)
```

The mobile app does NOT have direct access to Supabase Storage. Benefits:
- Centralized file validation and processing
- Consistent security model
- Backend can resize/optimize images
- Single point of control for storage operations

## Real-Time Subscriptions Exception

The following Supabase real-time subscriptions are **allowed** to remain in the mobile app:
- `groupsApi.subscribeToLeaderboard()` - Live leaderboard updates
- `activityApi.subscribeToFeed()` - Live activity feed updates

These are read-only subscriptions that do not perform data mutations and provide better UX than polling the API.

**Note**: If even real-time subscriptions need to be removed, the backend would need to implement WebSocket endpoints. This is out of scope for this refactor.

## OAuth Considerations

Google/Apple Sign-In is NOT fully migrated in this refactor. The current browser-based OAuth flow using Supabase SDK will remain temporarily. Fully removing Supabase SDK for OAuth would require:
- Backend OAuth initiation endpoints
- Backend OAuth callback endpoints
- Deep linking configuration
- Additional security considerations

This is documented in 20i and can be addressed in a future plan if needed.

## Detailed Audit

### Mobile API Services - Direct Supabase Calls to Remove

| File | Functions | Supabase Calls | Backend Status | Sub-Plan |
|------|-----------|----------------|----------------|----------|
| `supabase.ts` | 7 | 7 | Missing Auth endpoints | 20i |
| `usersApi.ts` | 3 | 6 | Partial | 20b |
| `userPreferencesApi.ts` | 2 | 3 | Missing endpoints | 20b |
| `stepsApi.ts` | 5 | 10 | Partial | 20c |
| `friendsApi.ts` | 13 | 28 | Complete | 20d |
| `groupsApi.ts` | 24 | 48+ | Mostly complete | 20e |
| `activityApi.ts` | 2 | 3 | Missing feature | 20f |
| `notificationsApi.ts` | 5 | 5 | Missing feature | 20g |

**Total: 61+ direct Supabase calls to migrate (including auth)**

## Estimated Effort

| Sub-Plan | Description | Effort |
|----------|-------------|--------|
| 20a | HTTP Client Infrastructure | 0.5 day |
| 20i | Authentication Feature | 1.5 days |
| 20b | Users Feature | 1 day |
| 20c | Steps Feature | 1 day |
| 20d | Friends Feature | 1 day |
| 20e | Groups Feature | 1.5 days |
| 20f | Activity Feature | 1.5 days |
| 20g | Notifications Feature | 1.5 days |
| 20h | Cleanup & Documentation | 1 day |
| **Total** | | **10.5 days** |

## Agent Assignments

| Sub-Plan | Primary Agent | Notes |
|----------|---------------|-------|
| 20a | Frontend Engineer | HTTP client and config |
| 20i | Backend + Frontend | Auth feature slice + mobile refactor |
| 20b-20g | Backend + Frontend | Backend first, then Frontend |
| 20h | Reviewer + Architecture Engineer | Final review and docs |

## Success Criteria

After all sub-plans are complete:

1. Mobile app makes ZERO direct Supabase SDK calls (except real-time subscriptions)
2. All authentication goes through backend API
3. All API endpoints use `/api/v1/` prefix
4. All avatar uploads go through backend
5. All existing functionality works as before
6. All tests pass
7. Architecture documentation is updated

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking changes | Phased rollout, comprehensive testing per sub-plan |
| Extra network hop latency | API is lightweight; benefit is centralized logic |
| Hybrid real-time architecture | Documented as intentional; read-only subscriptions |
| File upload complexity | FormData in mobile, multipart handling in backend |

## Related Files

- Sub-plans: `20a` through `20i` in this folder
- Architecture: `.claude/policies/architecture.md`
- API patterns: `docs/ARCHITECTURE.md`
