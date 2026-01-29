namespace Stepper.Api.Groups;

/// <summary>
/// Domain model representing a user's membership in a group.
/// </summary>
public class GroupMembership
{
    /// <summary>
    /// Unique identifier for the membership.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// ID of the group.
    /// </summary>
    public Guid GroupId { get; set; }

    /// <summary>
    /// ID of the user.
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Role of the user in the group.
    /// </summary>
    public MemberRole Role { get; set; }

    /// <summary>
    /// When the user joined the group.
    /// </summary>
    public DateTime JoinedAt { get; set; }
}
