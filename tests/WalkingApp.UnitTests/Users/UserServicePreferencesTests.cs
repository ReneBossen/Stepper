using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using WalkingApp.Api.Common.Database;
using WalkingApp.Api.Users;
using WalkingApp.Api.Users.DTOs;

namespace WalkingApp.UnitTests.Users;

/// <summary>
/// Unit tests for UserService preferences-related methods.
/// </summary>
public class UserServicePreferencesTests
{
    private readonly Mock<IUserRepository> _mockRepository;
    private readonly Mock<ISupabaseClientFactory> _mockClientFactory;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly UserService _sut;

    public UserServicePreferencesTests()
    {
        _mockRepository = new Mock<IUserRepository>();
        _mockClientFactory = new Mock<ISupabaseClientFactory>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _sut = new UserService(
            _mockRepository.Object,
            _mockClientFactory.Object,
            _mockHttpContextAccessor.Object);
    }

    #region GetPreferencesAsync Tests

    [Fact]
    public async Task GetPreferencesAsync_WithValidUserId_ReturnsPreferences()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        user.Preferences.DailyStepGoal = 12000;
        user.Preferences.Units = "imperial";
        user.Preferences.Notifications.DailyReminder = false;
        user.Preferences.Privacy.PrivateProfile = true;

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.GetPreferencesAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.DailyStepGoal.Should().Be(12000);
        result.DistanceUnit.Should().Be("imperial");
        result.NotificationsEnabled.Should().BeFalse();
        result.PrivateProfile.Should().BeTrue();
        _mockRepository.Verify(x => x.GetByIdAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetPreferencesAsync_WithDefaultPreferences_ReturnsDefaultValues()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        // Using default preferences from UserPreferences constructor

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.GetPreferencesAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.DailyStepGoal.Should().Be(10000); // Default value
        result.DistanceUnit.Should().Be("metric"); // Default value
        result.NotificationsEnabled.Should().BeTrue(); // Default value
        result.PrivateProfile.Should().BeFalse(); // Default value
    }

