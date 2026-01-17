namespace WalkingApp.Api.Groups.DTOs;

/// <summary>
/// Request DTO for updating group information.
/// </summary>
public class UpdateGroupRequest
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
    /// Whether the group is public or private.
    /// </summary>
    public bool IsPublic { get; set; }
}
