using WalkingApp.Api.Common.Models;
using WalkingApp.Api.Steps.DTOs;

namespace WalkingApp.Api.Steps;

/// <summary>
/// Service implementation for step business logic.
/// </summary>
public class StepService : IStepService
{
    private const int MinStepCount = 0;
    private const int MaxStepCount = 200000;
    private const int DefaultPageSize = 50;
    private const int MaxPageSize = 100;

    private readonly IStepRepository _stepRepository;

    public StepService(IStepRepository stepRepository)
    {
        ArgumentNullException.ThrowIfNull(stepRepository);
        _stepRepository = stepRepository;
    }

    /// <inheritdoc />
    public async Task<StepEntryResponse> RecordStepsAsync(Guid userId, RecordStepsRequest request)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        ArgumentNullException.ThrowIfNull(request);

        ValidateRecordStepsRequest(request);

        var entry = new StepEntry
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StepCount = request.StepCount,
            DistanceMeters = request.DistanceMeters,
            Date = request.Date,
            RecordedAt = DateTime.UtcNow,
            Source = request.Source
        };

        var created = await _stepRepository.RecordStepsAsync(entry);

        return MapToStepEntryResponse(created);
    }

    /// <inheritdoc />
    public async Task<DailyStepsResponse> GetTodayAsync(Guid userId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var range = new DateRange { StartDate = today, EndDate = today };

        var summaries = await _stepRepository.GetDailySummariesAsync(userId, range);
        var todaySummary = summaries.FirstOrDefault();

        if (todaySummary == null)
        {
            return new DailyStepsResponse
            {
                Date = today,
                TotalSteps = 0,
                TotalDistanceMeters = 0
            };
        }

        return MapToDailyStepsResponse(todaySummary);
    }

    /// <inheritdoc />
    public async Task<List<DailyStepsResponse>> GetDailyHistoryAsync(Guid userId, DateRange range)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        ArgumentNullException.ThrowIfNull(range);
        ValidateDateRange(range);

        var summaries = await _stepRepository.GetDailySummariesAsync(userId, range);

        return summaries.Select(MapToDailyStepsResponse).ToList();
    }

    /// <inheritdoc />
    public async Task<StepHistoryResponse> GetDetailedHistoryAsync(Guid userId, DateRange range, int page, int pageSize)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        ArgumentNullException.ThrowIfNull(range);
        ValidateDateRange(range);

        if (page < 1)
        {
            throw new ArgumentException("Page number must be greater than 0.", nameof(page));
        }

        if (pageSize < 1)
        {
            pageSize = DefaultPageSize;
        }

        if (pageSize > MaxPageSize)
        {
            pageSize = MaxPageSize;
        }

        var (entries, totalCount) = await _stepRepository.GetByDateRangeAsync(userId, range, page, pageSize);

        return new StepHistoryResponse
        {
            Items = entries.Select(MapToStepEntryResponse).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    /// <inheritdoc />
    public async Task<StepEntryResponse> GetEntryAsync(Guid userId, Guid entryId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (entryId == Guid.Empty)
        {
            throw new ArgumentException("Entry ID cannot be empty.", nameof(entryId));
        }

        var entry = await _stepRepository.GetByIdAsync(entryId);

        if (entry == null)
        {
            throw new KeyNotFoundException($"Step entry not found with ID: {entryId}");
        }

        if (entry.UserId != userId)
        {
            throw new UnauthorizedAccessException("You do not have permission to access this step entry.");
        }

        return MapToStepEntryResponse(entry);
    }

    /// <inheritdoc />
    public async Task<bool> DeleteEntryAsync(Guid userId, Guid entryId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (entryId == Guid.Empty)
        {
            throw new ArgumentException("Entry ID cannot be empty.", nameof(entryId));
        }

        // Verify ownership before deletion
        var entry = await _stepRepository.GetByIdAsync(entryId);

        if (entry == null)
        {
            return false;
        }

        if (entry.UserId != userId)
        {
            throw new UnauthorizedAccessException("You do not have permission to delete this step entry.");
        }

        return await _stepRepository.DeleteAsync(entryId);
    }

    private static void ValidateRecordStepsRequest(RecordStepsRequest request)
    {
        if (request.StepCount < MinStepCount || request.StepCount > MaxStepCount)
        {
            throw new ArgumentException($"Step count must be between {MinStepCount} and {MaxStepCount}.");
        }

        if (request.DistanceMeters.HasValue && request.DistanceMeters.Value < 0)
        {
            throw new ArgumentException("Distance must be a positive value.");
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (request.Date > today)
        {
            throw new ArgumentException("Date cannot be in the future.");
        }
    }

    private static void ValidateDateRange(DateRange range)
    {
        if (range.StartDate > range.EndDate)
        {
            throw new ArgumentException("Start date must be before or equal to end date.");
        }
    }

    private static StepEntryResponse MapToStepEntryResponse(StepEntry entry)
    {
        return new StepEntryResponse
        {
            Id = entry.Id,
            StepCount = entry.StepCount,
            DistanceMeters = entry.DistanceMeters,
            Date = entry.Date,
            RecordedAt = entry.RecordedAt,
            Source = entry.Source
        };
    }

    private static DailyStepsResponse MapToDailyStepsResponse(DailyStepSummary summary)
    {
        return new DailyStepsResponse
        {
            Date = summary.Date,
            TotalSteps = summary.TotalSteps,
            TotalDistanceMeters = summary.TotalDistanceMeters
        };
    }
}
