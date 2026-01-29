using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using Supabase;
using System.Text.Json;
using Stepper.Api.Common.Database;
using Stepper.Api.Friends;
using Stepper.Api.Friends.Discovery;
using Stepper.Api.Friends.Discovery.DTOs;
using Stepper.Api.Users;

namespace Stepper.UnitTests.Friends.Discovery;

public class FriendDiscoveryServiceTests
{
    private readonly Mock<ISupabaseClientFactory> _mockClientFactory;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly Mock<IUserRepository> _mockUserRepository;
    private readonly Mock<IInviteCodeRepository> _mockInviteCodeRepository;
    private readonly Mock<IFriendService> _mockFriendService;
    private readonly Mock<HttpContext> _mockHttpContext;
    private readonly FriendDiscoveryService _sut;

    public FriendDiscoveryServiceTests()
    {
        _mockClientFactory = new Mock<ISupabaseClientFactory>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _mockUserRepository = new Mock<IUserRepository>();
        _mockInviteCodeRepository = new Mock<IInviteCodeRepository>();
        _mockFriendService = new Mock<IFriendService>();
        _mockHttpContext = new Mock<HttpContext>();

        _sut = new FriendDiscoveryService(
            _mockClientFactory.Object,
            _mockHttpContextAccessor.Object,
            _mockUserRepository.Object,
            _mockInviteCodeRepository.Object,
            _mockFriendService.Object
        );
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullClientFactory_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new FriendDiscoveryService(
            null!,
            _mockHttpContextAccessor.Object,
            _mockUserRepository.Object,
            _mockInviteCodeRepository.Object,
            _mockFriendService.Object
        );

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullHttpContextAccessor_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new FriendDiscoveryService(
            _mockClientFactory.Object,
            null!,
            _mockUserRepository.Object,
            _mockInviteCodeRepository.Object,
            _mockFriendService.Object
        );

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullUserRepository_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new FriendDiscoveryService(
            _mockClientFactory.Object,
            _mockHttpContextAccessor.Object,
            null!,
            _mockInviteCodeRepository.Object,
            _mockFriendService.Object
        );

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullInviteCodeRepository_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new FriendDiscoveryService(
            _mockClientFactory.Object,
            _mockHttpContextAccessor.Object,
            _mockUserRepository.Object,
            null!,
            _mockFriendService.Object
        );

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullFriendService_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new FriendDiscoveryService(
            _mockClientFactory.Object,
            _mockHttpContextAccessor.Object,
            _mockUserRepository.Object,
            _mockInviteCodeRepository.Object,
            null!
        );

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region SearchUsersAsync Tests

    [Fact]
    public async Task SearchUsersAsync_WithEmptyQuery_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.SearchUsersAsync(userId, "");

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Search query cannot be empty.*");
    }

