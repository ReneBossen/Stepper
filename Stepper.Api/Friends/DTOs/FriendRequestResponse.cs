namespace Stepper.Api.Friends.DTOs;

/// <summary>
/// Response DTO for a friend request.
/// </summary>
public record FriendRequestResponse
{
    /// <summary>
    /// The ID of the friend request.
    /// </summary>
    public Guid Id { get; init; }

    /// <summary>
    /// The ID of the user who sent the request.
    /// </summary>
    public Guid RequesterId { get; init; }

    /// <summary>
    /// The display name of the requester.
    /// </summary>
    public string RequesterDisplayName { get; init; } = string.Empty;

    /// <summary>
    /// The avatar URL of the requester.
    /// </summary>
    public string? RequesterAvatarUrl { get; init; }

    /// <summary>
    /// The status of the friend request.
    /// </summary>
    public string Status { get; init; } = string.Empty;

    /// <summary>
    /// When the request was created.
    /// </summary>
    public DateTime CreatedAt { get; init; }
}
