namespace Stepper.Api.Steps.DTOs;

/// <summary>
/// Response DTO for paginated step history.
/// </summary>
public record StepHistoryResponse
{
    public List<StepEntryResponse> Items { get; init; } = new();
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
}
