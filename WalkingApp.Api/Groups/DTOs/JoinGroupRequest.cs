namespace WalkingApp.Api.Groups.DTOs;

/// <summary>
/// Request DTO for joining a group.
/// </summary>
public class JoinGroupRequest
{
    /// <summary>
    /// Join code for private groups (not required for public groups).
    /// </summary>
    public string? JoinCode { get; set; }
}
