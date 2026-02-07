namespace Stepper.Api.Friends.DTOs;

/// <summary>
/// Response DTO for a list of friends.
/// </summary>
public record FriendListResponse
{
    /// <summary>
    /// The list of friends.
    /// </summary>
    public List<FriendResponse> Friends { get; init; } = new();

    /// <summary>
    /// The total count of friends.
    /// </summary>
    public int TotalCount { get; init; }
}
