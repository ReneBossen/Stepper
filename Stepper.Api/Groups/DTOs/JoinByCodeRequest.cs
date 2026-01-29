namespace Stepper.Api.Groups.DTOs;

/// <summary>
/// Request DTO for joining a group by invite code.
/// </summary>
public class JoinByCodeRequest
{
    /// <summary>
    /// The invite code for the group.
    /// </summary>
    public string Code { get; set; } = string.Empty;
}
