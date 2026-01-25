using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace WalkingApp.Api.Steps;

/// <summary>
/// Entity model for reading user preferences from Supabase user_preferences table.
/// This is a minimal entity that only includes the fields needed by the Steps feature.
/// </summary>
[Table("user_preferences")]
internal class UserPreferencesEntity : BaseModel
{
    [PrimaryKey("id", false)]
    public Guid Id { get; set; }

    [Column("daily_step_goal")]
    public int DailyStepGoal { get; set; } = 10000;
}
