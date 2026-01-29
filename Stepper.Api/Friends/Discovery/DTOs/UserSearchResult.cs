namespace Stepper.Api.Friends.Discovery.DTOs;

/// <summary>
/// DTO representing a single user search result.
/// </summary>
public class UserSearchResult
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string FriendshipStatus { get; set; } = "none";
}
