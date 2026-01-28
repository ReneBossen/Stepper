using System.Net;
using Supabase;
using WalkingApp.Api.Common.Database;
using WalkingApp.Api.Common.Models;
using WalkingApp.Api.Steps.DTOs;
using WalkingApp.Api.Users;

namespace WalkingApp.Api.Steps;

/// <summary>
/// Repository implementation for step data access using Supabase.
/// </summary>
public class StepRepository : IStepRepository
{
    private const int DefaultDailyGoal = 10000;

    private readonly ISupabaseClientFactory _clientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public StepRepository(
        ISupabaseClientFactory clientFactory,
        IHttpContextAccessor httpContextAccessor)
    {
        ArgumentNullException.ThrowIfNull(clientFactory);
        ArgumentNullException.ThrowIfNull(httpContextAccessor);

        _clientFactory = clientFactory;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <inheritdoc />
    public async Task<StepEntry> RecordStepsAsync(StepEntry entry)
    {
        ArgumentNullException.ThrowIfNull(entry);

        var client = await GetAuthenticatedClientAsync();

        var entity = StepEntryEntity.FromStepEntry(entry);
        var response = await client
            .From<StepEntryEntity>()
            .Insert(entity);

        var created = response.Models.FirstOrDefault();
        if (created == null)
        {
            throw new InvalidOperationException("Failed to create step entry.");
        }

        return created.ToStepEntry();
    }

    /// <inheritdoc />
    public async Task<StepEntry?> GetByIdAsync(Guid id)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<StepEntryEntity>()
            .Where(x => x.Id == id)
            .Single();

        return response?.ToStepEntry();
    }

    /// <inheritdoc />
    public async Task<List<StepEntry>> GetByDateAsync(Guid userId, DateOnly date)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<StepEntryEntity>()
            .Where(x => x.UserId == userId && x.Date == date)
            .Order("recorded_at", Supabase.Postgrest.Constants.Ordering.Descending)
            .Get();

