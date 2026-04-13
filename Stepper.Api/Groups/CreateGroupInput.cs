namespace Stepper.Api.Groups;

/// <summary>
/// Input for creating a new group via <see cref="IGroupRepository.CreateGroupWithOwnerAsync"/>.
/// Only carries the fields the caller supplies; Id, CreatedById, and CreatedAt
/// are assigned server-side by the create_group_with_owner RPC (auth.uid() and NOW()).
/// </summary>
public sealed record CreateGroupInput(
    string Name,
    string? Description,
    bool IsPublic,
    CompetitionPeriodType PeriodType,
    int MaxMembers,
    string JoinCode);
