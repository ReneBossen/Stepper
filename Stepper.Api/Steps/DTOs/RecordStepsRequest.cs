using System.ComponentModel.DataAnnotations;

namespace Stepper.Api.Steps.DTOs;

/// <summary>
/// Request DTO for recording step count data.
/// </summary>
public record RecordStepsRequest
{
    [Required]
    [Range(0, 200000, ErrorMessage = "Step count must be between 0 and 200000.")]
    public int StepCount { get; init; }

    [Range(0, double.MaxValue, ErrorMessage = "Distance must be a positive value.")]
    public double? DistanceMeters { get; init; }

    [Required]
    public DateOnly Date { get; init; }

    [MaxLength(100)]
    public string? Source { get; init; }
}
