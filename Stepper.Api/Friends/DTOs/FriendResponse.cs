namespace Stepper.Api.Friends.DTOs;

/// <summary>
/// Response DTO for a friend.
/// </summary>
public record FriendResponse
{
    /// <summary>
    /// The user ID of the friend.
    /// </summary>
    public Guid UserId { get; init; }

    /// <summary>
    /// The display name of the friend.
    /// </summary>
    public string DisplayName { get; init; } = string.Empty;

    /// <summary>
    /// The avatar URL of the friend.
    /// </summary>
    public string? AvatarUrl { get; init; }

    /// <summary>
    /// When the friendship was accepted.
    /// </summary>
    public DateTime FriendsSince { get; init; }
}
