# Plan: Architecture Refactor - Activity Feature

## Summary

Create a new Activity feature slice in the backend and refactor the mobile Activity API to route through the .NET API. The Activity feature provides a feed of friends' recent activities (steps recorded, achievements, etc.).

## Prerequisites

- **20a_ArchitectureRefactor_HttpClient.md** must be complete

## Affected Feature Slices

### Backend (WalkingApp.Api/Activity) - NEW
- `ActivityController.cs`: HTTP endpoints
- `ActivityService.cs` / `IActivityService.cs`: Business logic
- `ActivityRepository.cs` / `IActivityRepository.cs`: Data access
- `ActivityItem.cs`: Domain model
- `ActivityEntity.cs`: Database entity
- `DTOs/`: Request/response types

### Mobile (WalkingApp.Mobile)
- `services/api/activityApi.ts`: Complete rewrite (except real-time)

## Proposed Types

### Backend - New Feature Slice

| Type Name | Location | Responsibility |
|-----------|----------|----------------|
| `ActivityController` | Activity/ | HTTP endpoints |
| `IActivityService` | Activity/ | Service interface |
| `ActivityService` | Activity/ | Business logic |
| `IActivityRepository` | Activity/ | Repository interface |
| `ActivityRepository` | Activity/ | Data access via Supabase |
| `ActivityItem` | Activity/ | Domain model |
| `ActivityEntity` | Activity/ | Database entity |
| `ActivityFeedResponse` | Activity/DTOs | Paginated feed response |
| `ActivityItemResponse` | Activity/DTOs | Single activity item |

## Implementation Steps

### Phase 1: Backend - Create Activity Feature Slice

#### Step 1.1: Create Domain Model

Create `WalkingApp.Api/Activity/ActivityItem.cs`:
```csharp
public class ActivityItem
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string? UserAvatarUrl { get; set; }
    public ActivityType Type { get; set; }
    public string Description { get; set; } = string.Empty;
    public int? StepCount { get; set; }
    public double? Distance { get; set; }
    public DateTime CreatedAt { get; set; }
}

public enum ActivityType
{
    StepsRecorded,
    DailyGoalAchieved,
    WeeklyGoalAchieved,
    StreakAchieved,
    FriendAdded,
    GroupJoined
}
```

#### Step 1.2: Create Database Entity

Create `WalkingApp.Api/Activity/ActivityEntity.cs`:
```csharp
[Table("activity_feed")]
internal class ActivityEntity : BaseModel
{
    [PrimaryKey("id")]
    public Guid Id { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("type")]
    public string Type { get; set; } = string.Empty;

    [Column("description")]
    public string Description { get; set; } = string.Empty;

    [Column("step_count")]
    public int? StepCount { get; set; }

    [Column("distance")]
    public double? Distance { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    // Mapping methods...
}
```

#### Step 1.3: Create DTOs

Create `WalkingApp.Api/Activity/DTOs/ActivityItemResponse.cs`:
```csharp
public record ActivityItemResponse(
    Guid Id,
    Guid UserId,
    string UserName,
    string? UserAvatarUrl,
    string Type,
    string Description,
    int? StepCount,
    double? Distance,
    DateTime CreatedAt
);
```

Create `WalkingApp.Api/Activity/DTOs/ActivityFeedResponse.cs`:
```csharp
public record ActivityFeedResponse(
    List<ActivityItemResponse> Items,
    int TotalCount,
    bool HasMore
);
```

#### Step 1.4: Create Repository

Create `WalkingApp.Api/Activity/IActivityRepository.cs`:
```csharp
public interface IActivityRepository
{
    Task<List<ActivityItem>> GetFeedAsync(Guid userId, int limit, int offset);
    Task<int> GetFeedCountAsync(Guid userId);
    Task CreateActivityAsync(ActivityItem activity);
}
```

Create `WalkingApp.Api/Activity/ActivityRepository.cs`:
- Query activity_feed table for friends' activities
- Join with users table for names/avatars
- Filter to only show friends' activities
- Order by created_at descending

#### Step 1.5: Create Service

Create `WalkingApp.Api/Activity/IActivityService.cs`:
```csharp
public interface IActivityService
{
    Task<ActivityFeedResponse> GetFeedAsync(Guid userId, int limit = 20, int offset = 0);
}
```

Create `WalkingApp.Api/Activity/ActivityService.cs`:
- Get user's friends list
- Fetch activities from friends
- Map to response DTOs
- Calculate pagination

#### Step 1.6: Create Controller

