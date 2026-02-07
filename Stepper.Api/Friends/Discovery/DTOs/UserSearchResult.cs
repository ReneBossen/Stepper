namespace Stepper.Api.Friends.Discovery.DTOs;

/// <summary>
/// DTO representing a single user search result.
/// </summary>
public record UserSearchResult
{
    public Guid Id { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string? AvatarUrl { get; init; }
    public string FriendshipStatus { get; init; } = "none";
}
