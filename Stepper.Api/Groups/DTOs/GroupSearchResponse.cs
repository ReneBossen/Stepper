namespace Stepper.Api.Groups.DTOs;

/// <summary>
/// Response DTO for group search results.
/// </summary>
public class GroupSearchResponse
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
    /// Number of members in the group.
    /// </summary>
    public int MemberCount { get; set; }

    /// <summary>
    /// Whether the group is public or private.
    /// </summary>
    public bool IsPublic { get; set; }

    /// <summary>
    /// Maximum number of members allowed in the group.
    /// </summary>
    public int MaxMembers { get; set; }
}
