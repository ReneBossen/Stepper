using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using WalkingApp.Api.Common.Constants;

namespace WalkingApp.Api.Friends;

/// <summary>
/// Entity model for Supabase friendships table mapping.
/// </summary>
[Table("friendships")]
public class FriendshipEntity : BaseModel
{
    [PrimaryKey("id")]
    public Guid Id { get; set; }

    [Column("requester_id")]
    public Guid RequesterId { get; set; }

    [Column("addressee_id")]
    public Guid AddresseeId { get; set; }

    [Column("status")]
    public string Status { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("accepted_at")]
    public DateTime? AcceptedAt { get; set; }

    /// <summary>
    /// Converts the entity to a domain Friendship model.
    /// </summary>
    public Friendship ToFriendship()
    {
        return new Friendship
        {
            Id = Id,
            RequesterId = RequesterId,
            AddresseeId = AddresseeId,
            Status = ParseStatus(Status),
            CreatedAt = CreatedAt,
            AcceptedAt = AcceptedAt
        };
    }

    /// <summary>
    /// Creates an entity from a domain Friendship model.
    /// </summary>
    public static FriendshipEntity FromFriendship(Friendship friendship)
    {
        return new FriendshipEntity
        {
            Id = friendship.Id,
            RequesterId = friendship.RequesterId,
            AddresseeId = friendship.AddresseeId,
            Status = friendship.Status.ToString().ToLowerInvariant(),
            CreatedAt = friendship.CreatedAt,
            AcceptedAt = friendship.AcceptedAt
        };
    }

    private static FriendshipStatus ParseStatus(string status)
    {
        return status.ToLowerInvariant() switch
        {
            FriendshipStatusStrings.Pending => FriendshipStatus.Pending,
            FriendshipStatusStrings.Accepted => FriendshipStatus.Accepted,
            FriendshipStatusStrings.Rejected => FriendshipStatus.Rejected,
            FriendshipStatusStrings.Blocked => FriendshipStatus.Blocked,
            _ => throw new ArgumentException($"Unknown friendship status: {status}")
        };
    }
}
