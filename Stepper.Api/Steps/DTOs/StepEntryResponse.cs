namespace Stepper.Api.Steps.DTOs;

/// <summary>
/// Response DTO for a single step entry.
/// </summary>
public record StepEntryResponse
{
    public Guid Id { get; init; }
    public int StepCount { get; init; }
    public double? DistanceMeters { get; init; }
    public DateOnly Date { get; init; }
    public DateTime RecordedAt { get; init; }
    public string? Source { get; init; }
}
