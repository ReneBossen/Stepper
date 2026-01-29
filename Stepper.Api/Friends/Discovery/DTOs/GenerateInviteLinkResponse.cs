namespace Stepper.Api.Friends.Discovery.DTOs;

/// <summary>
/// Response DTO for invite link generation.
/// </summary>
public class GenerateInviteLinkResponse
{
    /// <summary>
    /// The generated invite code.
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Deep link URL for sharing.
    /// </summary>
    public string DeepLink { get; set; } = string.Empty;

    /// <summary>
    /// Expiration timestamp (UTC), if applicable.
    /// </summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>
    /// Maximum number of usages, if applicable.
    /// </summary>
    public int? MaxUsages { get; set; }
}
