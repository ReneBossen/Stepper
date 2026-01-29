namespace Stepper.Api.Groups;

/// <summary>
/// Type of competition period for group leaderboards.
/// </summary>
public enum CompetitionPeriodType
{
    /// <summary>
    /// Daily competition period (resets each day).
    /// </summary>
    Daily,

    /// <summary>
    /// Weekly competition period (resets each week).
    /// </summary>
    Weekly,

    /// <summary>
    /// Monthly competition period (resets each month).
    /// </summary>
    Monthly,

    /// <summary>
    /// Custom competition period (defined by group settings).
    /// </summary>
    Custom
}
