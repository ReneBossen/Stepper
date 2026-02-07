namespace Stepper.Api.Friends.Discovery.DTOs;

/// <summary>
/// Response DTO for user search results.
/// </summary>
public record SearchUsersResponse
{
    public List<UserSearchResult> Users { get; init; } = new();
    public int TotalCount { get; init; }
}
