namespace Stepper.Api.Groups;

/// <summary>
/// Lifecycle status of a group membership row.
/// </summary>
public enum MembershipStatus
{
    /// <summary>
    /// Full member. Counts toward max_members, receives notifications, and
    /// can perform role-gated actions.
    /// </summary>
    Active,

    /// <summary>
    /// Awaiting approval in a group with require_approval = true. Does not
    /// count toward max_members and has no role-gated access.
    /// </summary>
    Pending
}
