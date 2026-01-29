namespace Stepper.Api.Steps.DTOs;

/// <summary>
/// Response DTO for paginated step history.
/// </summary>
public class StepHistoryResponse
{
    public List<StepEntryResponse> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
