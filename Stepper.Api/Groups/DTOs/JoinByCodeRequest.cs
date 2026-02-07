namespace Stepper.Api.Groups.DTOs;

/// <summary>
/// Request DTO for joining a group by invite code.
/// </summary>
public record JoinByCodeRequest
{
    /// <summary>
    /// The invite code for the group.
    /// </summary>
    public string Code { get; init; } = string.Empty;
}
