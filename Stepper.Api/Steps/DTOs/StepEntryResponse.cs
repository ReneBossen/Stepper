namespace Stepper.Api.Steps.DTOs;

/// <summary>
/// Response DTO for a single step entry.
/// </summary>
public class StepEntryResponse
{
    public Guid Id { get; set; }
    public int StepCount { get; set; }
    public double? DistanceMeters { get; set; }
    public DateOnly Date { get; set; }
    public DateTime RecordedAt { get; set; }
    public string? Source { get; set; }
}
