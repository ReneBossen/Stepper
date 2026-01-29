using Stepper.Api.Common.Models;
using Stepper.Api.Steps.DTOs;

namespace Stepper.Api.Steps;

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

    /// <inheritdoc />
    public async Task<StepStatsResponse> GetStatsAsync(Guid userId)
    {
        ValidateUserId(userId);

        var dailyGoal = await _stepRepository.GetDailyGoalAsync(userId);
        var allSummaries = await _stepRepository.GetAllDailySummariesAsync(userId);

        var todayStats = CalculateTodayStats(allSummaries);
        var weekStats = CalculateWeekStats(allSummaries);
        var monthStats = CalculateMonthStats(allSummaries);
        var (currentStreak, longestStreak) = CalculateStreaks(allSummaries, dailyGoal);

        return new StepStatsResponse(
            TodaySteps: todayStats.Steps,
            TodayDistance: todayStats.Distance,
            WeekSteps: weekStats.Steps,
            WeekDistance: weekStats.Distance,
            MonthSteps: monthStats.Steps,
            MonthDistance: monthStats.Distance,
            CurrentStreak: currentStreak,
            LongestStreak: longestStreak,
            DailyGoal: dailyGoal
        );
    }

    private static void ValidateUserId(Guid userId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }
    }

    private static (int Steps, double Distance) CalculateTodayStats(List<DailyStepSummary> summaries)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var todaySummary = summaries.FirstOrDefault(s => s.Date == today);

        return todaySummary != null
            ? (todaySummary.TotalSteps, todaySummary.TotalDistanceMeters)
            : (0, 0.0);
    }

    private static (int Steps, double Distance) CalculateWeekStats(List<DailyStepSummary> summaries)
    {
        var (weekStart, weekEnd) = GetCurrentWeekRange();
        return CalculatePeriodStats(summaries, weekStart, weekEnd);
    }

    private static (int Steps, double Distance) CalculateMonthStats(List<DailyStepSummary> summaries)
    {
        var (monthStart, monthEnd) = GetCurrentMonthRange();
        return CalculatePeriodStats(summaries, monthStart, monthEnd);
    }

    private static (int Steps, double Distance) CalculatePeriodStats(
        List<DailyStepSummary> summaries,
        DateOnly start,
        DateOnly end)
    {
        var periodSummaries = summaries
            .Where(s => s.Date >= start && s.Date <= end)
            .ToList();

        var totalSteps = periodSummaries.Sum(s => s.TotalSteps);
        var totalDistance = periodSummaries.Sum(s => s.TotalDistanceMeters);

        return (totalSteps, totalDistance);
    }

    private static (DateOnly Start, DateOnly End) GetCurrentWeekRange()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var dayOfWeek = today.DayOfWeek;

        // Calculate Monday of current week (Monday = 0 for our purposes)
        var daysFromMonday = dayOfWeek == DayOfWeek.Sunday ? 6 : (int)dayOfWeek - 1;
        var monday = today.AddDays(-daysFromMonday);
        var sunday = monday.AddDays(6);

        return (monday, sunday);
    }

    private static (DateOnly Start, DateOnly End) GetCurrentMonthRange()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);

        return (monthStart, monthEnd);
    }

    private static (int Current, int Longest) CalculateStreaks(
        List<DailyStepSummary> summaries,
        int dailyGoal)
    {
        if (summaries.Count == 0)
        {
            return (0, 0);
        }

        // Summaries are already ordered by date descending
        var sortedSummaries = summaries.OrderByDescending(s => s.Date).ToList();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var currentStreak = CalculateCurrentStreak(sortedSummaries, dailyGoal, today);
        var longestStreak = CalculateLongestStreak(sortedSummaries, dailyGoal);

        return (currentStreak, longestStreak);
    }

    private static int CalculateCurrentStreak(
        List<DailyStepSummary> sortedSummaries,
        int dailyGoal,
        DateOnly today)
    {
        var currentStreak = 0;
        var expectedDate = today;

        foreach (var summary in sortedSummaries)
        {
            // Allow for missing today (streak continues from yesterday)
            if (summary.Date == expectedDate || summary.Date == expectedDate.AddDays(-1))
            {
                if (summary.TotalSteps >= dailyGoal)
                {
                    currentStreak++;
                    expectedDate = summary.Date.AddDays(-1);
                }
                else
                {
                    break;
                }
            }
            else if (summary.Date < expectedDate.AddDays(-1))
            {
                // Gap in dates, streak is broken
                break;
            }
        }

        return currentStreak;
    }

    private static int CalculateLongestStreak(
        List<DailyStepSummary> sortedSummaries,
        int dailyGoal)
    {
        // Sort ascending for forward calculation
        var ascendingSummaries = sortedSummaries.OrderBy(s => s.Date).ToList();

        var longestStreak = 0;
        var currentStreak = 0;
        DateOnly? lastDate = null;

        foreach (var summary in ascendingSummaries)
        {
            var metGoal = summary.TotalSteps >= dailyGoal;

            if (metGoal)
            {
                if (lastDate == null || summary.Date == lastDate.Value.AddDays(1))
                {
                    currentStreak++;
                }
                else
                {
                    currentStreak = 1;
                }

                longestStreak = Math.Max(longestStreak, currentStreak);
                lastDate = summary.Date;
            }
            else
            {
                currentStreak = 0;
                lastDate = null;
            }
        }

        return longestStreak;
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

    /// <inheritdoc />
    public async Task<SyncStepsResponse> SyncStepsAsync(Guid userId, SyncStepsRequest request)
    {
        ValidateUserId(userId);
        ArgumentNullException.ThrowIfNull(request);
        ValidateSyncRequest(request);

        var created = 0;
        var updated = 0;

        foreach (var syncEntry in request.Entries)
        {
            var entry = CreateStepEntryFromSyncEntry(userId, syncEntry);
            var (isNew, _) = await _stepRepository.UpsertByDateAndSourceAsync(entry);

            if (isNew)
            {
                created++;
            }
            else
            {
                updated++;
            }
        }

        return new SyncStepsResponse
        {
            Created = created,
            Updated = updated,
            Total = request.Entries.Count
        };
    }

    /// <inheritdoc />
    public async Task<DeleteBySourceResponse> DeleteBySourceAsync(Guid userId, string source)
    {
        ValidateUserId(userId);
        ValidateSource(source);

        var deletedCount = await _stepRepository.DeleteBySourceAsync(userId, source);

        return new DeleteBySourceResponse
        {
            DeletedCount = deletedCount
        };
    }

    private static void ValidateSyncRequest(SyncStepsRequest request)
    {
        if (request.Entries == null || request.Entries.Count == 0)
        {
            throw new ArgumentException("At least one entry is required.");
        }

        if (request.Entries.Count > 31)
        {
            throw new ArgumentException("Maximum 31 entries allowed per sync.");
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        foreach (var entry in request.Entries)
        {
            ValidateSyncEntry(entry, today);
        }
    }

    private static void ValidateSyncEntry(SyncStepEntry entry, DateOnly today)
    {
        if (entry.Date > today)
        {
            throw new ArgumentException("Date cannot be in the future.");
        }

        if (entry.StepCount < MinStepCount || entry.StepCount > MaxStepCount)
        {
            throw new ArgumentException($"Step count must be between {MinStepCount} and {MaxStepCount}.");
        }

        if (entry.DistanceMeters.HasValue && entry.DistanceMeters.Value < 0)
        {
            throw new ArgumentException("Distance must be a positive value.");
        }

        if (string.IsNullOrWhiteSpace(entry.Source))
        {
            throw new ArgumentException("Source is required for each entry.");
        }

        if (entry.Source.Length > 100)
        {
            throw new ArgumentException("Source cannot exceed 100 characters.");
        }
    }

    private static StepEntry CreateStepEntryFromSyncEntry(Guid userId, SyncStepEntry syncEntry)
    {
        return new StepEntry
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StepCount = syncEntry.StepCount,
            DistanceMeters = syncEntry.DistanceMeters,
            Date = syncEntry.Date,
            RecordedAt = DateTime.UtcNow,
            Source = syncEntry.Source
        };
    }

    private static void ValidateSource(string source)
    {
        if (string.IsNullOrWhiteSpace(source))
        {
            throw new ArgumentException("Source cannot be empty.", nameof(source));
        }
    }
}
