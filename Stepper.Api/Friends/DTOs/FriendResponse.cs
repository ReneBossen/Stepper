namespace Stepper.Api.Friends.DTOs;

/// <summary>
/// Response DTO for a friend.
/// </summary>
public class FriendResponse
{
    /// <summary>
    /// The user ID of the friend.
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// The display name of the friend.
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// The avatar URL of the friend.
    /// </summary>
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// When the friendship was accepted.
    /// </summary>
    public DateTime FriendsSince { get; set; }
}
