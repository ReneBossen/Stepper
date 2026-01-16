using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace WalkingApp.Api.Steps;

/// <summary>
/// Entity model for Supabase step_entries table.
/// </summary>
[Table("step_entries")]
internal class StepEntryEntity : BaseModel
{
    [PrimaryKey("id", false)]
    public Guid Id { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("step_count")]
    public int StepCount { get; set; }

    [Column("distance_meters")]
    public double? DistanceMeters { get; set; }

    [Column("date")]
    public DateOnly Date { get; set; }

    [Column("recorded_at")]
    public DateTime RecordedAt { get; set; }

    [Column("source")]
    public string? Source { get; set; }

    public StepEntry ToStepEntry()
    {
        return new StepEntry
        {
            Id = Id,
            UserId = UserId,
            StepCount = StepCount,
            DistanceMeters = DistanceMeters,
            Date = Date,
            RecordedAt = RecordedAt,
            Source = Source
        };
    }

    public static StepEntryEntity FromStepEntry(StepEntry stepEntry)
    {
        return new StepEntryEntity
        {
            Id = stepEntry.Id,
            UserId = stepEntry.UserId,
            StepCount = stepEntry.StepCount,
            DistanceMeters = stepEntry.DistanceMeters,
            Date = stepEntry.Date,
            RecordedAt = stepEntry.RecordedAt,
            Source = stepEntry.Source
        };
    }
}
