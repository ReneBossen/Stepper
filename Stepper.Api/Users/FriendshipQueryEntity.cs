using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Stepper.Api.Users;

/// <summary>
/// Internal entity for querying friendships table from Users feature.
/// Used for counting friends without cross-feature dependencies.
/// </summary>
[Table("friendships")]
internal class FriendshipQueryEntity : BaseModel
{
    [PrimaryKey("id")]
    public Guid Id { get; set; }

    [Column("requester_id")]
    public Guid RequesterId { get; set; }

    [Column("addressee_id")]
    public Guid AddresseeId { get; set; }

    [Column("status")]
    public string Status { get; set; } = string.Empty;
}
