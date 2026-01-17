using FluentAssertions;
using Moq;
using WalkingApp.Api.Common.Models;
using WalkingApp.Api.Steps;
using WalkingApp.Api.Steps.DTOs;

namespace WalkingApp.UnitTests.Steps;

public class StepServiceTests
{
    private readonly Mock<IStepRepository> _mockRepository;
    private readonly StepService _sut;

    public StepServiceTests()
    {
        _mockRepository = new Mock<IStepRepository>();
        _sut = new StepService(_mockRepository.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullRepository_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new StepService(null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region RecordStepsAsync Tests

    [Fact]
    public async Task RecordStepsAsync_WithValidRequest_RecordsAndReturnsEntry()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RecordStepsRequest
        {
            StepCount = 5000,
            DistanceMeters = 3500.5,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Source = "Apple Health"
        };

        var createdEntry = new StepEntry
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StepCount = request.StepCount,
            DistanceMeters = request.DistanceMeters,
            Date = request.Date,
            RecordedAt = DateTime.UtcNow,
            Source = request.Source
        };

        _mockRepository.Setup(x => x.RecordStepsAsync(It.IsAny<StepEntry>()))
            .ReturnsAsync(createdEntry);

        // Act
        var result = await _sut.RecordStepsAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(createdEntry.Id);
        result.StepCount.Should().Be(request.StepCount);
        result.DistanceMeters.Should().Be(request.DistanceMeters);
        result.Date.Should().Be(request.Date);
        result.Source.Should().Be(request.Source);
        _mockRepository.Verify(x => x.RecordStepsAsync(It.Is<StepEntry>(e =>
            e.UserId == userId &&
            e.StepCount == request.StepCount &&
            e.DistanceMeters == request.DistanceMeters &&
            e.Date == request.Date &&
            e.Source == request.Source
        )), Times.Once);
    }

    [Fact]
    public async Task RecordStepsAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var request = new RecordStepsRequest
        {
            StepCount = 5000,
            Date = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        // Act
        var act = async () => await _sut.RecordStepsAsync(Guid.Empty, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.RecordStepsAsync(It.IsAny<StepEntry>()), Times.Never);
    }

    [Fact]
    public async Task RecordStepsAsync_WithNullRequest_ThrowsArgumentNullException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.RecordStepsAsync(userId, null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
        _mockRepository.Verify(x => x.RecordStepsAsync(It.IsAny<StepEntry>()), Times.Never);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(200001)]
    public async Task RecordStepsAsync_WithInvalidStepCount_ThrowsArgumentException(int stepCount)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RecordStepsRequest
        {
            StepCount = stepCount,
            Date = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        // Act
        var act = async () => await _sut.RecordStepsAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Step count must be between 0 and 200000.");
        _mockRepository.Verify(x => x.RecordStepsAsync(It.IsAny<StepEntry>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(200000)]
    public async Task RecordStepsAsync_WithBoundaryStepCounts_RecordsSuccessfully(int stepCount)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RecordStepsRequest
        {
            StepCount = stepCount,
            Date = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        var createdEntry = new StepEntry
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StepCount = stepCount,
            Date = request.Date,
            RecordedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(x => x.RecordStepsAsync(It.IsAny<StepEntry>()))
            .ReturnsAsync(createdEntry);

        // Act
        var result = await _sut.RecordStepsAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.StepCount.Should().Be(stepCount);
        _mockRepository.Verify(x => x.RecordStepsAsync(It.IsAny<StepEntry>()), Times.Once);
    }

    [Fact]
    public async Task RecordStepsAsync_WithNegativeDistance_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RecordStepsRequest
        {
            StepCount = 5000,
            DistanceMeters = -100,
            Date = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        // Act
        var act = async () => await _sut.RecordStepsAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Distance must be a positive value.");
        _mockRepository.Verify(x => x.RecordStepsAsync(It.IsAny<StepEntry>()), Times.Never);
    }

    [Fact]
    public async Task RecordStepsAsync_WithFutureDate_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RecordStepsRequest
        {
            StepCount = 5000,
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1))
        };

        // Act
        var act = async () => await _sut.RecordStepsAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Date cannot be in the future.");
        _mockRepository.Verify(x => x.RecordStepsAsync(It.IsAny<StepEntry>()), Times.Never);
    }

