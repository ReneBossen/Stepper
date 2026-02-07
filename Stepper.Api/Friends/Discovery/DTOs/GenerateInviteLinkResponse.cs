namespace Stepper.Api.Friends.Discovery.DTOs;

/// <summary>
/// Response DTO for invite link generation.
/// </summary>
public record GenerateInviteLinkResponse
{
    /// <summary>
    /// The generated invite code.
    /// </summary>
    public string Code { get; init; } = string.Empty;

    /// <summary>
    /// Deep link URL for sharing.
    /// </summary>
    public string DeepLink { get; init; } = string.Empty;

    /// <summary>
    /// Expiration timestamp (UTC), if applicable.
    /// </summary>
    public DateTime? ExpiresAt { get; init; }

    /// <summary>
    /// Maximum number of usages, if applicable.
    /// </summary>
    public int? MaxUsages { get; init; }
}
