using Supabase;
using WalkingApp.Api.Common.Database;
using WalkingApp.Api.Steps.DTOs;

namespace WalkingApp.Api.Steps;

/// <summary>
/// Repository implementation for step data access using Supabase.
/// </summary>
public class StepRepository : IStepRepository
{
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

        // Get total count
        var countResponse = await client
            .From<StepEntryEntity>()
            .Where(x => x.UserId == userId && x.Date >= range.StartDate && x.Date <= range.EndDate)
            .Get();

        var totalCount = countResponse.Models.Count;

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

        // Get all entries in the range
        var response = await client
            .From<StepEntryEntity>()
            .Where(x => x.UserId == userId && x.Date >= range.StartDate && x.Date <= range.EndDate)
            .Get();

        // Group by date and aggregate in memory
        var summaries = response.Models
            .GroupBy(e => e.Date)
            .Select(g => new DailyStepSummary
            {
                Date = g.Key,
                TotalSteps = g.Sum(e => e.StepCount),
                TotalDistanceMeters = g.Sum(e => e.DistanceMeters ?? 0),
                EntryCount = g.Count()
            })
            .OrderByDescending(s => s.Date)
            .ToList();

        return summaries;
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
        catch
        {
            return false;
        }
    }

    private async Task<Client> GetAuthenticatedClientAsync()
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
