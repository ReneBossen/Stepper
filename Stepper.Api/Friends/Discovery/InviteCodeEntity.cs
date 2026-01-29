using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Stepper.Api.Friends.Discovery;

/// <summary>
/// Entity model for Supabase invite_codes table.
/// </summary>
[Table("invite_codes")]
internal class InviteCodeEntity : BaseModel
{
    [PrimaryKey("id", false)]
    public Guid Id { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("code")]
    public string Code { get; set; } = string.Empty;

    [Column("type")]
    public string Type { get; set; } = string.Empty;

    [Column("expires_at")]
    public DateTime? ExpiresAt { get; set; }

    [Column("max_usages")]
    public int? MaxUsages { get; set; }

    [Column("usage_count")]
    public int UsageCount { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    public InviteCode ToInviteCode()
    {
        return new InviteCode
        {
            Id = Id,
            UserId = UserId,
            Code = Code,
            Type = Type == "qr_code" ? InviteCodeType.QrCode : InviteCodeType.ShareLink,
            ExpiresAt = ExpiresAt,
            MaxUsages = MaxUsages,
            UsageCount = UsageCount,
            CreatedAt = CreatedAt
        };
    }

    public static InviteCodeEntity FromInviteCode(InviteCode inviteCode)
    {
        return new InviteCodeEntity
        {
            Id = inviteCode.Id,
            UserId = inviteCode.UserId,
            Code = inviteCode.Code,
            Type = inviteCode.Type == InviteCodeType.QrCode ? "qr_code" : "share_link",
            ExpiresAt = inviteCode.ExpiresAt,
            MaxUsages = inviteCode.MaxUsages,
            UsageCount = inviteCode.UsageCount,
            CreatedAt = inviteCode.CreatedAt
        };
    }
}
