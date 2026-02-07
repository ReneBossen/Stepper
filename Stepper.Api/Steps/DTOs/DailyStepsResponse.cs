namespace Stepper.Api.Steps.DTOs;

/// <summary>
/// Response DTO for daily step summary.
/// </summary>
public record DailyStepsResponse
{
    public DateOnly Date { get; init; }
    public int TotalSteps { get; init; }
    public double TotalDistanceMeters { get; init; }
}
