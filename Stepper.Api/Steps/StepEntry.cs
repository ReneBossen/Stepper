namespace Stepper.Api.Steps;

/// <summary>
/// Domain model representing a single step count entry.
/// </summary>
public class StepEntry
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public int StepCount { get; set; }
    public double? DistanceMeters { get; set; }
    public DateOnly Date { get; set; }
    public DateTime RecordedAt { get; set; }
    public string? Source { get; set; }
}
