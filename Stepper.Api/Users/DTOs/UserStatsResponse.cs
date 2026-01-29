namespace Stepper.Api.Users.DTOs;

/// <summary>
/// Response model containing user statistics.
/// </summary>
public class UserStatsResponse
{
    /// <summary>
    /// The number of accepted friends.
    /// </summary>
    public int FriendsCount { get; set; }

    /// <summary>
    /// The number of groups the user is a member of.
    /// </summary>
    public int GroupsCount { get; set; }

    /// <summary>
    /// The number of badges earned by the user.
    /// </summary>
    public int BadgesCount { get; set; }
}
