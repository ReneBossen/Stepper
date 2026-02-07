namespace Stepper.Api.Friends.Discovery.DTOs;

/// <summary>
/// Request DTO for generating an invite link.
/// </summary>
public record GenerateInviteLinkRequest
{
    /// <summary>
    /// Optional expiration time in hours. If null, the link never expires.
    /// </summary>
    public int? ExpirationHours { get; init; }

    /// <summary>
    /// Optional maximum number of usages. If null, unlimited usages.
    /// </summary>
    public int? MaxUsages { get; init; }
}
