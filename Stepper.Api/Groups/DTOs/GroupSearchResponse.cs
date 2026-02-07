namespace Stepper.Api.Groups.DTOs;

/// <summary>
/// Response DTO for group search results.
/// </summary>
public record GroupSearchResponse
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
    /// Number of members in the group.
    /// </summary>
    public int MemberCount { get; init; }

    /// <summary>
    /// Whether the group is public or private.
    /// </summary>
    public bool IsPublic { get; init; }

    /// <summary>
    /// Maximum number of members allowed in the group.
    /// </summary>
    public int MaxMembers { get; init; }
}
