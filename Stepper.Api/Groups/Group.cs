namespace Stepper.Api.Groups;

/// <summary>
/// Domain model representing a group for competitive walking challenges.
/// </summary>
public class Group
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
    /// ID of the user who created the group.
    /// </summary>
    public Guid CreatedById { get; set; }

    /// <summary>
    /// Whether the group is public (anyone can join) or private (requires join code).
    /// </summary>
    public bool IsPublic { get; set; }

    /// <summary>
    /// Join code for private groups (null for public groups).
    /// </summary>
    public string? JoinCode { get; set; }

    /// <summary>
    /// Competition period type for the group leaderboard.
    /// </summary>
    public CompetitionPeriodType PeriodType { get; set; }

    /// <summary>
    /// When the group was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Number of members in the group.
    /// </summary>
    public int MemberCount { get; set; }

    /// <summary>
    /// Maximum number of members allowed in the group.
    /// </summary>
    public int MaxMembers { get; set; } = 5;
}
