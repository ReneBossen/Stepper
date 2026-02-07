using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Stepper.Api.Common.Extensions;
using Stepper.Api.Common.Models;
using Stepper.Api.Steps.DTOs;

namespace Stepper.Api.Steps;

/// <summary>
/// Controller for step tracking endpoints.
/// </summary>
[ApiController]
[Authorize]
[Route("api/v1/steps")]
public class StepsController : ControllerBase
{
    private readonly IStepService _stepService;

    public StepsController(IStepService stepService)
    {
        ArgumentNullException.ThrowIfNull(stepService);
        _stepService = stepService;
    }

    /// <summary>
    /// Records a new step entry.
    /// </summary>
    /// <param name="request">The step recording request.</param>
    /// <returns>The created step entry.</returns>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<StepEntryResponse>>> RecordSteps([FromBody] RecordStepsRequest request)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<StepEntryResponse>.ErrorResponse("User is not authenticated."));
        }

        if (request == null)
        {
            return BadRequest(ApiResponse<StepEntryResponse>.ErrorResponse("Request body cannot be null."));
        }

        var entry = await _stepService.RecordStepsAsync(userId.Value, request);
        return CreatedAtAction(nameof(GetEntry), new { id = entry.Id }, ApiResponse<StepEntryResponse>.SuccessResponse(entry));
    }

    /// <summary>
    /// Gets comprehensive step statistics for the authenticated user.
    /// </summary>
    /// <returns>Step statistics including today, week, month totals and streaks.</returns>
    [HttpGet("stats")]
    public async Task<ActionResult<ApiResponse<StepStatsResponse>>> GetStats()
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<StepStatsResponse>.ErrorResponse("User is not authenticated."));
        }

        var stats = await _stepService.GetStatsAsync(userId.Value);
        return Ok(ApiResponse<StepStatsResponse>.SuccessResponse(stats));
    }

    /// <summary>
    /// Gets today's step summary.
    /// </summary>
    /// <returns>Today's step summary.</returns>
    [HttpGet("today")]
    public async Task<ActionResult<ApiResponse<DailyStepsResponse>>> GetToday()
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<DailyStepsResponse>.ErrorResponse("User is not authenticated."));
        }

        var summary = await _stepService.GetTodayAsync(userId.Value);
        return Ok(ApiResponse<DailyStepsResponse>.SuccessResponse(summary));
    }

    /// <summary>
    /// Gets daily step summaries for a date range.
    /// </summary>
    /// <param name="startDate">The start date (inclusive).</param>
    /// <param name="endDate">The end date (inclusive).</param>
    /// <returns>List of daily step summaries.</returns>
    [HttpGet("daily")]
    public async Task<ActionResult<ApiResponse<List<DailyStepsResponse>>>> GetDailyHistory(
        [FromQuery] DateOnly startDate,
        [FromQuery] DateOnly endDate)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<List<DailyStepsResponse>>.ErrorResponse("User is not authenticated."));
        }

        var range = new DateRange { StartDate = startDate, EndDate = endDate };
        var summaries = await _stepService.GetDailyHistoryAsync(userId.Value, range);
        return Ok(ApiResponse<List<DailyStepsResponse>>.SuccessResponse(summaries));
    }

    /// <summary>
    /// Gets paginated detailed step entry history.
    /// </summary>
    /// <param name="startDate">The start date (inclusive).</param>
    /// <param name="endDate">The end date (inclusive).</param>
    /// <param name="page">The page number (default: 1).</param>
    /// <param name="pageSize">The page size (default: 50, max: 100).</param>
    /// <returns>Paginated step history.</returns>
    [HttpGet("history")]
    public async Task<ActionResult<ApiResponse<StepHistoryResponse>>> GetHistory(
        [FromQuery] DateOnly startDate,
        [FromQuery] DateOnly endDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<StepHistoryResponse>.ErrorResponse("User is not authenticated."));
        }

        var range = new DateRange { StartDate = startDate, EndDate = endDate };
        var history = await _stepService.GetDetailedHistoryAsync(userId.Value, range, page, pageSize);
        return Ok(ApiResponse<StepHistoryResponse>.SuccessResponse(history));
    }

    /// <summary>
    /// Gets a specific step entry by ID.
    /// </summary>
    /// <param name="id">The step entry ID.</param>
    /// <returns>The step entry.</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<StepEntryResponse>>> GetEntry(Guid id)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<StepEntryResponse>.ErrorResponse("User is not authenticated."));
        }

        if (id == Guid.Empty)
        {
            return BadRequest(ApiResponse<StepEntryResponse>.ErrorResponse("Entry ID cannot be empty."));
        }

        var entry = await _stepService.GetEntryAsync(userId.Value, id);
        return Ok(ApiResponse<StepEntryResponse>.SuccessResponse(entry));
    }

    /// <summary>
    /// Deletes a step entry.
    /// </summary>
    /// <param name="id">The step entry ID to delete.</param>
    /// <returns>No content on success.</returns>
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteEntry(Guid id)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<object>.ErrorResponse("User is not authenticated."));
        }

        if (id == Guid.Empty)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse("Entry ID cannot be empty."));
        }

        var deleted = await _stepService.DeleteEntryAsync(userId.Value, id);

        if (!deleted)
        {
            return NotFound(ApiResponse<object>.ErrorResponse("Step entry not found."));
        }

        return NoContent();
    }

    /// <summary>
    /// Syncs step entries from health providers using bulk upsert.
    /// </summary>
    /// <param name="request">The sync request containing entries to upsert.</param>
    /// <returns>A response indicating how many entries were created and updated.</returns>
    [HttpPut("sync")]
    public async Task<ActionResult<ApiResponse<SyncStepsResponse>>> SyncSteps([FromBody] SyncStepsRequest request)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<SyncStepsResponse>.ErrorResponse("User is not authenticated."));
        }

        if (request == null)
        {
            return BadRequest(ApiResponse<SyncStepsResponse>.ErrorResponse("Request body cannot be null."));
        }

        var response = await _stepService.SyncStepsAsync(userId.Value, request);
        return Ok(ApiResponse<SyncStepsResponse>.SuccessResponse(response));
    }

    /// <summary>
    /// Deletes all step entries for a user from a specific source.
    /// Used when a user revokes health data access.
    /// </summary>
    /// <param name="source">The source to delete entries from (e.g., "HealthKit", "Google Fit").</param>
    /// <returns>A response indicating how many entries were deleted.</returns>
    [HttpDelete("source/{source}")]
    public async Task<ActionResult<ApiResponse<DeleteBySourceResponse>>> DeleteBySource(string source)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized(ApiResponse<DeleteBySourceResponse>.ErrorResponse("User is not authenticated."));
        }

        if (string.IsNullOrWhiteSpace(source))
        {
            return BadRequest(ApiResponse<DeleteBySourceResponse>.ErrorResponse("Source cannot be empty."));
        }

        var response = await _stepService.DeleteBySourceAsync(userId.Value, source);
        return Ok(ApiResponse<DeleteBySourceResponse>.SuccessResponse(response));
    }
}
