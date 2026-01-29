namespace Stepper.Api.Steps.DTOs;

/// <summary>
/// Response DTO for the bulk sync operation.
/// </summary>
public class SyncStepsResponse
{
    /// <summary>
    /// Number of new entries created.
    /// </summary>
    public int Created { get; set; }

    /// <summary>
    /// Number of existing entries updated.
    /// </summary>
    public int Updated { get; set; }

    /// <summary>
    /// Total number of entries processed.
    /// </summary>
    public int Total { get; set; }
}
