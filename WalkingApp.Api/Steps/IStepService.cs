using WalkingApp.Api.Common.Models;
using WalkingApp.Api.Steps.DTOs;

namespace WalkingApp.Api.Steps;

/// <summary>
/// Service interface for step business logic.
/// </summary>
public interface IStepService
{
    /// <summary>
    /// Records a new step entry for a user.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="request">The step recording request.</param>
    /// <returns>The created step entry response.</returns>
    Task<StepEntryResponse> RecordStepsAsync(Guid userId, RecordStepsRequest request);

    /// <summary>
    /// Gets today's step summary for a user.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>Today's daily step summary.</returns>
    Task<DailyStepsResponse> GetTodayAsync(Guid userId);

    /// <summary>
    /// Gets daily step history for a user within a date range.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="range">The date range.</param>
    /// <returns>List of daily step summaries.</returns>
    Task<List<DailyStepsResponse>> GetDailyHistoryAsync(Guid userId, DateRange range);

    /// <summary>
    /// Gets detailed paginated step entry history for a user.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="range">The date range.</param>
    /// <param name="page">The page number (1-based).</param>
    /// <param name="pageSize">The page size.</param>
    /// <returns>Paginated step history response.</returns>
    Task<StepHistoryResponse> GetDetailedHistoryAsync(Guid userId, DateRange range, int page, int pageSize);

    /// <summary>
    /// Gets a specific step entry by ID.
    /// </summary>
    /// <param name="userId">The user ID (for authorization).</param>
    /// <param name="entryId">The step entry ID.</param>
    /// <returns>The step entry response.</returns>
    Task<StepEntryResponse> GetEntryAsync(Guid userId, Guid entryId);

    /// <summary>
    /// Deletes a step entry.
    /// </summary>
    /// <param name="userId">The user ID (for authorization).</param>
    /// <param name="entryId">The step entry ID to delete.</param>
    /// <returns>True if deleted, false if not found.</returns>
    Task<bool> DeleteEntryAsync(Guid userId, Guid entryId);

    /// <summary>
    /// Gets comprehensive step statistics for a user.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>Step statistics including today, week, month totals and streaks.</returns>
    Task<StepStatsResponse> GetStatsAsync(Guid userId);
}
