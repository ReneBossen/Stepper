using System.ComponentModel.DataAnnotations;

namespace Stepper.Api.Steps.DTOs;

/// <summary>
/// Request DTO for recording step count data.
/// </summary>
public class RecordStepsRequest
{
    [Required]
    [Range(0, 200000, ErrorMessage = "Step count must be between 0 and 200000.")]
    public int StepCount { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Distance must be a positive value.")]
    public double? DistanceMeters { get; set; }

    [Required]
    public DateOnly Date { get; set; }

    [MaxLength(100)]
    public string? Source { get; set; }
}
