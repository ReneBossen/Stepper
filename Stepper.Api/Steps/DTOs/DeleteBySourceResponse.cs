namespace Stepper.Api.Steps.DTOs;

/// <summary>
/// Response DTO for the delete by source operation.
/// </summary>
public record DeleteBySourceResponse
{
    /// <summary>
    /// Number of step entries deleted.
    /// </summary>
    public int DeletedCount { get; init; }
}
