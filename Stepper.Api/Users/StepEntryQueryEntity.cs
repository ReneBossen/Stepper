using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Stepper.Api.Users;

/// <summary>
/// Internal entity for querying step_entries table from Users feature.
/// Used for activity calculations without cross-feature dependencies.
/// </summary>
[Table("step_entries")]
internal class StepEntryQueryEntity : BaseModel
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
}
