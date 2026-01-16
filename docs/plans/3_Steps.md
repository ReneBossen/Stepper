# Plan 3: Steps Feature

## Summary

This plan implements the Steps feature for recording and retrieving step count data. Users can record daily step entries from their mobile devices, retrieve historical data, and view daily/weekly/monthly aggregations. RLS policies ensure users can only access their own step data (friends' step access is handled in Plan 4).

## Affected Feature Slices

- **Steps**: Complete vertical slice (Controller, Service, Repository, Models, DTOs)
- **Common**: Uses shared infrastructure from Plan 1

## Proposed Types

| Type Name | Feature/Location | Responsibility |
|-----------|------------------|----------------|
| StepsController | Steps/ | HTTP endpoints for step operations |
| IStepService | Steps/ | Interface for step business logic |
| StepService | Steps/ | Step recording and retrieval logic |
| IStepRepository | Steps/ | Interface for step data access |
| StepRepository | Steps/ | Supabase data access for steps |
| StepEntry | Steps/ | Domain model for individual step entry |
| DailyStepSummary | Steps/ | Domain model for daily aggregation |
| RecordStepsRequest | Steps/DTOs | Request DTO for recording steps |
| StepEntryResponse | Steps/DTOs | Response DTO for step entry |
| DailyStepsResponse | Steps/DTOs | Response DTO for daily summary |
| StepHistoryResponse | Steps/DTOs | Response DTO for paginated history |
| DateRange | Steps/DTOs | Value object for date range queries |

## Implementation Steps

1. **Create Steps folder structure**:
   ```
   WalkingApp.Api/Steps/
   ├── StepsController.cs
   ├── IStepService.cs
   ├── StepService.cs
   ├── IStepRepository.cs
   ├── StepRepository.cs
   ├── StepEntry.cs
   ├── DailyStepSummary.cs
   └── DTOs/
       ├── RecordStepsRequest.cs
       ├── StepEntryResponse.cs
       ├── DailyStepsResponse.cs
       ├── StepHistoryResponse.cs
       └── DateRange.cs
   ```

2. **Define StepEntry domain model**:
   ```csharp
   public class StepEntry
   {
       public Guid Id { get; set; }
       public Guid UserId { get; set; }
       public int StepCount { get; set; }
       public double? DistanceMeters { get; set; }
       public DateOnly Date { get; set; }
       public DateTime RecordedAt { get; set; }
       public string? Source { get; set; }  // e.g., "apple_health", "google_fit"
   }
   ```

3. **Define DailyStepSummary**:
   ```csharp
   public class DailyStepSummary
   {
       public DateOnly Date { get; set; }
       public int TotalSteps { get; set; }
       public double TotalDistanceMeters { get; set; }
       public int EntryCount { get; set; }
   }
   ```

4. **Define DTOs**:
   - `RecordStepsRequest`: StepCount, DistanceMeters (optional), Date, Source
   - `StepEntryResponse`: Id, StepCount, DistanceMeters, Date, RecordedAt, Source
   - `DailyStepsResponse`: Date, TotalSteps, TotalDistanceMeters
   - `StepHistoryResponse`: Items (list), TotalCount, Page, PageSize
   - `DateRange`: StartDate, EndDate

5. **Implement IStepRepository and StepRepository**:
   - `RecordStepsAsync(StepEntry entry)` - Insert step entry
   - `GetByIdAsync(Guid id)` - Get single entry
   - `GetByDateAsync(Guid userId, DateOnly date)` - Get entries for a date
   - `GetByDateRangeAsync(Guid userId, DateRange range)` - Get entries in range
   - `GetDailySummariesAsync(Guid userId, DateRange range)` - Aggregated by date
   - `DeleteAsync(Guid id)` - Delete entry
   - Use Supabase client with user token for RLS

6. **Implement IStepService and StepService**:
   - `RecordStepsAsync(Guid userId, RecordStepsRequest request)` - Record steps
   - `GetTodayAsync(Guid userId)` - Get today's summary
   - `GetDailyHistoryAsync(Guid userId, DateRange range)` - Get daily summaries
   - `GetDetailedHistoryAsync(Guid userId, DateRange range, int page, int pageSize)` - Paginated
   - `DeleteEntryAsync(Guid userId, Guid entryId)` - Delete entry
   - Validation: step count (0-200000), date (not future), distance (positive)

7. **Implement StepsController**:
   - `POST /api/steps` - Record step entry
   - `GET /api/steps/today` - Get today's summary
   - `GET /api/steps/daily?startDate=&endDate=` - Get daily summaries
   - `GET /api/steps/history?startDate=&endDate=&page=&pageSize=` - Paginated history
   - `GET /api/steps/{id}` - Get specific entry
   - `DELETE /api/steps/{id}` - Delete entry
   - All endpoints require authentication

8. **Register services** in Program.cs or ServiceCollectionExtensions

9. **Create Supabase migration** for step_entries table:
   ```sql
   CREATE TABLE step_entries (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       step_count INTEGER NOT NULL CHECK (step_count >= 0),
       distance_meters DOUBLE PRECISION CHECK (distance_meters >= 0),
       date DATE NOT NULL,
       recorded_at TIMESTAMPTZ DEFAULT NOW(),
       source TEXT,

       CONSTRAINT unique_user_date_source UNIQUE (user_id, date, source)
   );

   CREATE INDEX idx_step_entries_user_date ON step_entries(user_id, date);
   CREATE INDEX idx_step_entries_date ON step_entries(date);
   ```

10. **Create RLS policies** for step_entries table:
    ```sql
    -- Enable RLS
    ALTER TABLE step_entries ENABLE ROW LEVEL SECURITY;

    -- Users can view their own steps
    CREATE POLICY "Users can view own steps"
        ON step_entries FOR SELECT
        USING (auth.uid() = user_id);

    -- Users can insert their own steps
    CREATE POLICY "Users can insert own steps"
        ON step_entries FOR INSERT
        WITH CHECK (auth.uid() = user_id);

    -- Users can update their own steps
    CREATE POLICY "Users can update own steps"
        ON step_entries FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);

    -- Users can delete their own steps
    CREATE POLICY "Users can delete own steps"
        ON step_entries FOR DELETE
        USING (auth.uid() = user_id);

    -- Friends can view steps (added after Friends feature)
    -- This will be added in Plan 4
    ```

11. **Create database function** for daily aggregation:
    ```sql
    CREATE OR REPLACE FUNCTION get_daily_step_summary(
        p_user_id UUID,
        p_start_date DATE,
        p_end_date DATE
    )
    RETURNS TABLE (
        date DATE,
        total_steps BIGINT,
        total_distance_meters DOUBLE PRECISION,
        entry_count BIGINT
    )
    LANGUAGE sql
    SECURITY DEFINER
    AS $$
        SELECT
            date,
            SUM(step_count) as total_steps,
            COALESCE(SUM(distance_meters), 0) as total_distance_meters,
            COUNT(*) as entry_count
        FROM step_entries
        WHERE user_id = p_user_id
          AND date BETWEEN p_start_date AND p_end_date
        GROUP BY date
        ORDER BY date DESC;
    $$;
    ```

## Dependencies

- Plan 1 (Supabase Integration) must be completed first
- No additional NuGet packages required

## Database Changes

**New Table**: `step_entries`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL, REFERENCES auth.users(id) |
| step_count | INTEGER | NOT NULL, CHECK >= 0 |
| distance_meters | DOUBLE PRECISION | nullable, CHECK >= 0 |
| date | DATE | NOT NULL |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() |
| source | TEXT | nullable |

**Unique Constraint**: (user_id, date, source)
**Indexes**: user_id+date, date

**RLS Policies**: Own data access only (friend access in Plan 4)

## Tests

**Unit Tests** (WalkingApp.UnitTests/Steps/):
- `StepServiceTests`
  - Test recording valid steps creates entry
  - Test step count validation (0-200000)
  - Test future date rejection
  - Test negative distance rejection
  - Test daily aggregation calculation
  - Test date range validation

**Integration Tests** (WalkingApp.Api.Tests/Steps/):
- `StepsControllerTests`
  - POST /api/steps creates entry and returns 201
  - POST /api/steps returns 400 for invalid input
  - GET /api/steps/today returns current day summary
  - GET /api/steps/daily returns aggregated data
  - GET /api/steps/history returns paginated results
  - DELETE /api/steps/{id} removes entry
  - Cannot access other users' steps (RLS)

**Architecture Tests**:
- Steps feature does not depend on other features
- Controller only depends on Service interface

## Acceptance Criteria

- [ ] step_entries table is created in Supabase
- [ ] RLS policies correctly restrict access to own data
- [ ] POST /api/steps records entry with validation
- [ ] GET /api/steps/today returns today's aggregated steps
- [ ] GET /api/steps/daily returns daily summaries for date range
- [ ] GET /api/steps/history returns paginated raw entries
- [ ] DELETE /api/steps/{id} removes own entry only
- [ ] Step count validation (0-200000)
- [ ] Date validation (not in future)
- [ ] Source field tracks data origin (apple_health, google_fit, manual)
- [ ] Duplicate entries for same user/date/source are handled (upsert or reject)

## Risks and Open Questions

| Risk/Question | Mitigation/Answer |
|--------------|-------------------|
| Multiple entries per day handling | Allow multiple with unique source |
| Timezone handling for dates | Store as DATE (server timezone), document client handling |
| Large history queries performance | Add pagination, consider date range limits |
| Step count reasonability checks | Add upper limit warning (>200k unusual) |
| Distance calculation if not provided | Optional field, can calculate from steps later |
