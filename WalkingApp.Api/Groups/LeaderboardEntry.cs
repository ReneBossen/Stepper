namespace WalkingApp.Api.Groups;

/// <summary>
/// Domain model representing a single entry in a group leaderboard.
/// </summary>
public class LeaderboardEntry
{
    /// <summary>
    /// Rank position in the leaderboard (1-based).
    /// </summary>
    public int Rank { get; set; }

    /// <summary>
    /// ID of the user.
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Display name of the user.
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Avatar URL of the user.
    /// </summary>
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// Total step count for the competition period.
    /// </summary>
    public int TotalSteps { get; set; }

    /// <summary>
    /// Total distance in meters for the competition period.
    /// </summary>
    public double TotalDistanceMeters { get; set; }
}
