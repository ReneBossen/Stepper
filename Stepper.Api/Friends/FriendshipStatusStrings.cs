namespace Stepper.Api.Friends;

/// <summary>
/// String constants for friendship status values stored in the database.
/// </summary>
/// <remarks>
/// These constants match the values stored in the 'status' column of the 'friendships' table.
/// Use these instead of magic strings when querying friendship status.
/// </remarks>
public static class FriendshipStatusStrings
{
    /// <summary>
    /// The status value for a pending friend request.
    /// </summary>
    public const string Pending = "pending";

    /// <summary>
    /// The status value for an accepted friendship.
    /// </summary>
    public const string Accepted = "accepted";

    /// <summary>
    /// The status value for a rejected friend request.
    /// </summary>
    public const string Rejected = "rejected";

    /// <summary>
    /// The status value for a blocked user.
    /// </summary>
    public const string Blocked = "blocked";
}
