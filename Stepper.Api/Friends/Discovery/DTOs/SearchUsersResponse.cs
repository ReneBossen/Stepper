namespace Stepper.Api.Friends.Discovery.DTOs;

/// <summary>
/// Response DTO for user search results.
/// </summary>
public class SearchUsersResponse
{
    public List<UserSearchResult> Users { get; set; } = new();
    public int TotalCount { get; set; }
}
