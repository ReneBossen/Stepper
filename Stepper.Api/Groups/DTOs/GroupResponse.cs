using System.Text.Json.Serialization;

namespace Stepper.Api.Groups.DTOs;

/// <summary>
/// Response DTO for group information.
/// </summary>
public record GroupResponse
{
    /// <summary>
    /// Unique identifier for the group.
    /// </summary>
    public Guid Id { get; init; }

    /// <summary>
    /// Name of the group.
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Optional description of the group.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Whether the group is public or private.
    /// </summary>
    public bool IsPublic { get; init; }

    /// <summary>
    /// Competition period type for the group leaderboard.
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public CompetitionPeriodType PeriodType { get; init; }

    /// <summary>
    /// Number of members in the group.
    /// </summary>
    public int MemberCount { get; init; }

    /// <summary>
    /// Maximum number of members allowed in the group.
    /// </summary>
    public int MaxMembers { get; init; }

    /// <summary>
    /// Join code for the group (only visible to admins/owners).
    /// </summary>
    public string? JoinCode { get; init; }

    /// <summary>
    /// The current user's role in the group.
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public MemberRole Role { get; init; }

    /// <summary>
    /// When the group was created.
    /// </summary>
    public DateTime CreatedAt { get; init; }
}
