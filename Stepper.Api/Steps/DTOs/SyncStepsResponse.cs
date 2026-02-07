namespace Stepper.Api.Steps.DTOs;

/// <summary>
/// Response DTO for the bulk sync operation.
/// </summary>
public record SyncStepsResponse
{
    /// <summary>
    /// Number of new entries created.
    /// </summary>
    public int Created { get; init; }

    /// <summary>
    /// Number of existing entries updated.
    /// </summary>
    public int Updated { get; init; }

    /// <summary>
    /// Total number of entries processed.
    /// </summary>
    public int Total { get; init; }
}
