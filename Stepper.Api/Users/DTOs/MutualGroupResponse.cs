namespace Stepper.Api.Users.DTOs;

/// <summary>
/// Response model for a mutual group shared between two users.
/// </summary>
public record MutualGroupResponse
{
    /// <summary>
    /// The unique identifier of the group.
    /// </summary>
    public Guid Id { get; init; }

    /// <summary>
    /// The name of the group.
    /// </summary>
    public string Name { get; init; } = string.Empty;
}
