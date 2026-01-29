namespace Stepper.Api.Friends.Discovery.DTOs;

/// <summary>
/// Request DTO for generating an invite link.
/// </summary>
public class GenerateInviteLinkRequest
{
    /// <summary>
    /// Optional expiration time in hours. If null, the link never expires.
    /// </summary>
    public int? ExpirationHours { get; set; }

    /// <summary>
    /// Optional maximum number of usages. If null, unlimited usages.
    /// </summary>
    public int? MaxUsages { get; set; }
}
