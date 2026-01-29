namespace Stepper.Api.Groups.DTOs;

/// <summary>
/// Request DTO for inviting a member to a group.
/// </summary>
public class InviteMemberRequest
{
    /// <summary>
    /// ID of the user to invite.
    /// </summary>
    public Guid UserId { get; set; }
}
