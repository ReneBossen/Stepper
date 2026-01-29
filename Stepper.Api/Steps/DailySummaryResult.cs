using System.Text.Json.Serialization;

namespace Stepper.Api.Steps;

/// <summary>
/// Internal model for deserializing results from the get_daily_step_summary database function.
/// </summary>
internal class DailySummaryResult
{
    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    [JsonPropertyName("total_steps")]
    public long TotalSteps { get; set; }

    [JsonPropertyName("total_distance_meters")]
    public double TotalDistanceMeters { get; set; }

    [JsonPropertyName("entry_count")]
    public long EntryCount { get; set; }
}
