namespace Stepper.Api.Groups.DTOs;

/// <summary>
/// Response DTO for a list of groups.
/// </summary>
public class GroupListResponse
{
    /// <summary>
    /// List of groups the user is a member of.
    /// </summary>
    public List<GroupResponse> Groups { get; set; } = new();
}
