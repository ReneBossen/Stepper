namespace Stepper.Api.Friends.DTOs;

/// <summary>
/// Response DTO for a list of friends.
/// </summary>
public class FriendListResponse
{
    /// <summary>
    /// The list of friends.
    /// </summary>
    public List<FriendResponse> Friends { get; set; } = new();

    /// <summary>
    /// The total count of friends.
    /// </summary>
    public int TotalCount { get; set; }
}
