namespace Stepper.Api.Friends.DTOs;

/// <summary>
/// Request DTO for sending a friend request.
/// </summary>
public class SendFriendRequestRequest
{
    /// <summary>
    /// The ID of the user to send a friend request to.
    /// </summary>
    public Guid FriendUserId { get; set; }
}
