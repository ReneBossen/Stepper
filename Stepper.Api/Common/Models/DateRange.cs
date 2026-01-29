namespace Stepper.Api.Common.Models;

/// <summary>
/// Value object representing a date range for queries.
/// Shared across features for consistent date range handling.
/// </summary>
public class DateRange
{
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
}
