using System.Text.Json.Serialization;

namespace Stepper.Api.Groups.DTOs;

/// <summary>
/// Request DTO for creating a new group.
/// </summary>
public record CreateGroupRequest
{
    /// <summary>
    /// Name of the group (2-50 characters).
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Optional description of the group.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Whether the group is public (anyone can join) or private (requires join code).
    /// </summary>
    public bool IsPublic { get; init; }

    /// <summary>
    /// Competition period type for the group leaderboard.
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public CompetitionPeriodType PeriodType { get; init; }

    /// <summary>
    /// Maximum number of members allowed in the group (1-50, default 5).
    /// </summary>
    public int MaxMembers { get; init; } = 5;
}
