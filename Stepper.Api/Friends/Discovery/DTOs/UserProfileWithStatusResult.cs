namespace Stepper.Api.Friends.Discovery.DTOs;

/// <summary>
/// DTO representing a user profile along with the directional friendship status
/// between the requesting user and the target user.
/// </summary>
public record UserProfileWithStatusResult
{
    public Guid Id { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string? AvatarUrl { get; init; }

    /// <summary>
    /// Directional friendship status: "none", "pending_sent", "pending_received", or "accepted".
    /// </summary>
    public string FriendshipStatus { get; init; } = "none";

    /// <summary>
    /// The ID of the friendship row, when one exists (pending or accepted).
    /// </summary>
    public Guid? FriendshipId { get; init; }
}
