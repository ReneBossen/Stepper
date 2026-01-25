using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace WalkingApp.Api.Users;

/// <summary>
/// Internal entity for querying group_memberships table from Users feature.
/// Used for counting groups and finding mutual groups without cross-feature dependencies.
/// </summary>
[Table("group_memberships")]
internal class GroupMembershipQueryEntity : BaseModel
{
    [PrimaryKey("id")]
    public Guid Id { get; set; }

    [Column("group_id")]
    public Guid GroupId { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }
}
