using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using Stepper.Api.Common.Database;
using Stepper.Api.Groups;

namespace Stepper.UnitTests.Groups;

/// <summary>
/// Unit tests for GroupRepository focusing on validation and authorization logic.
/// Note: Full data access operations should be tested via integration tests with a test Supabase instance
/// due to the complexity of mocking the Supabase client.
/// </summary>
public class GroupRepositoryTests
{
    private readonly Mock<ISupabaseClientFactory> _mockClientFactory;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly Mock<HttpContext> _mockHttpContext;

    public GroupRepositoryTests()
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
        var act = () => new GroupRepository(null!, _mockHttpContextAccessor.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullHttpContextAccessor_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new GroupRepository(_mockClientFactory.Object, null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithValidParameters_CreatesInstance()
    {
        // Arrange & Act
        var repository = new GroupRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Assert
        repository.Should().NotBeNull();
        repository.Should().BeAssignableTo<IGroupRepository>();
    }

    #endregion

    #region Authentication Token Tests - CreateAsync

    [Fact]
    public async Task CreateAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var group = CreateTestGroup();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new GroupRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.CreateAsync(group);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_WithEmptyToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var group = CreateTestGroup();
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", "" }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new GroupRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.CreateAsync(group);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_WithNullToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var group = CreateTestGroup();
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", null }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new GroupRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.CreateAsync(group);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_WithNullHttpContext_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var group = CreateTestGroup();
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns((HttpContext?)null);
        var sut = new GroupRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.CreateAsync(group);

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
        var groupId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new GroupRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetByIdAsync(groupId);

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
        var group = CreateTestGroup();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new GroupRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.UpdateAsync(group);

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
        var groupId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new GroupRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.DeleteAsync(groupId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - GetMembersAsync

    [Fact]
    public async Task GetMembersAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var groupId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new GroupRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetMembersAsync(groupId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - AddMemberAsync

    [Fact]
    public async Task AddMemberAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var membership = CreateTestMembership();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new GroupRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.AddMemberAsync(membership);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - RemoveMemberAsync

    [Fact]
    public async Task RemoveMemberAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var groupId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new GroupRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.RemoveMemberAsync(groupId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Authentication Token Tests - GetMembershipAsync

    [Fact]
    public async Task GetMembershipAsync_WithMissingTokenKey_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var groupId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        _mockHttpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new GroupRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.GetMembershipAsync(groupId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        _mockClientFactory.Verify(x => x.CreateClientAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Validation Tests - CreateAsync

    [Fact]
    public async Task CreateAsync_WithNullGroup_ThrowsArgumentNullException()
    {
        // Arrange
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", "valid-token" }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new GroupRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.CreateAsync(null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    #endregion

    #region Validation Tests - UpdateAsync

    [Fact]
    public async Task UpdateAsync_WithNullGroup_ThrowsArgumentNullException()
    {
        // Arrange
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", "valid-token" }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new GroupRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.UpdateAsync(null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    #endregion

    #region Validation Tests - AddMemberAsync

    [Fact]
    public async Task AddMemberAsync_WithNullMembership_ThrowsArgumentNullException()
    {
        // Arrange
        var items = new Dictionary<object, object?>
        {
            { "SupabaseToken", "valid-token" }
        };
        _mockHttpContext.Setup(x => x.Items).Returns(items);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        var sut = new GroupRepository(_mockClientFactory.Object, _mockHttpContextAccessor.Object);

        // Act
        var act = async () => await sut.AddMemberAsync(null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    #endregion

    #region Helper Methods

    private static Group CreateTestGroup()
    {
        return new Group
        {
            Id = Guid.NewGuid(),
            Name = "Test Group",
            Description = "Test Description",
            CreatedById = Guid.NewGuid(),
            IsPublic = true,
            JoinCode = null,
            PeriodType = CompetitionPeriodType.Weekly,
            CreatedAt = DateTime.UtcNow,
            MemberCount = 0
        };
    }

    private static GroupMembership CreateTestMembership()
    {
        return new GroupMembership
        {
            Id = Guid.NewGuid(),
            GroupId = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Role = MemberRole.Member,
            JoinedAt = DateTime.UtcNow
        };
    }

    #endregion
}
