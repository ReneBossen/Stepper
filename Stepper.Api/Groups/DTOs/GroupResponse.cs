using System.Text.Json.Serialization;

namespace Stepper.Api.Groups.DTOs;

/// <summary>
/// Response DTO for group information.
/// </summary>
public class GroupResponse
{
    /// <summary>
    /// Unique identifier for the group.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Name of the group.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional description of the group.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Whether the group is public or private.
    /// </summary>
    public bool IsPublic { get; set; }

    /// <summary>
    /// Competition period type for the group leaderboard.
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public CompetitionPeriodType PeriodType { get; set; }

    /// <summary>
    /// Number of members in the group.
    /// </summary>
    public int MemberCount { get; set; }

    /// <summary>
    /// Maximum number of members allowed in the group.
    /// </summary>
    public int MaxMembers { get; set; }

    /// <summary>
    /// Join code for the group (only visible to admins/owners).
    /// </summary>
    public string? JoinCode { get; set; }

    /// <summary>
    /// The current user's role in the group.
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public MemberRole Role { get; set; }

    /// <summary>
    /// When the group was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }
}
