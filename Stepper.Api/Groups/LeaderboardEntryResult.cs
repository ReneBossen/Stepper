using System.Text.Json.Serialization;

namespace Stepper.Api.Groups;

/// <summary>
/// Result model for leaderboard database function deserialization.
/// Internal to the Groups feature for mapping database results to domain models.
/// </summary>
internal class LeaderboardEntryResult
{
    [JsonPropertyName("rank")]
    public long Rank { get; set; }

    [JsonPropertyName("user_id")]
    public Guid UserId { get; set; }

    [JsonPropertyName("display_name")]
    public string DisplayName { get; set; } = string.Empty;

    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("total_steps")]
    public long TotalSteps { get; set; }

    [JsonPropertyName("total_distance_meters")]
    public double TotalDistanceMeters { get; set; }
}
