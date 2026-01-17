namespace WalkingApp.Api.Groups;

/// <summary>
/// Result model for leaderboard database function deserialization.
/// Internal to the Groups feature for mapping database results to domain models.
/// </summary>
internal class LeaderboardEntryResult
{
    public long Rank { get; set; }
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public long TotalSteps { get; set; }
    public double TotalDistanceMeters { get; set; }
}
