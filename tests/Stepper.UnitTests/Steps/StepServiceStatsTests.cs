using FluentAssertions;
using Moq;
using Stepper.Api.Steps;

namespace Stepper.UnitTests.Steps;

/// <summary>
/// Unit tests for StepService.GetStatsAsync method.
/// Tests cover today's steps, weekly/monthly aggregation, and streak calculations.
/// </summary>
public class StepServiceStatsTests
{
    private readonly Mock<IStepRepository> _mockRepository;
    private readonly StepService _sut;

    public StepServiceStatsTests()
    {
        _mockRepository = new Mock<IStepRepository>();
        _sut = new StepService(_mockRepository.Object);
    }

    #region Validation Tests

    [Fact]
    public async Task GetStatsAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.GetStatsAsync(Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetDailyGoalAsync(It.IsAny<Guid>()), Times.Never);
        _mockRepository.Verify(x => x.GetAllDailySummariesAsync(It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region Today's Steps Tests

    [Fact]
    public async Task GetStatsAsync_WithStepsToday_ReturnsTodayStats()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var summaries = new List<DailyStepSummary>
        {
            new() { Date = today, TotalSteps = 8500, TotalDistanceMeters = 6800.5 }
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.TodaySteps.Should().Be(8500);
        result.TodayDistance.Should().Be(6800.5);
    }

    [Fact]
    public async Task GetStatsAsync_WithNoStepsToday_ReturnsZeroTodayStats()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var yesterday = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));
        var summaries = new List<DailyStepSummary>
        {
            new() { Date = yesterday, TotalSteps = 10000, TotalDistanceMeters = 8000.0 }
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.TodaySteps.Should().Be(0);
        result.TodayDistance.Should().Be(0);
    }

