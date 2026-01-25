namespace WalkingApp.Api.Groups.DTOs;

/// <summary>
/// Request DTO for updating a member's role in a group.
/// </summary>
public class UpdateMemberRoleRequest
{
    /// <summary>
    /// The new role for the member.
    /// </summary>
    public MemberRole Role { get; set; }
}
