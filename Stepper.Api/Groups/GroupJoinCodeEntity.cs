using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Stepper.Api.Groups;

/// <summary>
/// Entity model for Supabase group_join_codes table mapping.
/// Stores join codes separately from the groups table.
/// </summary>
[Table("group_join_codes")]
public class GroupJoinCodeEntity : BaseModel
{
    [PrimaryKey("id")]
    public Guid Id { get; set; }

    [Column("group_id")]
    public Guid GroupId { get; set; }

    [Column("join_code")]
    public string JoinCode { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
