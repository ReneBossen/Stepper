using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using Stepper.Api.Activity;
using Stepper.Api.Common.Database;

namespace Stepper.UnitTests.Activity;

/// <summary>
/// Unit tests for ActivityRepository focusing on validation and authorization logic.
/// Note: Full data access operations should be tested via integration tests with a test Supabase instance
/// due to the complexity of mocking the Supabase client.
/// </summary>
public class ActivityRepositoryTests
{
    private readonly Mock<ISupabaseClientFactory> _mockClientFactory;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly Mock<HttpContext> _mockHttpContext;

    public ActivityRepositoryTests()
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
        var act = () => new ActivityRepository(null!, _mockHttpContextAccessor.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullHttpContextAccessor_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new ActivityRepository(_mockClientFactory.Object, null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithValidParameters_CreatesInstance()
    {
        // Arrange & Act
        var repository = new ActivityRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Assert
        repository.Should().NotBeNull();
        repository.Should().BeAssignableTo<IActivityRepository>();
    }

    #endregion

    #region Authentication Token Tests - GetFeedAsync

    [Fact]
    public async Task GetFeedAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendIds = new List<Guid> { Guid.NewGuid() };
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new ActivityRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetFeedAsync(userId, friendIds, 10, 0);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetFeedAsync_WithEmptyToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendIds = new List<Guid> { Guid.NewGuid() };
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", "" }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new ActivityRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetFeedAsync(userId, friendIds, 10, 0);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetFeedAsync_WithNullToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendIds = new List<Guid> { Guid.NewGuid() };
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", null }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new ActivityRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetFeedAsync(userId, friendIds, 10, 0);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetFeedAsync_WithNullHttpContext_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendIds = new List<Guid> { Guid.NewGuid() };
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns((HttpContext?)null);
        var sut = new ActivityRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetFeedAsync(userId, friendIds, 10, 0);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - GetFeedCountAsync

    [Fact]
    public async Task GetFeedCountAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendIds = new List<Guid> { Guid.NewGuid() };
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new ActivityRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetFeedCountAsync(userId, friendIds);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetFeedCountAsync_WithEmptyToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendIds = new List<Guid> { Guid.NewGuid() };
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", "" }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new ActivityRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetFeedCountAsync(userId, friendIds);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetFeedCountAsync_WithNullHttpContext_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendIds = new List<Guid> { Guid.NewGuid() };
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns((HttpContext?)null);
        var sut = new ActivityRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetFeedCountAsync(userId, friendIds);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - GetByIdAsync

    [Fact]
    public async Task GetByIdAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var activityId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new ActivityRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetByIdAsync(activityId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetByIdAsync_WithEmptyToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var activityId = Guid.NewGuid();
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", "" }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new ActivityRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetByIdAsync(activityId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetByIdAsync_WithNullHttpContext_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var activityId = Guid.NewGuid();
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns((HttpContext?)null);
        var sut = new ActivityRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetByIdAsync(activityId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion
}
