# Plan: Architecture Refactor - Steps Feature

## Summary

Refactor the Steps feature to route all data operations through the .NET API instead of direct Supabase calls. This includes recording steps, retrieving history, and getting statistics.

## Prerequisites

- **20a_ArchitectureRefactor_HttpClient.md** must be complete

## Affected Feature Slices

### Backend (Stepper.Api/Steps)
- `StepsController.cs`: Add stats endpoint
- `StepService.cs` / `IStepService.cs`: Add statistics calculation
- `DTOs/`: New response type for stats

### Mobile (Stepper.Mobile)
- `services/api/stepsApi.ts`: Complete rewrite

## Proposed Types

### Backend - New DTOs

| Type Name | Location | Responsibility |
|-----------|----------|----------------|
| `StepStatsResponse` | Steps/DTOs | Aggregated step statistics |

## Implementation Steps

### Phase 1: Backend - Step Statistics Endpoint

#### Step 1.1: Add DTO

Create `Stepper.Api/Steps/DTOs/StepStatsResponse.cs`:
```csharp
public record StepStatsResponse(
    int TodaySteps,
    double TodayDistance,
    int WeekSteps,
    double WeekDistance,
    int MonthSteps,
    double MonthDistance,
    int CurrentStreak,
    int LongestStreak,
    int DailyGoal
);
```

#### Step 1.2: Update Service

Add to `IStepService.cs`:
```csharp
Task<StepStatsResponse> GetStatsAsync(Guid userId);
```

Implement in `StepService.cs`:
- Calculate today's total steps and distance
- Calculate this week's total (Monday to Sunday)
- Calculate this month's total
- Calculate current streak (consecutive days meeting goal)
- Calculate longest streak ever
- Include user's daily goal from preferences

#### Step 1.3: Add Controller Endpoint

Add to `StepsController.cs`:
```csharp
/// <summary>
/// Get step statistics for current user
/// </summary>
[HttpGet("stats")]
public async Task<ActionResult<ApiResponse<StepStatsResponse>>> GetStats()
```

### Phase 2: Backend - Verify Existing Endpoints

Verify these endpoints exist and work correctly with `/api/v1/` prefix:

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/steps` | Record new steps |
| `GET /api/v1/steps/today` | Get today's steps |
| `GET /api/v1/steps/history` | Get step history (paginated) |
| `GET /api/v1/steps/daily` | Get daily aggregated history |

### Phase 3: Mobile - Refactor stepsApi.ts

Replace all Supabase calls with HTTP client calls:

| Current Function | New Implementation |
|------------------|-------------------|
| `addSteps(data)` | `POST /api/v1/steps` |
| `getTodaySteps()` | `GET /api/v1/steps/today` |
| `getStats()` | `GET /api/v1/steps/stats` |
| `getHistory(params)` | `GET /api/v1/steps/history?...` |
| `getDailyHistory(params)` | `GET /api/v1/steps/daily?...` |

```typescript
import { apiClient } from './client';
import type { StepEntry, StepStats, StepHistoryParams } from '../../types/steps';

export const stepsApi = {
  addSteps: async (data: {
    steps: number;
    distance?: number;
    date?: string;
  }): Promise<StepEntry> => {
    return apiClient.post<StepEntry>('/steps', data);
  },

  getTodaySteps: async (): Promise<StepEntry | null> => {
    return apiClient.get<StepEntry | null>('/steps/today');
  },

  getStats: async (): Promise<StepStats> => {
    return apiClient.get<StepStats>('/steps/stats');
  },

  getHistory: async (params: StepHistoryParams): Promise<StepEntry[]> => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    return apiClient.get<StepEntry[]>(`/steps/history?${queryParams}`);
  },

  getDailyHistory: async (params: {
    days?: number;
  } = {}): Promise<StepEntry[]> => {
    const queryParams = new URLSearchParams();
    if (params.days) queryParams.append('days', params.days.toString());

    return apiClient.get<StepEntry[]>(`/steps/daily?${queryParams}`);
  },
};
```

## Dependencies

### New Packages Required

**None**

## Database Changes

**None** - `step_entries` table already exists

## Tests

### Backend Unit Tests
- `Stepper.Api.Tests/Steps/StepServiceStatsTests.cs`
  - Test today's steps calculation
  - Test weekly aggregation
  - Test monthly aggregation
  - Test streak calculation

### Backend Integration Tests
- `Stepper.Api.Tests/Steps/StepsControllerStatsTests.cs`

### Mobile Tests
- Update `Stepper.Mobile/src/services/api/__tests__/stepsApi.test.ts`
- Mock `apiClient` instead of Supabase

## Acceptance Criteria

### Backend
- [ ] `GET /api/v1/steps/stats` returns correct statistics
- [ ] Today's steps are calculated correctly
- [ ] Weekly totals use Monday-Sunday week
- [ ] Monthly totals use calendar month
- [ ] Streak calculation is accurate
- [ ] All endpoints have XML documentation

### Mobile
- [ ] `stepsApi.ts` makes zero direct Supabase data calls
- [ ] All functions return correctly typed responses
- [ ] Query parameters are properly encoded
- [ ] All existing functionality works as before
- [ ] Updated tests pass

## Risks & Open Questions

### Risks
1. **Streak calculation edge cases**: Timezone handling for "day" boundaries
   - Mitigation: Use UTC consistently, document behavior

### Open Questions
- None

## Agent Assignment

| Phase | Agent | Notes |
|-------|-------|-------|
| 1 | Backend Engineer | Add stats endpoint |
| 2 | Backend Engineer | Verify existing endpoints |
| 3 | Frontend Engineer | API refactoring |
| Tests | Tester | Write and verify tests |
