using Microsoft.AspNetCore.Mvc;
using WalkingApp.Api.Common.Extensions;
using WalkingApp.Api.Common.Models;
using WalkingApp.Api.Steps.DTOs;

namespace WalkingApp.Api.Steps;

/// <summary>
/// Controller for step tracking endpoints.
/// </summary>
[ApiController]
[Route("api/steps")]
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

        try
        {
            var entry = await _stepService.RecordStepsAsync(userId.Value, request);
            return CreatedAtAction(nameof(GetEntry), new { id = entry.Id }, ApiResponse<StepEntryResponse>.SuccessResponse(entry));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<StepEntryResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<StepEntryResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
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

        try
        {
            var summary = await _stepService.GetTodayAsync(userId.Value);
            return Ok(ApiResponse<DailyStepsResponse>.SuccessResponse(summary));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<DailyStepsResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
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

        try
        {
            var range = new DateRange { StartDate = startDate, EndDate = endDate };
            var summaries = await _stepService.GetDailyHistoryAsync(userId.Value, range);
            return Ok(ApiResponse<List<DailyStepsResponse>>.SuccessResponse(summaries));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<List<DailyStepsResponse>>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<List<DailyStepsResponse>>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
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

        try
        {
            var range = new DateRange { StartDate = startDate, EndDate = endDate };
            var history = await _stepService.GetDetailedHistoryAsync(userId.Value, range, page, pageSize);
            return Ok(ApiResponse<StepHistoryResponse>.SuccessResponse(history));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<StepHistoryResponse>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<StepHistoryResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
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

        try
        {
            var entry = await _stepService.GetEntryAsync(userId.Value, id);
            return Ok(ApiResponse<StepEntryResponse>.SuccessResponse(entry));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<StepEntryResponse>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<StepEntryResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
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

        try
        {
            var deleted = await _stepService.DeleteEntryAsync(userId.Value, id);

            if (!deleted)
            {
                return NotFound(ApiResponse<object>.ErrorResponse("Step entry not found."));
            }

            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }
}
