using FluentAssertions;
using Moq;
using WalkingApp.Api.Steps;
using WalkingApp.Api.Steps.DTOs;

namespace WalkingApp.UnitTests.Steps;

public class StepServiceSyncTests
{
    private readonly Mock<IStepRepository> _mockRepository;
    private readonly StepService _sut;

    public StepServiceSyncTests()
    {
        _mockRepository = new Mock<IStepRepository>();
        _sut = new StepService(_mockRepository.Object);
    }

    #region SyncStepsAsync Tests

    [Fact]
    public async Task SyncStepsAsync_WithValidEntries_CreateNewEntries()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = today, StepCount = 5000, DistanceMeters = 3500, Source = "HealthKit" },
                new() { Date = today.AddDays(-1), StepCount = 8000, DistanceMeters = 5600, Source = "HealthKit" }
            }
        };

        _mockRepository.Setup(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()))
            .ReturnsAsync((StepEntry entry) => (true, entry));

        // Act
        var result = await _sut.SyncStepsAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.Created.Should().Be(2);
        result.Updated.Should().Be(0);
        result.Total.Should().Be(2);
        _mockRepository.Verify(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()), Times.Exactly(2));
    }

    [Fact]
    public async Task SyncStepsAsync_WithValidEntries_UpdatesExistingEntries()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = today, StepCount = 5000, DistanceMeters = 3500, Source = "HealthKit" },
                new() { Date = today.AddDays(-1), StepCount = 8000, DistanceMeters = 5600, Source = "HealthKit" }
            }
        };

        _mockRepository.Setup(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()))
            .ReturnsAsync((StepEntry entry) => (false, entry));

        // Act
        var result = await _sut.SyncStepsAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.Created.Should().Be(0);
        result.Updated.Should().Be(2);
        result.Total.Should().Be(2);
    }

    [Fact]
    public async Task SyncStepsAsync_WithMixedResults_ReturnsMixedCounts()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = today, StepCount = 5000, DistanceMeters = 3500, Source = "HealthKit" },
                new() { Date = today.AddDays(-1), StepCount = 8000, DistanceMeters = 5600, Source = "HealthKit" },
                new() { Date = today.AddDays(-2), StepCount = 10000, DistanceMeters = 7000, Source = "HealthKit" }
            }
        };

        var callCount = 0;
        _mockRepository.Setup(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()))
            .ReturnsAsync((StepEntry entry) =>
            {
                callCount++;
                // First two are new, third is update
                return (callCount <= 2, entry);
            });

        // Act
        var result = await _sut.SyncStepsAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.Created.Should().Be(2);
        result.Updated.Should().Be(1);
        result.Total.Should().Be(3);
    }

    [Fact]
    public async Task SyncStepsAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = DateOnly.FromDateTime(DateTime.UtcNow), StepCount = 5000, Source = "HealthKit" }
            }
        };

        // Act
        var act = async () => await _sut.SyncStepsAsync(Guid.Empty, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()), Times.Never);
    }

    [Fact]
    public async Task SyncStepsAsync_WithNullRequest_ThrowsArgumentNullException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.SyncStepsAsync(userId, null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
        _mockRepository.Verify(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()), Times.Never);
    }

    [Fact]
    public async Task SyncStepsAsync_WithEmptyEntriesList_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>()
        };

        // Act
        var act = async () => await _sut.SyncStepsAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("At least one entry is required.");
        _mockRepository.Verify(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()), Times.Never);
    }

    [Fact]
    public async Task SyncStepsAsync_WithNullEntriesList_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new SyncStepsRequest
        {
            Entries = null!
        };

        // Act
        var act = async () => await _sut.SyncStepsAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("At least one entry is required.");
        _mockRepository.Verify(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()), Times.Never);
    }

    [Fact]
    public async Task SyncStepsAsync_WithMoreThan31Entries_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var entries = Enumerable.Range(0, 32)
            .Select(i => new SyncStepEntry
            {
                Date = today.AddDays(-i),
                StepCount = 5000,
                Source = "HealthKit"
            })
            .ToList();

        var request = new SyncStepsRequest { Entries = entries };

        // Act
        var act = async () => await _sut.SyncStepsAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Maximum 31 entries allowed per sync.");
        _mockRepository.Verify(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()), Times.Never);
    }

    [Fact]
    public async Task SyncStepsAsync_WithFutureDate_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)), StepCount = 5000, Source = "HealthKit" }
            }
        };

        // Act
        var act = async () => await _sut.SyncStepsAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Date cannot be in the future.");
        _mockRepository.Verify(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()), Times.Never);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(200001)]
    public async Task SyncStepsAsync_WithInvalidStepCount_ThrowsArgumentException(int stepCount)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = DateOnly.FromDateTime(DateTime.UtcNow), StepCount = stepCount, Source = "HealthKit" }
            }
        };

        // Act
        var act = async () => await _sut.SyncStepsAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Step count must be between 0 and 200000.");
        _mockRepository.Verify(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()), Times.Never);
    }

    [Fact]
    public async Task SyncStepsAsync_WithNegativeDistance_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = DateOnly.FromDateTime(DateTime.UtcNow), StepCount = 5000, DistanceMeters = -100, Source = "HealthKit" }
            }
        };

        // Act
        var act = async () => await _sut.SyncStepsAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Distance must be a positive value.");
        _mockRepository.Verify(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task SyncStepsAsync_WithEmptySource_ThrowsArgumentException(string? source)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = DateOnly.FromDateTime(DateTime.UtcNow), StepCount = 5000, Source = source! }
            }
        };

        // Act
        var act = async () => await _sut.SyncStepsAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Source is required for each entry.");
        _mockRepository.Verify(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()), Times.Never);
    }

    [Fact]
    public async Task SyncStepsAsync_WithSourceExceeding100Chars_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var longSource = new string('A', 101);
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = DateOnly.FromDateTime(DateTime.UtcNow), StepCount = 5000, Source = longSource }
            }
        };

        // Act
        var act = async () => await _sut.SyncStepsAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Source cannot exceed 100 characters.");
        _mockRepository.Verify(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(200000)]
    public async Task SyncStepsAsync_WithBoundaryStepCounts_SucceedsAsync(int stepCount)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = DateOnly.FromDateTime(DateTime.UtcNow), StepCount = stepCount, Source = "HealthKit" }
            }
        };

        _mockRepository.Setup(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()))
            .ReturnsAsync((StepEntry entry) => (true, entry));

        // Act
        var result = await _sut.SyncStepsAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.Total.Should().Be(1);
        _mockRepository.Verify(x => x.UpsertByDateAndSourceAsync(It.Is<StepEntry>(e => e.StepCount == stepCount)), Times.Once);
    }

    [Fact]
    public async Task SyncStepsAsync_WithNullDistance_SucceedsAsync()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = DateOnly.FromDateTime(DateTime.UtcNow), StepCount = 5000, DistanceMeters = null, Source = "HealthKit" }
            }
        };

        _mockRepository.Setup(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()))
            .ReturnsAsync((StepEntry entry) => (true, entry));

        // Act
        var result = await _sut.SyncStepsAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.Total.Should().Be(1);
        _mockRepository.Verify(x => x.UpsertByDateAndSourceAsync(It.Is<StepEntry>(e => e.DistanceMeters == null)), Times.Once);
    }

    [Fact]
    public async Task SyncStepsAsync_With31Entries_Succeeds()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var entries = Enumerable.Range(0, 31)
            .Select(i => new SyncStepEntry
            {
                Date = today.AddDays(-i),
                StepCount = 5000 + i,
                Source = "HealthKit"
            })
            .ToList();

        var request = new SyncStepsRequest { Entries = entries };

        _mockRepository.Setup(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()))
            .ReturnsAsync((StepEntry entry) => (true, entry));

        // Act
        var result = await _sut.SyncStepsAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.Created.Should().Be(31);
        result.Total.Should().Be(31);
        _mockRepository.Verify(x => x.UpsertByDateAndSourceAsync(It.IsAny<StepEntry>()), Times.Exactly(31));
    }

    #endregion

    #region DeleteBySourceAsync Tests

    [Fact]
    public async Task DeleteBySourceAsync_WithValidSource_DeletesEntriesAndReturnsCount()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var source = "HealthKit";

        _mockRepository.Setup(x => x.DeleteBySourceAsync(userId, source))
            .ReturnsAsync(5);

        // Act
        var result = await _sut.DeleteBySourceAsync(userId, source);

        // Assert
        result.Should().NotBeNull();
        result.DeletedCount.Should().Be(5);
        _mockRepository.Verify(x => x.DeleteBySourceAsync(userId, source), Times.Once);
    }

    [Fact]
    public async Task DeleteBySourceAsync_WithNoMatchingEntries_ReturnsZeroCount()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var source = "NonExistentSource";

        _mockRepository.Setup(x => x.DeleteBySourceAsync(userId, source))
            .ReturnsAsync(0);

        // Act
        var result = await _sut.DeleteBySourceAsync(userId, source);

        // Assert
        result.Should().NotBeNull();
        result.DeletedCount.Should().Be(0);
        _mockRepository.Verify(x => x.DeleteBySourceAsync(userId, source), Times.Once);
    }

    [Fact]
    public async Task DeleteBySourceAsync_WithEmptyUserId_ThrowsArgumentException()
    {
        // Arrange
        var source = "HealthKit";

        // Act
        var act = async () => await _sut.DeleteBySourceAsync(Guid.Empty, source);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.DeleteBySourceAsync(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task DeleteBySourceAsync_WithEmptySource_ThrowsArgumentException(string? source)
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.DeleteBySourceAsync(userId, source!);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Source cannot be empty.*");
        _mockRepository.Verify(x => x.DeleteBySourceAsync(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task DeleteBySourceAsync_WithSpecialCharactersInSource_SucceedsAsync()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var source = "Apple Health/HealthKit-v2.0";

        _mockRepository.Setup(x => x.DeleteBySourceAsync(userId, source))
            .ReturnsAsync(3);

        // Act
        var result = await _sut.DeleteBySourceAsync(userId, source);

        // Assert
        result.Should().NotBeNull();
        result.DeletedCount.Should().Be(3);
        _mockRepository.Verify(x => x.DeleteBySourceAsync(userId, source), Times.Once);
    }

    #endregion
}
