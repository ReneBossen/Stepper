namespace Stepper.Api.Friends;

/// <summary>
/// Domain model representing a friendship relationship between two users.
/// </summary>
public class Friendship
{
    public Guid Id { get; set; }
    public Guid RequesterId { get; set; }
    public Guid AddresseeId { get; set; }
    public FriendshipStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? AcceptedAt { get; set; }
}
