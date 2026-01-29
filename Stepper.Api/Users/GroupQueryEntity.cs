using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Stepper.Api.Users;

/// <summary>
/// Internal entity for querying groups table from Users feature.
/// Used for fetching group names for mutual groups without cross-feature dependencies.
/// </summary>
[Table("groups")]
internal class GroupQueryEntity : BaseModel
{
    [PrimaryKey("id")]
    public Guid Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;
}
