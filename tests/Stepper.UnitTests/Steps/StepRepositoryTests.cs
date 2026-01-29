using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using Stepper.Api.Common.Database;
using Stepper.Api.Common.Models;
using Stepper.Api.Steps;
using Stepper.Api.Steps.DTOs;

namespace Stepper.UnitTests.Steps;

/// <summary>
/// Unit tests for StepRepository focusing on validation and authorization logic.
/// Note: Full data access operations should be tested via integration tests with a test Supabase instance
/// due to the complexity of mocking the Supabase client.
/// </summary>
public class StepRepositoryTests
{
    private readonly Mock<ISupabaseClientFactory> _mockClientFactory;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly Mock<HttpContext> _mockHttpContext;

    public StepRepositoryTests()
    {
        _mockClientFactory = new Mock<ISupabaseClientFactory>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _mockHttpContext = new Mock<HttpContext>();
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullClientFactory_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new StepRepository(null!, _mockHttpContextAccessor.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullHttpContextAccessor_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new StepRepository(_mockClientFactory.Object, null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithValidParameters_CreatesInstance()
    {
        // Arrange & Act
        var repository = new StepRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Assert
        repository.Should().NotBeNull();
        repository.Should().BeAssignableTo<IStepRepository>();
    }

    #endregion

    #region Authentication Token Tests - RecordStepsAsync

    [Fact]
    public async Task RecordStepsAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var entry = CreateTestStepEntry();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new StepRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.RecordStepsAsync(entry);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task RecordStepsAsync_WithEmptyToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var entry = CreateTestStepEntry();
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", "" }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new StepRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.RecordStepsAsync(entry);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task RecordStepsAsync_WithNullToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var entry = CreateTestStepEntry();
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", null }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new StepRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.RecordStepsAsync(entry);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task RecordStepsAsync_WithNullHttpContext_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var entry = CreateTestStepEntry();
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns((HttpContext?)null);
        var sut = new StepRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.RecordStepsAsync(entry);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task RecordStepsAsync_WithNullEntry_ThrowsArgumentNullException()
    {
        // Arrange
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", "test-token" }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new StepRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.RecordStepsAsync(null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    #endregion

    #region Authentication Token Tests - GetByIdAsync

    [Fact]
    public async Task GetByIdAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var entryId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new StepRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetByIdAsync(entryId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetByIdAsync_WithEmptyToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var entryId = Guid.NewGuid();
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", "" }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new StepRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetByIdAsync(entryId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetByIdAsync_WithNullHttpContext_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var entryId = Guid.NewGuid();
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns((HttpContext?)null);
        var sut = new StepRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetByIdAsync(entryId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - GetByDateAsync

    [Fact]
    public async Task GetByDateAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var date = DateOnly.FromDateTime(DateTime.UtcNow);
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new StepRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetByDateAsync(userId, date);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - GetByDateRangeAsync

    [Fact]
    public async Task GetByDateRangeAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var range = new DateRange
        {
            StartDate = new DateOnly(2026, 1, 1),
            EndDate = new DateOnly(2026, 1, 7)
        };
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new StepRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetByDateRangeAsync(userId, range, 1, 50);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - GetDailySummariesAsync

    [Fact]
    public async Task GetDailySummariesAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var range = new DateRange
        {
            StartDate = new DateOnly(2026, 1, 1),
            EndDate = new DateOnly(2026, 1, 7)
        };
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new StepRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetDailySummariesAsync(userId, range);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - DeleteAsync

    [Fact]
    public async Task DeleteAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var entryId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new StepRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.DeleteAsync(entryId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_WithEmptyToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var entryId = Guid.NewGuid();
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", "" }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new StepRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.DeleteAsync(entryId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_WithNullHttpContext_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var entryId = Guid.NewGuid();
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns((HttpContext?)null);
        var sut = new StepRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.DeleteAsync(entryId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Helper Methods

    private static StepEntry CreateTestStepEntry()
    {
        return new StepEntry
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            StepCount = 5000,
            DistanceMeters = 3500.5,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            RecordedAt = DateTime.UtcNow,
            Source = "Test"
        };
    }

    #endregion
}
