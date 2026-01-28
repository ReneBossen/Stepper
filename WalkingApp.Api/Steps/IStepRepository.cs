using WalkingApp.Api.Common.Models;
using WalkingApp.Api.Steps.DTOs;

namespace WalkingApp.Api.Steps;

/// <summary>
/// Repository interface for step data access.
/// </summary>
public interface IStepRepository
{
    /// <summary>
    /// Records a new step entry in the database.
    /// </summary>
    /// <param name="entry">The step entry to record.</param>
    /// <returns>The created step entry.</returns>
    Task<StepEntry> RecordStepsAsync(StepEntry entry);

    /// <summary>
    /// Gets a step entry by ID.
    /// </summary>
    /// <param name="id">The step entry ID.</param>
    /// <returns>The step entry, or null if not found.</returns>
    Task<StepEntry?> GetByIdAsync(Guid id);

    /// <summary>
    /// Gets all step entries for a user on a specific date.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="date">The date.</param>
    /// <returns>List of step entries for the date.</returns>
    Task<List<StepEntry>> GetByDateAsync(Guid userId, DateOnly date);

    /// <summary>
    /// Gets all step entries for a user within a date range.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="range">The date range.</param>
    /// <param name="page">The page number (1-based).</param>
    /// <param name="pageSize">The page size.</param>
    /// <returns>List of step entries and total count.</returns>
    Task<(List<StepEntry> Entries, int TotalCount)> GetByDateRangeAsync(Guid userId, DateRange range, int page, int pageSize);

    /// <summary>
    /// Gets daily aggregated step summaries for a user within a date range.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="range">The date range.</param>
    /// <returns>List of daily step summaries.</returns>
    Task<List<DailyStepSummary>> GetDailySummariesAsync(Guid userId, DateRange range);

    /// <summary>
    /// Deletes a step entry by ID.
    /// </summary>
    /// <param name="id">The step entry ID.</param>
    /// <returns>True if deleted, false if not found.</returns>
    Task<bool> DeleteAsync(Guid id);

    /// <summary>
    /// Gets the user's daily step goal from user preferences.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>The daily step goal, or the default value (10000) if not set.</returns>
    Task<int> GetDailyGoalAsync(Guid userId);

    /// <summary>
    /// Gets all daily summaries for a user, ordered by date descending.
    /// Used for streak calculations.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>All daily step summaries for the user.</returns>
    Task<List<DailyStepSummary>> GetAllDailySummariesAsync(Guid userId);

    /// <summary>
    /// Upserts a step entry by date and source. Creates a new entry or updates existing.
    /// </summary>
    /// <param name="entry">The step entry to upsert.</param>
    /// <returns>A tuple indicating if it was a new entry and the resulting entry.</returns>
    Task<(bool IsNew, StepEntry Entry)> UpsertByDateAndSourceAsync(StepEntry entry);

    /// <summary>
    /// Deletes all step entries for a user from a specific source.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="source">The source to delete entries from.</param>
    /// <returns>The number of entries deleted.</returns>
    Task<int> DeleteBySourceAsync(Guid userId, string source);
}
