using System.ComponentModel.DataAnnotations;

namespace Stepper.Api.Friends.Discovery.DTOs;

/// <summary>
/// Request DTO for redeeming an invite code.
/// </summary>
public record RedeemInviteCodeRequest
{
    /// <summary>
    /// The invite code to redeem (can be from QR code or share link).
    /// </summary>
    [Required]
    [MinLength(1)]
    public string Code { get; init; } = string.Empty;
}
