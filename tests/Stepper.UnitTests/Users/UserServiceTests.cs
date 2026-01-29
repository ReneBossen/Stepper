using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using Stepper.Api.Common.Database;
using Stepper.Api.Users;
using Stepper.Api.Users.DTOs;

namespace Stepper.UnitTests.Users;

public class UserServiceTests
{
    private readonly Mock<IUserRepository> _mockRepository;
    private readonly Mock<IUserPreferencesRepository> _mockPreferencesRepository;
    private readonly Mock<ISupabaseClientFactory> _mockClientFactory;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly UserService _sut;

    public UserServiceTests()
    {
        _mockRepository = new Mock<IUserRepository>();
        _mockPreferencesRepository = new Mock<IUserPreferencesRepository>();
        _mockClientFactory = new Mock<ISupabaseClientFactory>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _sut = new UserService(
            _mockRepository.Object,
            _mockPreferencesRepository.Object,
            _mockClientFactory.Object,
            _mockHttpContextAccessor.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullRepository_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new UserService(
            null!,
            _mockPreferencesRepository.Object,
            _mockClientFactory.Object,
            _mockHttpContextAccessor.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullPreferencesRepository_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new UserService(
            _mockRepository.Object,
            null!,
            _mockClientFactory.Object,
            _mockHttpContextAccessor.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullClientFactory_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new UserService(
            _mockRepository.Object,
            _mockPreferencesRepository.Object,
            null!,
            _mockHttpContextAccessor.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_WithNullHttpContextAccessor_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new UserService(
            _mockRepository.Object,
            _mockPreferencesRepository.Object,
            _mockClientFactory.Object,
            null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region GetProfileAsync Tests

    [Fact]
    public async Task GetProfileAsync_WithValidUserId_ReturnsProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.GetProfileAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(userId);
        result.DisplayName.Should().Be(user.DisplayName);
        result.AvatarUrl.Should().Be(user.AvatarUrl);
        result.CreatedAt.Should().Be(user.CreatedAt);
        _mockRepository.Verify(x => x.GetByIdAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetProfileAsync_WithEmptyGuid_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.GetProfileAsync(Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetProfileAsync_WithNonExistentUser_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act
        var act = async () => await _sut.GetProfileAsync(userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"User profile not found for user ID: {userId}");
        _mockRepository.Verify(x => x.GetByIdAsync(userId), Times.Once);
    }

    #endregion

    #region UpdateProfileAsync Tests

    [Fact]
    public async Task UpdateProfileAsync_WithValidRequest_UpdatesAndReturnsProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var existingUser = CreateTestUser(userId);
        var request = new UpdateProfileRequest
        {
            DisplayName = "New Display Name",
            AvatarUrl = "https://example.com/new-avatar.jpg"
        };

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(existingUser);
        _mockRepository.Setup(x => x.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        // Act
        var result = await _sut.UpdateProfileAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.DisplayName.Should().Be(request.DisplayName);
        result.AvatarUrl.Should().Be(request.AvatarUrl);
        _mockRepository.Verify(x => x.GetByIdAsync(userId), Times.Once);
        _mockRepository.Verify(x => x.UpdateAsync(It.Is<User>(u =>
            u.DisplayName == request.DisplayName &&
            u.AvatarUrl == request.AvatarUrl
        )), Times.Once);
    }

    [Fact]
    public async Task UpdateProfileAsync_WithEmptyGuid_ThrowsArgumentException()
    {
        // Arrange
        var request = new UpdateProfileRequest { DisplayName = "Test" };

        // Act
        var act = async () => await _sut.UpdateProfileAsync(Guid.Empty, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfileAsync_WithNullRequest_ThrowsArgumentNullException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.UpdateProfileAsync(userId, null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfileAsync_WithNonExistentUser_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateProfileRequest { DisplayName = "Test" };
        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act
        var act = async () => await _sut.UpdateProfileAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"User profile not found for user ID: {userId}");
        _mockRepository.Verify(x => x.GetByIdAsync(userId), Times.Once);
        _mockRepository.Verify(x => x.UpdateAsync(It.IsAny<User>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task UpdateProfileAsync_WithNullOrWhitespaceDisplayName_ThrowsArgumentException(string displayName)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateProfileRequest { DisplayName = displayName! };

        // Act
        var act = async () => await _sut.UpdateProfileAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Display name cannot be empty.");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfileAsync_WithShortDisplayName_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateProfileRequest { DisplayName = "A" };

        // Act
        var act = async () => await _sut.UpdateProfileAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Display name must be at least 2 characters long.");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfileAsync_WithLongDisplayName_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateProfileRequest
        {
            DisplayName = new string('A', 51) // 51 characters
        };

        // Act
        var act = async () => await _sut.UpdateProfileAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Display name must not exceed 50 characters.");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Theory]
    [InlineData("not-a-url")]
    [InlineData("ftp://example.com/avatar.jpg")]
    [InlineData("file:///c:/avatar.jpg")]
    [InlineData("javascript:alert('xss')")]
    public async Task UpdateProfileAsync_WithInvalidAvatarUrl_ThrowsArgumentException(string avatarUrl)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateProfileRequest
        {
            DisplayName = "Valid Name",
            AvatarUrl = avatarUrl
        };

        // Act
        var act = async () => await _sut.UpdateProfileAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Avatar URL must be a valid HTTP or HTTPS URL.");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Theory]
    [InlineData("https://example.com/avatar.jpg")]
    [InlineData("http://example.com/avatar.png")]
    [InlineData(null)]
    [InlineData("")]
    public async Task UpdateProfileAsync_WithValidAvatarUrl_UpdatesProfile(string? avatarUrl)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var existingUser = CreateTestUser(userId);
        var request = new UpdateProfileRequest
        {
            DisplayName = "Valid Name",
            AvatarUrl = avatarUrl
        };

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(existingUser);
        _mockRepository.Setup(x => x.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        // Act
        var result = await _sut.UpdateProfileAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.AvatarUrl.Should().Be(avatarUrl);
        _mockRepository.Verify(x => x.UpdateAsync(It.IsAny<User>()), Times.Once);
    }

    [Fact]
    public async Task UpdateProfileAsync_DoesNotSetUpdatedAtTimestamp()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var existingUser = CreateTestUser(userId);
        var originalUpdatedAt = existingUser.UpdatedAt;
        var request = new UpdateProfileRequest { DisplayName = "New Name" };

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(existingUser);
        _mockRepository.Setup(x => x.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        // Act
        await _sut.UpdateProfileAsync(userId, request);

        // Assert
        // UpdatedAt should not be modified by the service - it's handled by the database trigger
        _mockRepository.Verify(x => x.UpdateAsync(It.Is<User>(u =>
            u.UpdatedAt == originalUpdatedAt
        )), Times.Once);
    }

    #endregion

    #region EnsureProfileExistsAsync Tests

    [Fact]
    public async Task EnsureProfileExistsAsync_WithExistingUser_ReturnsExistingProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var existingUser = CreateTestUser(userId);
        var existingPreferences = CreateTestPreferences(userId);

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(existingUser);
        _mockPreferencesRepository.Setup(x => x.GetByUserIdAsync(userId))
            .ReturnsAsync(existingPreferences);

        // Act
        var result = await _sut.EnsureProfileExistsAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(userId);
        result.DisplayName.Should().Be(existingUser.DisplayName);
        _mockRepository.Verify(x => x.GetByIdAsync(userId), Times.Once);
        _mockRepository.Verify(x => x.CreateAsync(It.IsAny<User>()), Times.Never);
    }

    [Fact]
    public async Task EnsureProfileExistsAsync_WithNonExistentUser_CreatesNewProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync((User?)null);
        _mockRepository.Setup(x => x.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);
        _mockPreferencesRepository.Setup(x => x.CreateAsync(userId))
            .ReturnsAsync(CreateTestPreferences(userId));

        // Act
        var result = await _sut.EnsureProfileExistsAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(userId);
        result.DisplayName.Should().StartWith("User_");
        _mockRepository.Verify(x => x.GetByIdAsync(userId), Times.Once);
        _mockRepository.Verify(x => x.CreateAsync(It.Is<User>(u =>
            u.Id == userId &&
            u.DisplayName.StartsWith("User_")
        )), Times.Once);
        _mockPreferencesRepository.Verify(x => x.CreateAsync(userId), Times.Once);
    }

    [Fact]
    public async Task EnsureProfileExistsAsync_WithEmptyGuid_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.EnsureProfileExistsAsync(Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
        _mockRepository.Verify(x => x.CreateAsync(It.IsAny<User>()), Times.Never);
    }

    [Fact]
    public async Task EnsureProfileExistsAsync_CreatesProfileWithCorrectTimestamps()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var beforeCreation = DateTime.UtcNow;
        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync((User?)null);
        _mockRepository.Setup(x => x.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);
        _mockPreferencesRepository.Setup(x => x.CreateAsync(userId))
            .ReturnsAsync(CreateTestPreferences(userId));

        // Act
        await _sut.EnsureProfileExistsAsync(userId);

        // Assert
        _mockRepository.Verify(x => x.CreateAsync(It.Is<User>(u =>
            u.CreatedAt >= beforeCreation && u.CreatedAt <= DateTime.UtcNow &&
            u.UpdatedAt >= beforeCreation && u.UpdatedAt <= DateTime.UtcNow
        )), Times.Once);
    }

    [Fact]
    public async Task EnsureProfileExistsAsync_ExistingUserWithoutPreferences_CreatesPreferences()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var existingUser = CreateTestUser(userId);

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(existingUser);
        _mockPreferencesRepository.Setup(x => x.GetByUserIdAsync(userId))
            .ReturnsAsync((UserPreferencesEntity?)null);
        _mockPreferencesRepository.Setup(x => x.CreateAsync(userId))
            .ReturnsAsync(CreateTestPreferences(userId));

        // Act
        await _sut.EnsureProfileExistsAsync(userId);

        // Assert
        _mockPreferencesRepository.Verify(x => x.CreateAsync(userId), Times.Once);
    }

    #endregion

    #region Helper Methods

    private static User CreateTestUser(Guid userId)
    {
        return new User
        {
            Id = userId,
            DisplayName = "Test User",
            AvatarUrl = "https://example.com/avatar.jpg",
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };
    }

    private static UserPreferencesEntity CreateTestPreferences(Guid userId)
    {
        return new UserPreferencesEntity
        {
            Id = userId,
            DailyStepGoal = 10000,
            Units = "metric",
            NotificationsEnabled = true,
            NotifyDailyReminder = true,
            NotifyFriendRequests = true,
            NotifyFriendAccepted = true,
            NotifyGroupInvites = true,
            NotifyAchievements = true,
            PrivacyProfileVisibility = "public",
            PrivacyFindMe = "public",
            PrivacyShowSteps = "partial"
        };
    }

    #endregion
}
