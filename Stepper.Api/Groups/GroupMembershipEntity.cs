using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Stepper.Api.Groups;

/// <summary>
/// Entity model for Supabase group_memberships table mapping.
/// </summary>
[Table("group_memberships")]
public class GroupMembershipEntity : BaseModel
{
    [PrimaryKey("id")]
    public Guid Id { get; set; }

    [Column("group_id")]
    public Guid GroupId { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("role")]
    public string Role { get; set; } = string.Empty;

    [Column("joined_at")]
    public DateTime JoinedAt { get; set; }

    /// <summary>
    /// Converts the entity to a domain GroupMembership model.
    /// </summary>
    public GroupMembership ToGroupMembership()
    {
        return new GroupMembership
        {
            Id = Id,
            GroupId = GroupId,
            UserId = UserId,
            Role = ParseRole(Role),
            JoinedAt = JoinedAt
        };
    }

    /// <summary>
    /// Creates an entity from a domain GroupMembership model.
    /// </summary>
    public static GroupMembershipEntity FromGroupMembership(GroupMembership membership)
    {
        return new GroupMembershipEntity
        {
            Id = membership.Id,
            GroupId = membership.GroupId,
            UserId = membership.UserId,
            Role = membership.Role.ToString().ToLowerInvariant(),
            JoinedAt = membership.JoinedAt
        };
    }

    private static MemberRole ParseRole(string role)
    {
        return role.ToLowerInvariant() switch
        {
            "owner" => MemberRole.Owner,
            "admin" => MemberRole.Admin,
            "member" => MemberRole.Member,
            _ => throw new ArgumentException($"Unknown role: {role}")
        };
    }
}