Create `WalkingApp.Api/Activity/ActivityController.cs`:
```csharp
[ApiController]
[Route("api/v1/activity")]
[Authorize]
public class ActivityController : ControllerBase
{
    /// <summary>
    /// Get activity feed from friends
    /// </summary>
    [HttpGet("feed")]
    public async Task<ActionResult<ApiResponse<ActivityFeedResponse>>> GetFeed(
        [FromQuery] int limit = 20,
        [FromQuery] int offset = 0)
}
```

#### Step 1.7: Register Services

Add to `Program.cs`:
```csharp
services.AddScoped<IActivityService, ActivityService>();
services.AddScoped<IActivityRepository, ActivityRepository>();
```

### Phase 2: Mobile - Refactor activityApi.ts

Replace Supabase calls with HTTP client calls (except real-time):

| Current Function | New Implementation |
|------------------|-------------------|
| `getFeed(params)` | `GET /api/v1/activity/feed?limit=...&offset=...` |
| `subscribeToFeed(...)` | **KEEP AS-IS** - Supabase real-time |

```typescript
import { apiClient } from './client';
import { supabase } from '../supabase';
import type { ActivityFeed, ActivityItem } from '../../types/activity';

export const activityApi = {
  getFeed: async (params: {
    limit?: number;
    offset?: number;
  } = {}): Promise<ActivityFeed> => {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    const endpoint = query ? `/activity/feed?${query}` : '/activity/feed';

    return apiClient.get<ActivityFeed>(endpoint);
  },

  // === Real-time (KEEP SUPABASE) ===

  subscribeToFeed: (
    userId: string,
    friendIds: string[],
    callback: (item: ActivityItem) => void
  ) => {
    // Keep using Supabase real-time for live updates
    return supabase
      .channel(`activity:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_feed',
        filter: `user_id=in.(${friendIds.join(',')})`,
      }, (payload) => {
        callback(payload.new as ActivityItem);
      })
      .subscribe();
  },
};
```

## Dependencies

### New Packages Required

**None**

## Database Changes

**Verify table exists**: `activity_feed` table should already exist from previous mobile implementation. If not, create migration:

```sql
CREATE TABLE IF NOT EXISTS activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    step_count INTEGER,
    distance DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying friends' activities
CREATE INDEX idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX idx_activity_feed_created_at ON activity_feed(created_at DESC);

-- RLS Policy: Users can view friends' activities
CREATE POLICY "Users can view friends activities"
    ON activity_feed FOR SELECT
    USING (
        user_id IN (
            SELECT friend_id FROM friendships
            WHERE user_id = auth.uid() AND status = 'accepted'
        )
        OR user_id = auth.uid()
    );
```

## Tests

### Backend Unit Tests
- `WalkingApp.Api.Tests/Activity/ActivityServiceTests.cs`
  - Test feed retrieval
  - Test pagination
  - Test friend filtering

### Backend Integration Tests
- `WalkingApp.Api.Tests/Activity/ActivityControllerTests.cs`
  - Test feed endpoint
  - Test authorization
  - Test pagination parameters

### Mobile Tests
- Update `WalkingApp.Mobile/src/services/api/__tests__/activityApi.test.ts`
- Mock `apiClient` instead of Supabase (except real-time)

## Acceptance Criteria

### Backend
- [ ] Activity feature slice is complete (controller, service, repository)
- [ ] `GET /api/v1/activity/feed` returns paginated feed
- [ ] Feed only includes friends' activities
- [ ] Feed is ordered by most recent first
- [ ] Pagination works correctly (limit, offset, hasMore)
- [ ] All endpoints have XML documentation

### Mobile
- [ ] `activityApi.ts` makes zero direct Supabase data calls (except real-time)
- [ ] `getFeed()` returns correctly typed response
- [ ] Real-time subscription still works
- [ ] All existing functionality works as before
- [ ] Updated tests pass

## Risks & Open Questions

### Risks
1. **Database table may not exist**: Need to verify or create migration
   - Mitigation: Check database schema first

2. **Activity creation**: Who creates activity items?
   - Note: This plan focuses on reading. Activity creation triggers may exist via database triggers or need separate implementation.

### Open Questions
- None

## Agent Assignment

| Phase | Agent | Notes |
|-------|-------|-------|
| DB Check | Database Engineer | Verify/create activity_feed table |
| 1 | Backend Engineer | Create Activity feature slice |
| 2 | Frontend Engineer | API refactoring |
| Tests | Tester | Write and verify tests |
