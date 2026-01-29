using System.Text.Json.Serialization;

namespace Stepper.Api.Groups.DTOs;

/// <summary>
/// Response DTO for a group member.
/// </summary>
public class GroupMemberResponse
{
    /// <summary>
    /// ID of the user.
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Display name of the user.
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Avatar URL of the user.
    /// </summary>
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// Role of the user in the group.
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public MemberRole Role { get; set; }

    /// <summary>
    /// When the user joined the group.
    /// </summary>
    public DateTime JoinedAt { get; set; }
}
