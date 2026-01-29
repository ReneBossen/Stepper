namespace Stepper.Api.Groups;

/// <summary>
/// Role of a member within a group.
/// </summary>
public enum MemberRole
{
    /// <summary>
    /// Group owner (creator) with full permissions.
    /// </summary>
    Owner,

    /// <summary>
    /// Group administrator with management permissions.
    /// </summary>
    Admin,

    /// <summary>
    /// Regular group member.
    /// </summary>
    Member
}
