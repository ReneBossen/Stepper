using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Stepper.Api.Groups;

/// <summary>
/// Entity model for Supabase groups table mapping.
/// </summary>
[Table("groups")]
public class GroupEntity : BaseModel
{
    [PrimaryKey("id")]
    public Guid Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("created_by_id")]
    public Guid CreatedById { get; set; }

    [Column("is_public")]
    public bool IsPublic { get; set; }

    [Column("period_type")]
    public string PeriodType { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("max_members")]
    public int MaxMembers { get; set; } = 5;

    /// <summary>
    /// Converts the entity to a domain Group model.
    /// </summary>
    public Group ToGroup(int memberCount = 0)
    {
        return new Group
        {
            Id = Id,
            Name = Name,
            Description = Description,
            CreatedById = CreatedById,
            IsPublic = IsPublic,
            PeriodType = ParsePeriodType(PeriodType),
            CreatedAt = CreatedAt,
            MemberCount = memberCount,
            MaxMembers = MaxMembers
        };
    }

    /// <summary>
    /// Creates an entity from a domain Group model.
    /// </summary>
    public static GroupEntity FromGroup(Group group)
    {
        return new GroupEntity
        {
            Id = group.Id,
            Name = group.Name,
            Description = group.Description,
            CreatedById = group.CreatedById,
            IsPublic = group.IsPublic,
            PeriodType = group.PeriodType.ToString().ToLowerInvariant(),
            CreatedAt = group.CreatedAt,
            MaxMembers = group.MaxMembers
        };
    }

    private static CompetitionPeriodType ParsePeriodType(string periodType)
    {
        return periodType.ToLowerInvariant() switch
        {
            "daily" => CompetitionPeriodType.Daily,
            "weekly" => CompetitionPeriodType.Weekly,
            "monthly" => CompetitionPeriodType.Monthly,
            "custom" => CompetitionPeriodType.Custom,
            _ => throw new ArgumentException($"Unknown period type: {periodType}")
        };
    }
}
