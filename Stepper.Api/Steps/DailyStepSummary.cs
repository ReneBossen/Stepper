namespace Stepper.Api.Steps;

/// <summary>
/// Domain model representing aggregated step data for a single day.
/// </summary>
public class DailyStepSummary
{
    public DateOnly Date { get; set; }
    public int TotalSteps { get; set; }
    public double TotalDistanceMeters { get; set; }
    public int EntryCount { get; set; }
}
