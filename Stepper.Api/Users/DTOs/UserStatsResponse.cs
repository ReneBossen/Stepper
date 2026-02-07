namespace Stepper.Api.Users.DTOs;

/// <summary>
/// Response model containing user statistics.
/// </summary>
public record UserStatsResponse
{
    /// <summary>
    /// The number of accepted friends.
    /// </summary>
    public int FriendsCount { get; init; }

    /// <summary>
    /// The number of groups the user is a member of.
    /// </summary>
    public int GroupsCount { get; init; }

    /// <summary>
    /// The number of badges earned by the user.
    /// </summary>
    public int BadgesCount { get; init; }
}