    [Fact]
    public async Task GetPreferencesAsync_WithEmptyGuid_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = async () => await _sut.GetPreferencesAsync(Guid.Empty);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetPreferencesAsync_WithNonExistentUser_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act
        var act = async () => await _sut.GetPreferencesAsync(userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"User profile not found for user ID: {userId}");
        _mockRepository.Verify(x => x.GetByIdAsync(userId), Times.Once);
    }

    #endregion

    #region UpdatePreferencesAsync Tests

    [Fact]
    public async Task UpdatePreferencesAsync_WithAllFields_UpdatesAndReturnsPreferences()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var existingUser = CreateTestUser(userId);
        var request = new UpdateUserPreferencesRequest(
            NotificationsEnabled: false,
            DailyStepGoal: 15000,
            DistanceUnit: "imperial",
            PrivateProfile: true
        );

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(existingUser);
        _mockRepository.Setup(x => x.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.NotificationsEnabled.Should().BeFalse();
        result.DailyStepGoal.Should().Be(15000);
        result.DistanceUnit.Should().Be("imperial");
        result.PrivateProfile.Should().BeTrue();
        _mockRepository.Verify(x => x.GetByIdAsync(userId), Times.Once);
        _mockRepository.Verify(x => x.UpdateAsync(It.Is<User>(u =>
            u.Preferences.Notifications.DailyReminder == false &&
            u.Preferences.DailyStepGoal == 15000 &&
            u.Preferences.Units == "imperial" &&
            u.Preferences.Privacy.PrivateProfile == true
        )), Times.Once);
    }

    [Fact]
    public async Task UpdatePreferencesAsync_WithPartialUpdate_OnlyUpdatesProvidedFields()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var existingUser = CreateTestUser(userId);
        existingUser.Preferences.DailyStepGoal = 8000;
        existingUser.Preferences.Units = "metric";
        existingUser.Preferences.Notifications.DailyReminder = true;
        existingUser.Preferences.Privacy.PrivateProfile = false;

        var request = new UpdateUserPreferencesRequest(
            NotificationsEnabled: null, // Should not change
            DailyStepGoal: 12000, // Should update
            DistanceUnit: null, // Should not change
            PrivateProfile: null // Should not change
        );

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(existingUser);
        _mockRepository.Setup(x => x.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.DailyStepGoal.Should().Be(12000); // Updated
        result.DistanceUnit.Should().Be("metric"); // Unchanged
        result.NotificationsEnabled.Should().BeTrue(); // Unchanged
        result.PrivateProfile.Should().BeFalse(); // Unchanged
    }

    [Fact]
    public async Task UpdatePreferencesAsync_WithEmptyGuid_ThrowsArgumentException()
    {
        // Arrange
        var request = new UpdateUserPreferencesRequest(null, null, null, null);

        // Act
        var act = async () => await _sut.UpdatePreferencesAsync(Guid.Empty, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task UpdatePreferencesAsync_WithNullRequest_ThrowsArgumentNullException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.UpdatePreferencesAsync(userId, null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task UpdatePreferencesAsync_WithNonExistentUser_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateUserPreferencesRequest(null, 10000, null, null);
        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act
        var act = async () => await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"User profile not found for user ID: {userId}");
        _mockRepository.Verify(x => x.GetByIdAsync(userId), Times.Once);
        _mockRepository.Verify(x => x.UpdateAsync(It.IsAny<User>()), Times.Never);
    }

    [Theory]
    [InlineData(99)] // Below minimum (100)
    [InlineData(100001)] // Above maximum (100000)
    public async Task UpdatePreferencesAsync_WithInvalidDailyStepGoal_ThrowsArgumentException(int stepGoal)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateUserPreferencesRequest(null, stepGoal, null, null);

        // Act
        var act = async () => await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Daily step goal must be between 100 and 100000.");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Theory]
    [InlineData(100)] // Minimum valid
    [InlineData(10000)] // Default value
    [InlineData(100000)] // Maximum valid
    public async Task UpdatePreferencesAsync_WithValidDailyStepGoal_UpdatesSuccessfully(int stepGoal)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var existingUser = CreateTestUser(userId);
        var request = new UpdateUserPreferencesRequest(null, stepGoal, null, null);

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(existingUser);
        _mockRepository.Setup(x => x.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.DailyStepGoal.Should().Be(stepGoal);
    }

    [Theory]
    [InlineData("invalid")]
    [InlineData("kilometers")]
    [InlineData("miles")]
    [InlineData("km")]
    [InlineData("mi")]
    public async Task UpdatePreferencesAsync_WithInvalidDistanceUnit_ThrowsArgumentException(string unit)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateUserPreferencesRequest(null, null, unit, null);

        // Act
        var act = async () => await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Distance unit must be either 'metric' or 'imperial'.");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Theory]
    [InlineData("metric")]
    [InlineData("imperial")]
    [InlineData("METRIC")] // Case-insensitive
    [InlineData("IMPERIAL")] // Case-insensitive
    [InlineData("Metric")] // Mixed case
    [InlineData("Imperial")] // Mixed case
    public async Task UpdatePreferencesAsync_WithValidDistanceUnit_UpdatesSuccessfully(string unit)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var existingUser = CreateTestUser(userId);
        var request = new UpdateUserPreferencesRequest(null, null, unit, null);

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(existingUser);
        _mockRepository.Setup(x => x.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.DistanceUnit.Should().Be(unit);
    }

    [Fact]
    public async Task UpdatePreferencesAsync_WithEmptyDistanceUnit_DoesNotUpdateUnit()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var existingUser = CreateTestUser(userId);
        existingUser.Preferences.Units = "imperial";
        var request = new UpdateUserPreferencesRequest(null, null, "", null);

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(existingUser);
        _mockRepository.Setup(x => x.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.DistanceUnit.Should().Be("imperial"); // Unchanged
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task UpdatePreferencesAsync_WithNotificationsEnabled_UpdatesDailyReminder(bool enabled)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var existingUser = CreateTestUser(userId);
        var request = new UpdateUserPreferencesRequest(enabled, null, null, null);

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(existingUser);
        _mockRepository.Setup(x => x.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.NotificationsEnabled.Should().Be(enabled);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task UpdatePreferencesAsync_WithPrivateProfile_UpdatesPrivacySetting(bool isPrivate)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var existingUser = CreateTestUser(userId);
        var request = new UpdateUserPreferencesRequest(null, null, null, isPrivate);

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(existingUser);
        _mockRepository.Setup(x => x.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.PrivateProfile.Should().Be(isPrivate);
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
            UpdatedAt = DateTime.UtcNow.AddDays(-1),
            Preferences = new UserPreferences
            {
                Units = "metric",
                DailyStepGoal = 10000,
                Notifications = new NotificationSettings
                {
                    DailyReminder = true,
                    FriendRequests = true,
                    GroupInvites = true,
                    Achievements = true
                },
                Privacy = new PrivacySettings
                {
                    ShowStepsToFriends = true,
                    ShowGroupActivity = true,
                    AllowFriendRequests = true,
                    PrivateProfile = false
                }
            }
        };
    }

    #endregion
}
