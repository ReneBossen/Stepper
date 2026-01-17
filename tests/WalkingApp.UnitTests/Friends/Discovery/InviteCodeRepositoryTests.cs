using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using WalkingApp.Api.Common.Database;
using WalkingApp.Api.Friends.Discovery;

namespace WalkingApp.UnitTests.Friends.Discovery;

/// <summary>
/// Unit tests for InviteCodeRepository focusing on validation and authorization logic.
/// Note: Full data access operations should be tested via integration tests with a test Supabase instance
/// due to the complexity of mocking the Supabase client.
/// </summary>
public class InviteCodeRepositoryTests
{
    private readonly Mock<ISupabaseClientFactory> _mockClientFactory;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly Mock<HttpContext> _mockHttpContext;

    public InviteCodeRepositoryTests()
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
        var act = () => new InviteCodeRepository(null!, _mockHttpContextAccessor.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullHttpContextAccessor_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new InviteCodeRepository(_mockClientFactory.Object, null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithValidParameters_CreatesInstance()
    {
        // Arrange & Act
        var repository = new InviteCodeRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Assert
        repository.Should().NotBeNull();
        repository.Should().BeAssignableTo<IInviteCodeRepository>();
    }

    #endregion

    #region Authentication Token Tests - CreateAsync

    [Fact]
    public async Task CreateAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var inviteCode = CreateTestInviteCode();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new InviteCodeRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.CreateAsync(inviteCode);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_WithEmptyToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var inviteCode = CreateTestInviteCode();
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", "" }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new InviteCodeRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.CreateAsync(inviteCode);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_WithNullToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var inviteCode = CreateTestInviteCode();
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", null }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new InviteCodeRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.CreateAsync(inviteCode);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_WithNullHttpContext_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var inviteCode = CreateTestInviteCode();
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns((HttpContext?)null);
        var sut = new InviteCodeRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.CreateAsync(inviteCode);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - GetByCodeAsync

    [Fact]
    public async Task GetByCodeAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var code = "test-code";
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new InviteCodeRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetByCodeAsync(code);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - GetByUserIdAsync

    [Fact]
    public async Task GetByUserIdAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new InviteCodeRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetByUserIdAsync(userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - UpdateAsync

    [Fact]
    public async Task UpdateAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var inviteCode = CreateTestInviteCode();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new InviteCodeRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.UpdateAsync(inviteCode);

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
        var id = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new InviteCodeRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.DeleteAsync(id);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Helper Methods

    private static InviteCode CreateTestInviteCode()
    {
        return new InviteCode
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Code = "test-code-123",
            Type = InviteCodeType.ShareLink,
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            MaxUsages = 10,
            UsageCount = 0,
            CreatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
