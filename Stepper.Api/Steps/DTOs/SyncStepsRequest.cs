using System.ComponentModel.DataAnnotations;

namespace Stepper.Api.Steps.DTOs;

/// <summary>
/// Request DTO for bulk syncing step entries from health providers.
/// </summary>
public record SyncStepsRequest
{
    /// <summary>
    /// List of step entries to sync. Must contain between 1 and 31 entries.
    /// </summary>
    [Required]
    [MinLength(1, ErrorMessage = "At least one entry is required.")]
    [MaxLength(31, ErrorMessage = "Maximum 31 entries allowed per sync.")]
    public required List<SyncStepEntry> Entries { get; init; }
}

/// <summary>
/// A single step entry within a sync request.
/// </summary>
public record SyncStepEntry
{
    /// <summary>
    /// The date for this step entry.
    /// </summary>
    [Required]
    public DateOnly Date { get; init; }

    /// <summary>
    /// The number of steps recorded. Must be between 0 and 200000.
    /// </summary>
    [Required]
    [Range(0, 200000, ErrorMessage = "Step count must be between 0 and 200000.")]
    public int StepCount { get; init; }

    /// <summary>
    /// The distance traveled in meters. Optional, must be non-negative.
    /// </summary>
    [Range(0, double.MaxValue, ErrorMessage = "Distance must be a positive value.")]
    public double? DistanceMeters { get; init; }

    /// <summary>
    /// The source of the step data (e.g., "HealthKit", "Google Fit").
    /// </summary>
    [Required]
    [MaxLength(100, ErrorMessage = "Source cannot exceed 100 characters.")]
    public required string Source { get; init; }
}