    [Fact]
    public async Task RecordStepsAsync_WithNullDistance_RecordsSuccessfully()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RecordStepsRequest
        {
            StepCount = 5000,
            DistanceMeters = null,
            Date = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        var createdEntry = new StepEntry
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StepCount = request.StepCount,
            DistanceMeters = null,
            Date = request.Date,
            RecordedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(x => x.RecordStepsAsync(It.IsAny<StepEntry>()))
            .ReturnsAsync(createdEntry);

        // Act
        var result = await _sut.RecordStepsAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.DistanceMeters.Should().BeNull();
        _mockRepository.Verify(x => x.RecordStepsAsync(It.IsAny<StepEntry>()), Times.Once);
    }

    [Fact]
    public async Task RecordStepsAsync_WithNullSource_RecordsSuccessfully()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RecordStepsRequest
        {
            StepCount = 5000,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Source = null
        };

        var createdEntry = new StepEntry
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StepCount = request.StepCount,
            Date = request.Date,
            RecordedAt = DateTime.UtcNow,
            Source = null
        };

        _mockRepository.Setup(x => x.RecordStepsAsync(It.IsAny<StepEntry>()))
            .ReturnsAsync(createdEntry);

        // Act
        var result = await _sut.RecordStepsAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.Source.Should().BeNull();
        _mockRepository.Verify(x => x.RecordStepsAsync(It.IsAny<StepEntry>()), Times.Once);
    }

    #endregion

    #region GetTodayAsync Tests

    [Fact]
    public async Task GetTodayAsync_WithStepsToday_ReturnsSummary()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var summary = new DailyStepSummary
        {
            Date = today,
            TotalSteps = 8000,
            TotalDistanceMeters = 5600.0,
            EntryCount = 3
        };

        _mockRepository.Setup(x => x.GetDailySummariesAsync(userId, It.Is<DateRange>(r =>
            r.StartDate == today && r.EndDate == today)))
            .ReturnsAsync(new List<DailyStepSummary> { summary });

        // Act
        var result = await _sut.GetTodayAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Date.Should().Be(today);
        result.TotalSteps.Should().Be(8000);
        result.TotalDistanceMeters.Should().Be(5600.0);
    }

    [Fact]
    public async Task GetTodayAsync_WithNoStepsToday_ReturnsZeroValues()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        _mockRepository.Setup(x => x.GetDailySummariesAsync(userId, It.IsAny<DateRange>()))
            .ReturnsAsync(new List<DailyStepSummary>());

        // Act
        var result = await _sut.GetTodayAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Date.Should().Be(today);
        result.TotalSteps.Should().Be(0);
        result.TotalDistanceMeters.Should().Be(0);
    }

    [Fact]
    public async Task GetTodayAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.GetTodayAsync(Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetDailySummariesAsync(It.IsAny<Guid>(), It.IsAny<DateRange>()), Times.Never);
    }

    #endregion

    #region GetDailyHistoryAsync Tests

    [Fact]
    public async Task GetDailyHistoryAsync_WithValidRange_ReturnsHistory()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var range = new DateRange
        {
            StartDate = new DateOnly(2026, 1, 1),
            EndDate = new DateOnly(2026, 1, 7)
        };

        var summaries = new List<DailyStepSummary>
        {
            new() { Date = new DateOnly(2026, 1, 7), TotalSteps = 10000, TotalDistanceMeters = 7000 },
            new() { Date = new DateOnly(2026, 1, 6), TotalSteps = 8000, TotalDistanceMeters = 5600 }
        };

        _mockRepository.Setup(x => x.GetDailySummariesAsync(userId, range))
            .ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetDailyHistoryAsync(userId, range);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result[0].TotalSteps.Should().Be(10000);
        result[1].TotalSteps.Should().Be(8000);
    }

    [Fact]
    public async Task GetDailyHistoryAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var range = new DateRange
        {
            StartDate = new DateOnly(2026, 1, 1),
            EndDate = new DateOnly(2026, 1, 7)
        };

        // Act
        var act = async () => await _sut.GetDailyHistoryAsync(Guid.Empty, range);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetDailySummariesAsync(It.IsAny<Guid>(), It.IsAny<DateRange>()), Times.Never);
    }

    [Fact]
    public async Task GetDailyHistoryAsync_WithNullRange_ThrowsArgumentNullException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.GetDailyHistoryAsync(userId, null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
        _mockRepository.Verify(x => x.GetDailySummariesAsync(It.IsAny<Guid>(), It.IsAny<DateRange>()), Times.Never);
    }

    [Fact]
    public async Task GetDailyHistoryAsync_WithStartDateAfterEndDate_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var range = new DateRange
        {
            StartDate = new DateOnly(2026, 1, 7),
            EndDate = new DateOnly(2026, 1, 1)
        };

        // Act
        var act = async () => await _sut.GetDailyHistoryAsync(userId, range);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Start date must be before or equal to end date.");
        _mockRepository.Verify(x => x.GetDailySummariesAsync(It.IsAny<Guid>(), It.IsAny<DateRange>()), Times.Never);
    }

    [Fact]
    public async Task GetDailyHistoryAsync_WithEmptyResult_ReturnsEmptyList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var range = new DateRange
        {
            StartDate = new DateOnly(2026, 1, 1),
            EndDate = new DateOnly(2026, 1, 7)
        };

        _mockRepository.Setup(x => x.GetDailySummariesAsync(userId, range))
            .ReturnsAsync(new List<DailyStepSummary>());

        // Act
        var result = await _sut.GetDailyHistoryAsync(userId, range);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }

    #endregion

    #region GetDetailedHistoryAsync Tests

    [Fact]
    public async Task GetDetailedHistoryAsync_WithValidParameters_ReturnsPaginatedHistory()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var range = new DateRange
        {
            StartDate = new DateOnly(2026, 1, 1),
            EndDate = new DateOnly(2026, 1, 7)
        };
        var page = 1;
        var pageSize = 50;

        var entries = new List<StepEntry>
        {
            new() { Id = Guid.NewGuid(), UserId = userId, StepCount = 5000, Date = new DateOnly(2026, 1, 7) },
            new() { Id = Guid.NewGuid(), UserId = userId, StepCount = 3000, Date = new DateOnly(2026, 1, 6) }
        };

        _mockRepository.Setup(x => x.GetByDateRangeAsync(userId, range, page, pageSize))
            .ReturnsAsync((entries, 2));

        // Act
        var result = await _sut.GetDetailedHistoryAsync(userId, range, page, pageSize);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(2);
        result.Page.Should().Be(1);
        result.PageSize.Should().Be(50);
    }

    [Fact]
    public async Task GetDetailedHistoryAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var range = new DateRange
        {
            StartDate = new DateOnly(2026, 1, 1),
            EndDate = new DateOnly(2026, 1, 7)
        };

        // Act
        var act = async () => await _sut.GetDetailedHistoryAsync(Guid.Empty, range, 1, 50);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetByDateRangeAsync(It.IsAny<Guid>(), It.IsAny<DateRange>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task GetDetailedHistoryAsync_WithNullRange_ThrowsArgumentNullException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.GetDetailedHistoryAsync(userId, null!, 1, 50);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
        _mockRepository.Verify(x => x.GetByDateRangeAsync(It.IsAny<Guid>(), It.IsAny<DateRange>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task GetDetailedHistoryAsync_WithInvalidDateRange_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var range = new DateRange
        {
            StartDate = new DateOnly(2026, 1, 7),
            EndDate = new DateOnly(2026, 1, 1)
        };

        // Act
        var act = async () => await _sut.GetDetailedHistoryAsync(userId, range, 1, 50);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Start date must be before or equal to end date.");
        _mockRepository.Verify(x => x.GetByDateRangeAsync(It.IsAny<Guid>(), It.IsAny<DateRange>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-10)]
    public async Task GetDetailedHistoryAsync_WithPageLessThanOne_ThrowsArgumentException(int page)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var range = new DateRange
        {
            StartDate = new DateOnly(2026, 1, 1),
            EndDate = new DateOnly(2026, 1, 7)
        };

        // Act
        var act = async () => await _sut.GetDetailedHistoryAsync(userId, range, page, 50);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Page number must be greater than 0.*");
        _mockRepository.Verify(x => x.GetByDateRangeAsync(It.IsAny<Guid>(), It.IsAny<DateRange>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task GetDetailedHistoryAsync_WithPageSizeLessThanOne_UsesDefaultPageSize(int pageSize)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var range = new DateRange
        {
            StartDate = new DateOnly(2026, 1, 1),
            EndDate = new DateOnly(2026, 1, 7)
        };

        _mockRepository.Setup(x => x.GetByDateRangeAsync(userId, range, 1, 50))
            .ReturnsAsync((new List<StepEntry>(), 0));

        // Act
        var result = await _sut.GetDetailedHistoryAsync(userId, range, 1, pageSize);

        // Assert
        result.Should().NotBeNull();
        result.PageSize.Should().Be(50); // Default page size
        _mockRepository.Verify(x => x.GetByDateRangeAsync(userId, range, 1, 50), Times.Once);
    }

    [Fact]
    public async Task GetDetailedHistoryAsync_WithPageSizeGreaterThanMax_UsesMaxPageSize()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var range = new DateRange
        {
            StartDate = new DateOnly(2026, 1, 1),
            EndDate = new DateOnly(2026, 1, 7)
        };

        _mockRepository.Setup(x => x.GetByDateRangeAsync(userId, range, 1, 100))
            .ReturnsAsync((new List<StepEntry>(), 0));

        // Act
        var result = await _sut.GetDetailedHistoryAsync(userId, range, 1, 150);

        // Assert
        result.Should().NotBeNull();
        result.PageSize.Should().Be(100); // Max page size
        _mockRepository.Verify(x => x.GetByDateRangeAsync(userId, range, 1, 100), Times.Once);
    }

    #endregion

    #region GetEntryAsync Tests

    [Fact]
    public async Task GetEntryAsync_WithValidIds_ReturnsEntry()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entryId = Guid.NewGuid();
        var entry = new StepEntry
        {
            Id = entryId,
            UserId = userId,
            StepCount = 5000,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            RecordedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(x => x.GetByIdAsync(entryId))
            .ReturnsAsync(entry);

        // Act
        var result = await _sut.GetEntryAsync(userId, entryId);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(entryId);
        result.StepCount.Should().Be(5000);
        _mockRepository.Verify(x => x.GetByIdAsync(entryId), Times.Once);
    }

    [Fact]
    public async Task GetEntryAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var entryId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.GetEntryAsync(Guid.Empty, entryId);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetEntryAsync_WithEmptyEntryId_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.GetEntryAsync(userId, Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Entry ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetEntryAsync_WithNonExistentEntry_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entryId = Guid.NewGuid();

        _mockRepository.Setup(x => x.GetByIdAsync(entryId))
            .ReturnsAsync((StepEntry?)null);

        // Act
        var act = async () => await _sut.GetEntryAsync(userId, entryId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"Step entry not found with ID: {entryId}");
        _mockRepository.Verify(x => x.GetByIdAsync(entryId), Times.Once);
    }

    [Fact]
    public async Task GetEntryAsync_WithMismatchedUserId_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var entryId = Guid.NewGuid();
        var entry = new StepEntry
        {
            Id = entryId,
            UserId = otherUserId,
            StepCount = 5000,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            RecordedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(x => x.GetByIdAsync(entryId))
            .ReturnsAsync(entry);

        // Act
        var act = async () => await _sut.GetEntryAsync(userId, entryId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("You do not have permission to access this step entry.");
        _mockRepository.Verify(x => x.GetByIdAsync(entryId), Times.Once);
    }

    #endregion

    #region DeleteEntryAsync Tests

    [Fact]
    public async Task DeleteEntryAsync_WithValidIds_DeletesAndReturnsTrue()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entryId = Guid.NewGuid();
        var entry = new StepEntry
        {
            Id = entryId,
            UserId = userId,
            StepCount = 5000,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            RecordedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(x => x.GetByIdAsync(entryId))
            .ReturnsAsync(entry);
        _mockRepository.Setup(x => x.DeleteAsync(entryId))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.DeleteEntryAsync(userId, entryId);

        // Assert
        result.Should().BeTrue();
        _mockRepository.Verify(x => x.GetByIdAsync(entryId), Times.Once);
        _mockRepository.Verify(x => x.DeleteAsync(entryId), Times.Once);
    }

    [Fact]
    public async Task DeleteEntryAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var entryId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.DeleteEntryAsync(Guid.Empty, entryId);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
        _mockRepository.Verify(x => x.DeleteAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task DeleteEntryAsync_WithEmptyEntryId_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.DeleteEntryAsync(userId, Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Entry ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
        _mockRepository.Verify(x => x.DeleteAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task DeleteEntryAsync_WithNonExistentEntry_ReturnsFalse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entryId = Guid.NewGuid();

        _mockRepository.Setup(x => x.GetByIdAsync(entryId))
            .ReturnsAsync((StepEntry?)null);

        // Act
        var result = await _sut.DeleteEntryAsync(userId, entryId);

        // Assert
        result.Should().BeFalse();
        _mockRepository.Verify(x => x.GetByIdAsync(entryId), Times.Once);
        _mockRepository.Verify(x => x.DeleteAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task DeleteEntryAsync_WithMismatchedUserId_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var entryId = Guid.NewGuid();
        var entry = new StepEntry
        {
            Id = entryId,
            UserId = otherUserId,
            StepCount = 5000,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            RecordedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(x => x.GetByIdAsync(entryId))
            .ReturnsAsync(entry);

        // Act
        var act = async () => await _sut.DeleteEntryAsync(userId, entryId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("You do not have permission to delete this step entry.");
        _mockRepository.Verify(x => x.GetByIdAsync(entryId), Times.Once);
        _mockRepository.Verify(x => x.DeleteAsync(It.IsAny<Guid>()), Times.Never);
    }

    #endregion
}
