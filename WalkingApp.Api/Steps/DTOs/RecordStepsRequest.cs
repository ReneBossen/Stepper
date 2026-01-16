namespace WalkingApp.Api.Steps.DTOs;

/// <summary>
/// Request DTO for recording step count data.
/// </summary>
public class RecordStepsRequest
{
    public int StepCount { get; set; }
    public double? DistanceMeters { get; set; }
    public DateOnly Date { get; set; }
    public string? Source { get; set; }
}
