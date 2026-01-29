namespace Stepper.Api.Friends;

/// <summary>
/// Status of a friendship relationship.
/// </summary>
public enum FriendshipStatus
{
    /// <summary>
    /// Friend request is pending acceptance.
    /// </summary>
    Pending,

    /// <summary>
    /// Friend request has been accepted.
    /// </summary>
    Accepted,

    /// <summary>
    /// Friend request has been rejected.
    /// </summary>
    Rejected,

    /// <summary>
    /// User has been blocked.
    /// </summary>
    Blocked
}
