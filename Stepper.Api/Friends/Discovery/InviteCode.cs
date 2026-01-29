namespace Stepper.Api.Friends.Discovery;

/// <summary>
/// Domain model for an invite code (QR code or shareable link).
/// </summary>
public class InviteCode
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Code { get; set; } = string.Empty;
    public InviteCodeType Type { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int? MaxUsages { get; set; }
    public int UsageCount { get; set; }
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Checks if the invite code is still valid.
    /// </summary>
    public bool IsValid()
    {
        // Check expiration
        if (ExpiresAt.HasValue && ExpiresAt.Value < DateTime.UtcNow)
        {
            return false;
        }

        // Check usage limit
        if (MaxUsages.HasValue && UsageCount >= MaxUsages.Value)
        {
            return false;
        }

        return true;
    }
}
