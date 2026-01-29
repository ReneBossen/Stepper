namespace Stepper.Api.Friends.DTOs;

/// <summary>
/// Response DTO for a friend request.
/// </summary>
public class FriendRequestResponse
{
    /// <summary>
    /// The ID of the friend request.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// The ID of the user who sent the request.
    /// </summary>
    public Guid RequesterId { get; set; }

    /// <summary>
    /// The display name of the requester.
    /// </summary>
    public string RequesterDisplayName { get; set; } = string.Empty;

    /// <summary>
    /// The avatar URL of the requester.
    /// </summary>
    public string? RequesterAvatarUrl { get; set; }

    /// <summary>
    /// The status of the friend request.
    /// </summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>
    /// When the request was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }
}
