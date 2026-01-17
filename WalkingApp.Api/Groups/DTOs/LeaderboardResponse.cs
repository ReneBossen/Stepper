namespace WalkingApp.Api.Groups.DTOs;

/// <summary>
/// Response DTO for a group leaderboard.
/// </summary>
public class LeaderboardResponse
{
    /// <summary>
    /// ID of the group.
    /// </summary>
    public Guid GroupId { get; set; }

    /// <summary>
    /// Start date of the competition period.
    /// </summary>
    public DateTime PeriodStart { get; set; }

    /// <summary>
    /// End date of the competition period.
    /// </summary>
    public DateTime PeriodEnd { get; set; }

    /// <summary>
    /// List of leaderboard entries.
    /// </summary>
    public List<LeaderboardEntry> Entries { get; set; } = new();
}
