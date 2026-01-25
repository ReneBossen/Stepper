namespace WalkingApp.Api.Users.DTOs;

/// <summary>
/// Response model for a mutual group shared between two users.
/// </summary>
public class MutualGroupResponse
{
    /// <summary>
    /// The unique identifier of the group.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// The name of the group.
    /// </summary>
    public string Name { get; set; } = string.Empty;
}
