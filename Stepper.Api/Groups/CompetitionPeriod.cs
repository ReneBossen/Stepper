namespace Stepper.Api.Groups;

/// <summary>
/// Domain model representing a competition time period for group leaderboards.
/// </summary>
public class CompetitionPeriod
{
    /// <summary>
    /// Gets or sets the start date of the competition period.
    /// </summary>
    public DateOnly StartDate { get; init; }

    /// <summary>
    /// Gets or sets the end date of the competition period.
    /// </summary>
    public DateOnly EndDate { get; init; }

    /// <summary>
    /// Gets or sets the type of competition period.
    /// </summary>
    public CompetitionPeriodType PeriodType { get; init; }

    /// <summary>
    /// Creates a new competition period.
    /// </summary>
    /// <param name="startDate">The start date of the period.</param>
    /// <param name="endDate">The end date of the period.</param>
    /// <param name="periodType">The type of competition period.</param>
    public CompetitionPeriod(DateOnly startDate, DateOnly endDate, CompetitionPeriodType periodType)
    {
        if (endDate < startDate)
        {
            throw new ArgumentException("End date must be greater than or equal to start date.", nameof(endDate));
        }

        StartDate = startDate;
        EndDate = endDate;
        PeriodType = periodType;
    }
}
