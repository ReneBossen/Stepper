using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using Stepper.Api.Common.Database;
using Stepper.Api.Friends;

namespace Stepper.UnitTests.Friends;

/// <summary>
/// Unit tests for FriendRepository focusing on validation and authorization logic.
/// Note: Full data access operations should be tested via integration tests with a test Supabase instance
/// due to the complexity of mocking the Supabase client.
/// </summary>
public class FriendRepositoryTests
{
    private readonly Mock<ISupabaseClientFactory> _mockClientFactory;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly Mock<HttpContext> _mockHttpContext;

    public FriendRepositoryTests()
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
        var act = () => new FriendRepository(null!, _mockHttpContextAccessor.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullHttpContextAccessor_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new FriendRepository(_mockClientFactory.Object, null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithValidParameters_CreatesInstance()
    {
        // Arrange & Act
        var repository = new FriendRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Assert
        repository.Should().NotBeNull();
        repository.Should().BeAssignableTo<IFriendRepository>();
    }

    #endregion

    #region Authentication Token Tests - SendRequestAsync

    [Fact]
    public async Task SendRequestAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var requesterId = Guid.NewGuid();
        var addresseeId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new FriendRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.SendRequestAsync(requesterId, addresseeId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task SendRequestAsync_WithEmptyToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var requesterId = Guid.NewGuid();
        var addresseeId = Guid.NewGuid();
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", "" }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new FriendRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.SendRequestAsync(requesterId, addresseeId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task SendRequestAsync_WithNullToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var requesterId = Guid.NewGuid();
        var addresseeId = Guid.NewGuid();
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", null }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new FriendRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.SendRequestAsync(requesterId, addresseeId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task SendRequestAsync_WithNullHttpContext_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var requesterId = Guid.NewGuid();
        var addresseeId = Guid.NewGuid();
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns((HttpContext?)null);
        var sut = new FriendRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.SendRequestAsync(requesterId, addresseeId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - GetPendingRequestsAsync

    [Fact]
    public async Task GetPendingRequestsAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new FriendRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetPendingRequestsAsync(userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - GetSentRequestsAsync

    [Fact]
    public async Task GetSentRequestsAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new FriendRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetSentRequestsAsync(userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - AcceptRequestAsync

    [Fact]
    public async Task AcceptRequestAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var requestId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new FriendRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.AcceptRequestAsync(requestId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - RejectRequestAsync

    [Fact]
    public async Task RejectRequestAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var requestId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new FriendRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.RejectRequestAsync(requestId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - GetFriendsAsync

    [Fact]
    public async Task GetFriendsAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new FriendRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetFriendsAsync(userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - GetFriendshipAsync

    [Fact]
    public async Task GetFriendshipAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new FriendRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetFriendshipAsync(userId, friendId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - RemoveFriendAsync

    [Fact]
    public async Task RemoveFriendAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new FriendRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.RemoveFriendAsync(userId, friendId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - CancelRequestAsync

    [Fact]
    public async Task CancelRequestAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var requestId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new FriendRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.CancelRequestAsync(requestId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion
}
