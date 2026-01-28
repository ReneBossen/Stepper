namespace WalkingApp.Api.Steps.DTOs;

/// <summary>
/// Response DTO for the delete by source operation.
/// </summary>
public class DeleteBySourceResponse
{
    /// <summary>
    /// Number of step entries deleted.
    /// </summary>
    public int DeletedCount { get; set; }
}