        return response.Models.Select(e => e.ToStepEntry()).ToList();
    }

    /// <inheritdoc />
    public async Task<(List<StepEntry> Entries, int TotalCount)> GetByDateRangeAsync(Guid userId, DateRange range, int page, int pageSize)
    {
        var client = await GetAuthenticatedClientAsync();

        // Get total count efficiently using database function
        var countResult = await client.Rpc("count_step_entries_in_range", new Dictionary<string, object>
        {
            { "p_user_id", userId },
            { "p_start_date", range.StartDate.ToString("yyyy-MM-dd") },
            { "p_end_date", range.EndDate.ToString("yyyy-MM-dd") }
        });

        var totalCount = int.TryParse(countResult.Content, out var count) ? count : 0;

        // Get paginated entries
        var offset = (page - 1) * pageSize;
        var response = await client
            .From<StepEntryEntity>()
            .Where(x => x.UserId == userId && x.Date >= range.StartDate && x.Date <= range.EndDate)
            .Order("date", Supabase.Postgrest.Constants.Ordering.Descending)
            .Order("recorded_at", Supabase.Postgrest.Constants.Ordering.Descending)
            .Range(offset, offset + pageSize - 1)
            .Get();

        var entries = response.Models.Select(e => e.ToStepEntry()).ToList();

        return (entries, totalCount);
    }

    /// <inheritdoc />
    public async Task<List<DailyStepSummary>> GetDailySummariesAsync(Guid userId, DateRange range)
    {
        var client = await GetAuthenticatedClientAsync();

        // Use database function for efficient server-side aggregation
        var response = await client.Rpc("get_daily_step_summary", new Dictionary<string, object>
        {
            { "p_user_id", userId },
            { "p_start_date", range.StartDate.ToString("yyyy-MM-dd") },
            { "p_end_date", range.EndDate.ToString("yyyy-MM-dd") }
        });

        // Parse the JSON response from the database function
        var summaries = System.Text.Json.JsonSerializer
            .Deserialize<List<DailySummaryResult>>(response.Content ?? string.Empty)
            ?? new List<DailySummaryResult>();

        // Map to domain model
        return summaries.Select(r => new DailyStepSummary
        {
            Date = DateOnly.Parse(r.Date),
            TotalSteps = (int)r.TotalSteps,
            TotalDistanceMeters = r.TotalDistanceMeters,
            EntryCount = (int)r.EntryCount
        }).ToList();
    }

    /// <inheritdoc />
    public async Task<bool> DeleteAsync(Guid id)
    {
        var client = await GetAuthenticatedClientAsync();

        try
        {
            await client
                .From<StepEntryEntity>()
                .Where(x => x.Id == id)
                .Delete();

            return true;
        }
        catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            // Entry not found, return false
            return false;
        }
        // Let other exceptions bubble up to be handled by global exception handler
    }

    /// <inheritdoc />
    public async Task<int> GetDailyGoalAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client
            .From<UserPreferencesEntity>()
            .Where(x => x.Id == userId)
            .Single();

        return response?.DailyStepGoal ?? DefaultDailyGoal;
    }

    /// <inheritdoc />
    public async Task<List<DailyStepSummary>> GetAllDailySummariesAsync(Guid userId)
    {
        var client = await GetAuthenticatedClientAsync();

        // Use database function to get all summaries for the user
        // We query from the beginning of time to today
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var startDate = new DateOnly(2020, 1, 1); // Reasonable start date

        var response = await client.Rpc("get_daily_step_summary", new Dictionary<string, object>
        {
            { "p_user_id", userId },
            { "p_start_date", startDate.ToString("yyyy-MM-dd") },
            { "p_end_date", today.ToString("yyyy-MM-dd") }
        });

        var summaries = System.Text.Json.JsonSerializer
            .Deserialize<List<DailySummaryResult>>(response.Content ?? string.Empty)
            ?? [];

        return summaries
            .Select(r => new DailyStepSummary
            {
                Date = DateOnly.Parse(r.Date),
                TotalSteps = (int)r.TotalSteps,
                TotalDistanceMeters = r.TotalDistanceMeters,
                EntryCount = (int)r.EntryCount
            })
            .OrderByDescending(s => s.Date)
            .ToList();
    }

    /// <inheritdoc />
    public async Task<(bool IsNew, StepEntry Entry)> UpsertByDateAndSourceAsync(StepEntry entry)
    {
        ArgumentNullException.ThrowIfNull(entry);

        var client = await GetAuthenticatedClientAsync();

        // Check if entry exists with same user_id, date, and source
        var existing = await FindExistingEntryAsync(client, entry.UserId, entry.Date, entry.Source);

        if (existing != null)
        {
            var updated = await UpdateExistingEntryAsync(client, existing, entry);
            return (false, updated);
        }

        var created = await CreateNewEntryAsync(client, entry);
        return (true, created);
    }

    /// <inheritdoc />
    public async Task<int> DeleteBySourceAsync(Guid userId, string source)
    {
        var client = await GetAuthenticatedClientAsync();

        // Get count of entries to be deleted first
        var entriesToDelete = await client
            .From<StepEntryEntity>()
            .Where(x => x.UserId == userId && x.Source == source)
            .Get();

        var count = entriesToDelete.Models.Count;

        if (count > 0)
        {
            await client
                .From<StepEntryEntity>()
                .Where(x => x.UserId == userId && x.Source == source)
                .Delete();
        }

        return count;
    }

    private static async Task<StepEntryEntity?> FindExistingEntryAsync(
        Supabase.Client client,
        Guid userId,
        DateOnly date,
        string? source)
    {
        var response = await client
            .From<StepEntryEntity>()
            .Where(x => x.UserId == userId && x.Date == date && x.Source == source)
            .Single();

        return response;
    }

    private static async Task<StepEntry> UpdateExistingEntryAsync(
        Supabase.Client client,
        StepEntryEntity existing,
        StepEntry entry)
    {
        existing.StepCount = entry.StepCount;
        existing.DistanceMeters = entry.DistanceMeters;
        existing.RecordedAt = entry.RecordedAt;

        var updateResponse = await client
            .From<StepEntryEntity>()
            .Where(x => x.Id == existing.Id)
            .Update(existing);

        var updated = updateResponse.Models.FirstOrDefault();
        if (updated == null)
        {
            throw new InvalidOperationException("Failed to update step entry.");
        }

        return updated.ToStepEntry();
    }

    private static async Task<StepEntry> CreateNewEntryAsync(
        Supabase.Client client,
        StepEntry entry)
    {
        var entity = StepEntryEntity.FromStepEntry(entry);
        var insertResponse = await client
            .From<StepEntryEntity>()
            .Insert(entity);

        var created = insertResponse.Models.FirstOrDefault();
        if (created == null)
        {
            throw new InvalidOperationException("Failed to create step entry.");
        }

        return created.ToStepEntry();
    }

    private async Task<Supabase.Client> GetAuthenticatedClientAsync()
    {
        if (_httpContextAccessor.HttpContext?.Items.TryGetValue("SupabaseToken", out var tokenObj) != true)
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        var token = tokenObj as string;
        if (string.IsNullOrEmpty(token))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        return await _clientFactory.CreateClientAsync(token);
    }
}
