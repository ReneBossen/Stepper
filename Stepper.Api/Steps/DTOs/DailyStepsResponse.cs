namespace Stepper.Api.Steps.DTOs;

/// <summary>
/// Response DTO for daily step summary.
/// </summary>
public class DailyStepsResponse
{
    public DateOnly Date { get; set; }
    public int TotalSteps { get; set; }
    public double TotalDistanceMeters { get; set; }
}