    [Fact]
    public async Task GetStatsAsync_WithEmptySummaries_ReturnsZeroTodayStats()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(new List<DailyStepSummary>());

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.TodaySteps.Should().Be(0);
        result.TodayDistance.Should().Be(0);
    }

    #endregion

    #region Weekly Aggregation Tests (Monday-Sunday)

    [Fact]
    public async Task GetStatsAsync_WithStepsThisWeek_ReturnsWeeklyTotals()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Calculate Monday of current week
        var dayOfWeek = today.DayOfWeek;
        var daysFromMonday = dayOfWeek == DayOfWeek.Sunday ? 6 : (int)dayOfWeek - 1;
        var monday = today.AddDays(-daysFromMonday);

        var summaries = new List<DailyStepSummary>
        {
            new() { Date = monday, TotalSteps = 8000, TotalDistanceMeters = 6400.0 },
            new() { Date = monday.AddDays(1), TotalSteps = 9000, TotalDistanceMeters = 7200.0 },
            new() { Date = monday.AddDays(2), TotalSteps = 7500, TotalDistanceMeters = 6000.0 }
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.WeekSteps.Should().Be(24500); // 8000 + 9000 + 7500
        result.WeekDistance.Should().Be(19600.0); // 6400 + 7200 + 6000
    }

    [Fact]
    public async Task GetStatsAsync_WithStepsFromPreviousWeek_ExcludesPreviousWeekFromWeekStats()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Calculate Monday of current week
        var dayOfWeek = today.DayOfWeek;
        var daysFromMonday = dayOfWeek == DayOfWeek.Sunday ? 6 : (int)dayOfWeek - 1;
        var monday = today.AddDays(-daysFromMonday);
        var lastWeek = monday.AddDays(-7);

        var summaries = new List<DailyStepSummary>
        {
            new() { Date = monday, TotalSteps = 8000, TotalDistanceMeters = 6400.0 },
            new() { Date = lastWeek, TotalSteps = 12000, TotalDistanceMeters = 9600.0 } // Previous week - should be excluded
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.WeekSteps.Should().Be(8000); // Only current week's steps
        result.WeekDistance.Should().Be(6400.0);
    }

    [Fact]
    public async Task GetStatsAsync_WithNoStepsThisWeek_ReturnsZeroWeekStats()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Calculate Monday of current week
        var dayOfWeek = today.DayOfWeek;
        var daysFromMonday = dayOfWeek == DayOfWeek.Sunday ? 6 : (int)dayOfWeek - 1;
        var monday = today.AddDays(-daysFromMonday);
        var lastWeek = monday.AddDays(-7);

        var summaries = new List<DailyStepSummary>
        {
            new() { Date = lastWeek, TotalSteps = 12000, TotalDistanceMeters = 9600.0 } // Only previous week data
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.WeekSteps.Should().Be(0);
        result.WeekDistance.Should().Be(0);
    }

    #endregion

    #region Monthly Aggregation Tests

    [Fact]
    public async Task GetStatsAsync_WithStepsThisMonth_ReturnsMonthlyTotals()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthStart = new DateOnly(today.Year, today.Month, 1);

        var summaries = new List<DailyStepSummary>
        {
            new() { Date = monthStart, TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = monthStart.AddDays(1), TotalSteps = 11000, TotalDistanceMeters = 8800.0 },
            new() { Date = monthStart.AddDays(2), TotalSteps = 9500, TotalDistanceMeters = 7600.0 }
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.MonthSteps.Should().Be(30500); // 10000 + 11000 + 9500
        result.MonthDistance.Should().Be(24400.0); // 8000 + 8800 + 7600
    }

    [Fact]
    public async Task GetStatsAsync_WithStepsFromPreviousMonth_ExcludesPreviousMonthFromMonthStats()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var previousMonth = monthStart.AddMonths(-1);

        var summaries = new List<DailyStepSummary>
        {
            new() { Date = monthStart, TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = previousMonth.AddDays(15), TotalSteps = 15000, TotalDistanceMeters = 12000.0 } // Previous month - should be excluded
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.MonthSteps.Should().Be(10000); // Only current month's steps
        result.MonthDistance.Should().Be(8000.0);
    }

    [Fact]
    public async Task GetStatsAsync_WithNoStepsThisMonth_ReturnsZeroMonthStats()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var previousMonth = monthStart.AddMonths(-1);

        var summaries = new List<DailyStepSummary>
        {
            new() { Date = previousMonth.AddDays(10), TotalSteps = 12000, TotalDistanceMeters = 9600.0 } // Only previous month data
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.MonthSteps.Should().Be(0);
        result.MonthDistance.Should().Be(0);
    }

    #endregion

    #region Current Streak Calculation Tests

    [Fact]
    public async Task GetStatsAsync_WithConsecutiveDaysMeetingGoal_ReturnsCurrentStreak()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var summaries = new List<DailyStepSummary>
        {
            new() { Date = today, TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-1), TotalSteps = 10500, TotalDistanceMeters = 8400.0 },
            new() { Date = today.AddDays(-2), TotalSteps = 11000, TotalDistanceMeters = 8800.0 }
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.CurrentStreak.Should().Be(3);
    }

    [Fact]
    public async Task GetStatsAsync_WithStreakBrokenByMissedGoal_ReturnsStreakUpToBreak()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var summaries = new List<DailyStepSummary>
        {
            new() { Date = today, TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-1), TotalSteps = 5000, TotalDistanceMeters = 4000.0 }, // Below goal - breaks streak
            new() { Date = today.AddDays(-2), TotalSteps = 12000, TotalDistanceMeters = 9600.0 }
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.CurrentStreak.Should().Be(1); // Only today counts
    }

    [Fact]
    public async Task GetStatsAsync_WithStreakStartingFromYesterday_ReturnsCorrectStreak()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var summaries = new List<DailyStepSummary>
        {
            // No entry for today, but streak continues from yesterday
            new() { Date = today.AddDays(-1), TotalSteps = 10500, TotalDistanceMeters = 8400.0 },
            new() { Date = today.AddDays(-2), TotalSteps = 11000, TotalDistanceMeters = 8800.0 }
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.CurrentStreak.Should().Be(2); // Yesterday and day before
    }

    [Fact]
    public async Task GetStatsAsync_WithGapInDates_BreaksStreak()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var summaries = new List<DailyStepSummary>
        {
            new() { Date = today, TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            // Gap - yesterday is missing
            new() { Date = today.AddDays(-3), TotalSteps = 12000, TotalDistanceMeters = 9600.0 }
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.CurrentStreak.Should().Be(1); // Only today counts due to gap
    }

    [Fact]
    public async Task GetStatsAsync_WithNoStepsMeetingGoal_ReturnsZeroCurrentStreak()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var summaries = new List<DailyStepSummary>
        {
            new() { Date = today, TotalSteps = 5000, TotalDistanceMeters = 4000.0 },
            new() { Date = today.AddDays(-1), TotalSteps = 6000, TotalDistanceMeters = 4800.0 }
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.CurrentStreak.Should().Be(0);
    }

    [Fact]
    public async Task GetStatsAsync_WithEmptySummaries_ReturnsZeroStreak()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(new List<DailyStepSummary>());

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.CurrentStreak.Should().Be(0);
        result.LongestStreak.Should().Be(0);
    }

    #endregion

    #region Longest Streak Calculation Tests

    [Fact]
    public async Task GetStatsAsync_WithHistoricalLongestStreak_ReturnsLongestStreak()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var summaries = new List<DailyStepSummary>
        {
            // Current streak: 1 day
            new() { Date = today, TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-1), TotalSteps = 5000, TotalDistanceMeters = 4000.0 }, // Below goal
            // Historical streak: 5 days (longer)
            new() { Date = today.AddDays(-10), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-11), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-12), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-13), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-14), TotalSteps = 10000, TotalDistanceMeters = 8000.0 }
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.CurrentStreak.Should().Be(1);
        result.LongestStreak.Should().Be(5);
    }

    [Fact]
    public async Task GetStatsAsync_WhenCurrentStreakIsLongest_ReturnsCurrentAsLongest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var summaries = new List<DailyStepSummary>
        {
            // Current streak: 5 days
            new() { Date = today, TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-1), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-2), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-3), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-4), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-5), TotalSteps = 5000, TotalDistanceMeters = 4000.0 }, // Below goal
            // Historical streak: 2 days
            new() { Date = today.AddDays(-10), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-11), TotalSteps = 10000, TotalDistanceMeters = 8000.0 }
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.CurrentStreak.Should().Be(5);
        result.LongestStreak.Should().Be(5);
    }

    [Fact]
    public async Task GetStatsAsync_WithMultipleHistoricalStreaks_ReturnsLongestOne()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var summaries = new List<DailyStepSummary>
        {
            // Current streak: 0 (today below goal)
            new() { Date = today, TotalSteps = 5000, TotalDistanceMeters = 4000.0 },
            // Streak 1: 3 days
            new() { Date = today.AddDays(-5), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-6), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-7), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            // Gap
            // Streak 2: 7 days (longest)
            new() { Date = today.AddDays(-15), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-16), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-17), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-18), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-19), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-20), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-21), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            // Gap
            // Streak 3: 2 days
            new() { Date = today.AddDays(-30), TotalSteps = 10000, TotalDistanceMeters = 8000.0 },
            new() { Date = today.AddDays(-31), TotalSteps = 10000, TotalDistanceMeters = 8000.0 }
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.CurrentStreak.Should().Be(0);
        result.LongestStreak.Should().Be(7);
    }

    #endregion

    #region Daily Goal Tests

    [Fact]
    public async Task GetStatsAsync_WithCustomDailyGoal_UsesCustomGoal()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var customGoal = 15000;

        var summaries = new List<DailyStepSummary>
        {
            new() { Date = today, TotalSteps = 15000, TotalDistanceMeters = 12000.0 }
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(customGoal);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.DailyGoal.Should().Be(15000);
        result.CurrentStreak.Should().Be(1); // 15000 meets 15000 goal
    }

    [Fact]
    public async Task GetStatsAsync_WithDefaultDailyGoal_ReturnsDefaultGoal()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var defaultGoal = 10000;

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(defaultGoal);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(new List<DailyStepSummary>());

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.DailyGoal.Should().Be(10000);
    }

    [Fact]
    public async Task GetStatsAsync_WithExactlyGoalSteps_CountsTowardStreak()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var summaries = new List<DailyStepSummary>
        {
            new() { Date = today, TotalSteps = 10000, TotalDistanceMeters = 8000.0 }, // Exactly at goal
            new() { Date = today.AddDays(-1), TotalSteps = 10000, TotalDistanceMeters = 8000.0 }
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.CurrentStreak.Should().Be(2); // Both days count since they equal the goal
    }

    [Fact]
    public async Task GetStatsAsync_WithOneStepBelowGoal_DoesNotCountTowardStreak()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var summaries = new List<DailyStepSummary>
        {
            new() { Date = today, TotalSteps = 9999, TotalDistanceMeters = 7999.2 } // One step below goal
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.CurrentStreak.Should().Be(0);
    }

    #endregion

    #region Complete Stats Response Tests

    [Fact]
    public async Task GetStatsAsync_ReturnsCompleteStatsResponse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Calculate Monday of current week
        var dayOfWeek = today.DayOfWeek;
        var daysFromMonday = dayOfWeek == DayOfWeek.Sunday ? 6 : (int)dayOfWeek - 1;
        var monday = today.AddDays(-daysFromMonday);
        var monthStart = new DateOnly(today.Year, today.Month, 1);

        var summaries = new List<DailyStepSummary>
        {
            new() { Date = today, TotalSteps = 12000, TotalDistanceMeters = 9600.0 },
            new() { Date = today.AddDays(-1), TotalSteps = 11000, TotalDistanceMeters = 8800.0 },
            new() { Date = today.AddDays(-2), TotalSteps = 10000, TotalDistanceMeters = 8000.0 }
        };

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetStatsAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.TodaySteps.Should().BeGreaterThanOrEqualTo(0);
        result.TodayDistance.Should().BeGreaterThanOrEqualTo(0);
        result.WeekSteps.Should().BeGreaterThanOrEqualTo(0);
        result.WeekDistance.Should().BeGreaterThanOrEqualTo(0);
        result.MonthSteps.Should().BeGreaterThanOrEqualTo(0);
        result.MonthDistance.Should().BeGreaterThanOrEqualTo(0);
        result.CurrentStreak.Should().BeGreaterThanOrEqualTo(0);
        result.LongestStreak.Should().BeGreaterThanOrEqualTo(result.CurrentStreak);
        result.DailyGoal.Should().Be(10000);
    }

    [Fact]
    public async Task GetStatsAsync_CallsRepositoryMethods()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _mockRepository.Setup(x => x.GetDailyGoalAsync(userId)).ReturnsAsync(10000);
        _mockRepository.Setup(x => x.GetAllDailySummariesAsync(userId)).ReturnsAsync(new List<DailyStepSummary>());

        // Act
        await _sut.GetStatsAsync(userId);

        // Assert
        _mockRepository.Verify(x => x.GetDailyGoalAsync(userId), Times.Once);
        _mockRepository.Verify(x => x.GetAllDailySummariesAsync(userId), Times.Once);
    }

    #endregion
}