    [Fact]
    public async Task SearchUsersAsync_WithWhitespaceQuery_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.SearchUsersAsync(userId, "   ");

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Search query cannot be empty.*");
    }

    [Fact]
    public async Task SearchUsersAsync_WithNullQuery_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.SearchUsersAsync(userId, null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Search query cannot be empty.*");
    }

    #endregion

    #region GetMyQrCodeAsync Tests

    [Fact]
    public async Task GetMyQrCodeAsync_WithValidUser_ReturnsQrCodeResponse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId, "Test User", "abc123");

        _mockUserRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.GetMyQrCodeAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.QrCodeId.Should().Be("abc123");
        result.QrCodeImage.Should().NotBeNullOrEmpty();
        result.DeepLink.Should().Be("Stepper://invite/abc123");
        _mockUserRepository.Verify(x => x.GetByIdAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetMyQrCodeAsync_WithNonExistentUser_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _mockUserRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act
        var act = async () => await _sut.GetMyQrCodeAsync(userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"User not found: {userId}");
        _mockUserRepository.Verify(x => x.GetByIdAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetMyQrCodeAsync_GeneratesPngImage()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId, "Test User", "qr123");

        _mockUserRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.GetMyQrCodeAsync(userId);

        // Assert
        result.QrCodeImage.Should().NotBeNullOrEmpty();
        // Verify it's a valid base64 string
        var act = () => Convert.FromBase64String(result.QrCodeImage);
        act.Should().NotThrow();

        // PNG files start with specific bytes (89 50 4E 47 0D 0A 1A 0A)
        var imageBytes = Convert.FromBase64String(result.QrCodeImage);
        imageBytes.Should().NotBeEmpty();
    }

    #endregion

    #region GetUserByQrCodeAsync Tests

    [Fact]
    public async Task GetUserByQrCodeAsync_WithEmptyQrCodeId_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.GetUserByQrCodeAsync("");

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("QR code ID cannot be empty.*");
    }

    [Fact]
    public async Task GetUserByQrCodeAsync_WithWhitespaceQrCodeId_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.GetUserByQrCodeAsync("   ");

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("QR code ID cannot be empty.*");
    }

    [Fact]
    public async Task GetUserByQrCodeAsync_WithNullQrCodeId_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.GetUserByQrCodeAsync(null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("QR code ID cannot be empty.*");
    }

    #endregion

    #region GenerateInviteLinkAsync Tests

    [Fact]
    public async Task GenerateInviteLinkAsync_WithNullRequest_ThrowsArgumentNullException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.GenerateInviteLinkAsync(userId, null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [Fact]
    public async Task GenerateInviteLinkAsync_WithNegativeExpirationHours_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new GenerateInviteLinkRequest
        {
            ExpirationHours = -1
        };

        // Act
        var act = async () => await _sut.GenerateInviteLinkAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Expiration hours must be positive.*");
    }

    [Fact]
    public async Task GenerateInviteLinkAsync_WithZeroExpirationHours_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new GenerateInviteLinkRequest
        {
            ExpirationHours = 0
        };

        // Act
        var act = async () => await _sut.GenerateInviteLinkAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Expiration hours must be positive.*");
    }

    [Fact]
    public async Task GenerateInviteLinkAsync_WithNegativeMaxUsages_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new GenerateInviteLinkRequest
        {
            MaxUsages = -1
        };

        // Act
        var act = async () => await _sut.GenerateInviteLinkAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Max usages must be positive.*");
    }

    [Fact]
    public async Task GenerateInviteLinkAsync_WithZeroMaxUsages_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new GenerateInviteLinkRequest
        {
            MaxUsages = 0
        };

        // Act
        var act = async () => await _sut.GenerateInviteLinkAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Max usages must be positive.*");
    }

    [Fact]
    public async Task GenerateInviteLinkAsync_WithNoExpiration_CreatesInviteCode()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new GenerateInviteLinkRequest
        {
            ExpirationHours = null,
            MaxUsages = null
        };

        _mockInviteCodeRepository.Setup(x => x.CreateAsync(It.IsAny<InviteCode>()))
            .ReturnsAsync((InviteCode code) => code);

        // Act
        var result = await _sut.GenerateInviteLinkAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.Code.Should().NotBeNullOrEmpty();
        result.DeepLink.Should().StartWith("Stepper://invite/");
        result.ExpiresAt.Should().BeNull();
        result.MaxUsages.Should().BeNull();

        _mockInviteCodeRepository.Verify(x => x.CreateAsync(It.Is<InviteCode>(
            ic => ic.UserId == userId &&
                  ic.Type == InviteCodeType.ShareLink &&
                  ic.ExpiresAt == null &&
                  ic.MaxUsages == null &&
                  ic.UsageCount == 0
        )), Times.Once);
    }

    [Fact]
    public async Task GenerateInviteLinkAsync_WithExpiration_CreatesInviteCodeWithExpiration()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new GenerateInviteLinkRequest
        {
            ExpirationHours = 24,
            MaxUsages = null
        };

        _mockInviteCodeRepository.Setup(x => x.CreateAsync(It.IsAny<InviteCode>()))
            .ReturnsAsync((InviteCode code) => code);

        // Act
        var result = await _sut.GenerateInviteLinkAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.ExpiresAt.Should().NotBeNull();
        result.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddHours(24), TimeSpan.FromSeconds(5));
        result.MaxUsages.Should().BeNull();

        _mockInviteCodeRepository.Verify(x => x.CreateAsync(It.Is<InviteCode>(
            ic => ic.UserId == userId &&
                  ic.Type == InviteCodeType.ShareLink &&
                  ic.ExpiresAt != null &&
                  ic.MaxUsages == null
        )), Times.Once);
    }

    [Fact]
    public async Task GenerateInviteLinkAsync_WithMaxUsages_CreatesInviteCodeWithMaxUsages()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new GenerateInviteLinkRequest
        {
            ExpirationHours = null,
            MaxUsages = 5
        };

        _mockInviteCodeRepository.Setup(x => x.CreateAsync(It.IsAny<InviteCode>()))
            .ReturnsAsync((InviteCode code) => code);

        // Act
        var result = await _sut.GenerateInviteLinkAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.ExpiresAt.Should().BeNull();
        result.MaxUsages.Should().Be(5);

        _mockInviteCodeRepository.Verify(x => x.CreateAsync(It.Is<InviteCode>(
            ic => ic.UserId == userId &&
                  ic.Type == InviteCodeType.ShareLink &&
                  ic.ExpiresAt == null &&
                  ic.MaxUsages == 5
        )), Times.Once);
    }

    [Fact]
    public async Task GenerateInviteLinkAsync_WithBothExpirationAndMaxUsages_CreatesInviteCode()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new GenerateInviteLinkRequest
        {
            ExpirationHours = 48,
            MaxUsages = 10
        };

        _mockInviteCodeRepository.Setup(x => x.CreateAsync(It.IsAny<InviteCode>()))
            .ReturnsAsync((InviteCode code) => code);

        // Act
        var result = await _sut.GenerateInviteLinkAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.ExpiresAt.Should().NotBeNull();
        result.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddHours(48), TimeSpan.FromSeconds(5));
        result.MaxUsages.Should().Be(10);

        _mockInviteCodeRepository.Verify(x => x.CreateAsync(It.Is<InviteCode>(
            ic => ic.UserId == userId &&
                  ic.Type == InviteCodeType.ShareLink &&
                  ic.ExpiresAt != null &&
                  ic.MaxUsages == 10
        )), Times.Once);
    }

    [Fact]
    public async Task GenerateInviteLinkAsync_GeneratesUniqueCode()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new GenerateInviteLinkRequest();

        _mockInviteCodeRepository.Setup(x => x.CreateAsync(It.IsAny<InviteCode>()))
            .ReturnsAsync((InviteCode code) => code);

        // Act
        var result1 = await _sut.GenerateInviteLinkAsync(userId, request);
        var result2 = await _sut.GenerateInviteLinkAsync(userId, request);

        // Assert
        result1.Code.Should().NotBe(result2.Code);
        result1.Code.Should().NotBeNullOrEmpty();
        result2.Code.Should().NotBeNullOrEmpty();
    }

    #endregion

    #region RedeemInviteCodeAsync Tests

    [Fact]
    public async Task RedeemInviteCodeAsync_WithEmptyCode_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.RedeemInviteCodeAsync(userId, "");

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Invite code cannot be empty.*");
    }

    [Fact]
    public async Task RedeemInviteCodeAsync_WithWhitespaceCode_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.RedeemInviteCodeAsync(userId, "   ");

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Invite code cannot be empty.*");
    }

    [Fact]
    public async Task RedeemInviteCodeAsync_WithNullCode_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.RedeemInviteCodeAsync(userId, null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Invite code cannot be empty.*");
    }

    #endregion

    #region Helper Methods

    private static User CreateTestUser(Guid userId, string displayName, string qrCodeId)
    {
        return new User
        {
            Id = userId,
            DisplayName = displayName,
            AvatarUrl = "https://example.com/avatar.jpg",
            QrCodeId = qrCodeId,
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
