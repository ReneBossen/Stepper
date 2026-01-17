namespace WalkingApp.Api.Groups.DTOs;

/// <summary>
/// Request DTO for creating a new group.
/// </summary>
public class CreateGroupRequest
{
    /// <summary>
    /// Name of the group (2-50 characters).
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional description of the group.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Whether the group is public (anyone can join) or private (requires join code).
    /// </summary>
    public bool IsPublic { get; set; }

    /// <summary>
    /// Competition period type for the group leaderboard.
    /// </summary>
    public CompetitionPeriodType PeriodType { get; set; }
}
