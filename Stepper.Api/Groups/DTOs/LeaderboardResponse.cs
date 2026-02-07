namespace Stepper.Api.Groups.DTOs;

/// <summary>
/// Response DTO for a group leaderboard.
/// </summary>
public record LeaderboardResponse
{
    /// <summary>
    /// ID of the group.
    /// </summary>
    public Guid GroupId { get; init; }

    /// <summary>
    /// Start date of the competition period.
    /// </summary>
    public DateTime PeriodStart { get; init; }

    /// <summary>
    /// End date of the competition period.
    /// </summary>
    public DateTime PeriodEnd { get; init; }

    /// <summary>
    /// List of leaderboard entries.
    /// </summary>
    public List<LeaderboardEntry> Entries { get; init; } = new();
}
