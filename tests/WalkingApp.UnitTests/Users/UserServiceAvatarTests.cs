using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using WalkingApp.Api.Common.Database;
using WalkingApp.Api.Users;
using WalkingApp.Api.Users.DTOs;

namespace WalkingApp.UnitTests.Users;

/// <summary>
/// Unit tests for UserService avatar-related methods.
/// </summary>
public class UserServiceAvatarTests
{
    private readonly Mock<IUserRepository> _mockRepository;
    private readonly Mock<ISupabaseClientFactory> _mockClientFactory;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly UserService _sut;

    public UserServiceAvatarTests()
    {
        _mockRepository = new Mock<IUserRepository>();
        _mockClientFactory = new Mock<ISupabaseClientFactory>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _sut = new UserService(
            _mockRepository.Object,
            _mockClientFactory.Object,
            _mockHttpContextAccessor.Object);
    }

    #region UploadAvatarAsync Validation Tests

    [Fact]
    public async Task UploadAvatarAsync_WithEmptyGuid_ThrowsArgumentException()
    {
        // Arrange
        using var stream = CreateTestStream(1024);

        // Act
        var act = async () => await _sut.UploadAvatarAsync(Guid.Empty, stream, "avatar.jpg", "image/jpeg");

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("User ID cannot be empty.*");
        _mockRepository.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task UploadAvatarAsync_WithNullStream_ThrowsArgumentNullException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.UploadAvatarAsync(userId, null!, "avatar.jpg", "image/jpeg");

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task UploadAvatarAsync_WithNullOrEmptyFileName_ThrowsArgumentException(string? fileName)
    {
        // Arrange
        var userId = Guid.NewGuid();
        using var stream = CreateTestStream(1024);

        // Act
        var act = async () => await _sut.UploadAvatarAsync(userId, stream, fileName!, "image/jpeg");

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("File name cannot be empty.*");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task UploadAvatarAsync_WithNullOrEmptyContentType_ThrowsArgumentException(string? contentType)
    {
        // Arrange
        var userId = Guid.NewGuid();
        using var stream = CreateTestStream(1024);

        // Act
        var act = async () => await _sut.UploadAvatarAsync(userId, stream, "avatar.jpg", contentType!);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Content type cannot be empty.*");
    }

    [Theory]
    [InlineData("application/pdf")]
    [InlineData("text/plain")]
    [InlineData("video/mp4")]
    [InlineData("application/octet-stream")]
    [InlineData("image/svg+xml")]
    [InlineData("image/tiff")]
    public async Task UploadAvatarAsync_WithInvalidContentType_ThrowsArgumentException(string contentType)
    {
        // Arrange
        var userId = Guid.NewGuid();
        using var stream = CreateTestStream(1024);

        // Act
        var act = async () => await _sut.UploadAvatarAsync(userId, stream, "avatar.jpg", contentType);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Invalid file type. Allowed types:*");
    }

    [Theory]
    [InlineData("image/jpeg")]
    [InlineData("image/jpg")]
    [InlineData("image/png")]
    [InlineData("image/gif")]
    [InlineData("image/webp")]
    public async Task UploadAvatarAsync_WithValidContentType_DoesNotThrowForContentType(string contentType)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        using var stream = CreateTestStream(1024);

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(user);

        // For this test, we just want to verify content type validation passes
        // The actual upload will fail due to missing Supabase setup, but that's expected
        SetupNoSupabaseToken();

        // Act
        var act = async () => await _sut.UploadAvatarAsync(userId, stream, "avatar.jpg", contentType);

        // Assert - Should throw UnauthorizedAccessException (not ArgumentException for content type)
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Theory]
    [InlineData("avatar.txt")]
    [InlineData("avatar.pdf")]
    [InlineData("avatar.doc")]
    [InlineData("avatar.exe")]
    [InlineData("avatar")]
    [InlineData("avatar.svg")]
    public async Task UploadAvatarAsync_WithInvalidFileExtension_ThrowsArgumentException(string fileName)
    {
        // Arrange
        var userId = Guid.NewGuid();
        using var stream = CreateTestStream(1024);

        // Act
        var act = async () => await _sut.UploadAvatarAsync(userId, stream, fileName, "image/jpeg");

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Invalid file extension. Allowed extensions:*");
    }

    [Theory]
    [InlineData("avatar.jpg")]
    [InlineData("avatar.jpeg")]
    [InlineData("avatar.png")]
    [InlineData("avatar.gif")]
    [InlineData("avatar.webp")]
    [InlineData("AVATAR.JPG")] // Case insensitive
    [InlineData("my-photo.PNG")]
    public async Task UploadAvatarAsync_WithValidFileExtension_DoesNotThrowForExtension(string fileName)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        using var stream = CreateTestStream(1024);

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(user);

        SetupNoSupabaseToken();

        // Act
        var act = async () => await _sut.UploadAvatarAsync(userId, stream, fileName, "image/jpeg");

        // Assert - Should throw UnauthorizedAccessException (not ArgumentException for extension)
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task UploadAvatarAsync_WithFileTooLarge_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var fileSizeBytes = 5 * 1024 * 1024 + 1; // 5MB + 1 byte (exceeds limit)
        using var stream = CreateTestStream(fileSizeBytes);

        // Act
        var act = async () => await _sut.UploadAvatarAsync(userId, stream, "avatar.jpg", "image/jpeg");

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("File size exceeds maximum allowed size of 5MB.");
    }

    [Fact]
    public async Task UploadAvatarAsync_WithExactMaxFileSize_DoesNotThrowForSize()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        var fileSizeBytes = 5 * 1024 * 1024; // Exactly 5MB
        using var stream = CreateTestStream(fileSizeBytes);

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(user);

        SetupNoSupabaseToken();

        // Act
        var act = async () => await _sut.UploadAvatarAsync(userId, stream, "avatar.jpg", "image/jpeg");

        // Assert - Should throw UnauthorizedAccessException (not ArgumentException for size)
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Theory]
    [InlineData(1)]
    [InlineData(1024)]
    [InlineData(1024 * 1024)] // 1MB
    [InlineData(4 * 1024 * 1024)] // 4MB
    public async Task UploadAvatarAsync_WithValidFileSize_DoesNotThrowForSize(int fileSizeBytes)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        using var stream = CreateTestStream(fileSizeBytes);

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(user);

        SetupNoSupabaseToken();

        // Act
        var act = async () => await _sut.UploadAvatarAsync(userId, stream, "avatar.jpg", "image/jpeg");

        // Assert - Should throw UnauthorizedAccessException (not ArgumentException for size)
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task UploadAvatarAsync_WithNonExistentUser_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        using var stream = CreateTestStream(1024);

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync((User?)null);

        SetupValidSupabaseToken();

        // Act
        var act = async () => await _sut.UploadAvatarAsync(userId, stream, "avatar.jpg", "image/jpeg");

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"User profile not found for user ID: {userId}");
        _mockRepository.Verify(x => x.GetByIdAsync(userId), Times.Once);
    }

    [Fact]
    public async Task UploadAvatarAsync_WithoutAuthentication_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        using var stream = CreateTestStream(1024);

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(user);

        SetupNoSupabaseToken();

        // Act
        var act = async () => await _sut.UploadAvatarAsync(userId, stream, "avatar.jpg", "image/jpeg");

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
    }

    [Fact]
    public async Task UploadAvatarAsync_WithEmptyToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        using var stream = CreateTestStream(1024);

        _mockRepository.Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(user);

        SetupEmptySupabaseToken();

        // Act
        var act = async () => await _sut.UploadAvatarAsync(userId, stream, "avatar.jpg", "image/jpeg");

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
    }

    #endregion

    #region Content Type and Extension Mismatch Tests

    [Fact]
    public async Task UploadAvatarAsync_WithMismatchedContentTypeAndExtension_ValidatesContentTypeFirst()
    {
        // Arrange
        var userId = Guid.NewGuid();
        using var stream = CreateTestStream(1024);

        // Content type is invalid - should fail on content type validation
        // Act
        var act = async () => await _sut.UploadAvatarAsync(userId, stream, "avatar.jpg", "text/plain");

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Invalid file type. Allowed types:*");
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

    private static MemoryStream CreateTestStream(int sizeInBytes)
    {
        var buffer = new byte[sizeInBytes];
        return new MemoryStream(buffer);
    }

    private void SetupNoSupabaseToken()
    {
        var httpContext = new DefaultHttpContext();
        // No token in Items
        _mockHttpContextAccessor.Setup(x => x.HttpContext)
            .Returns(httpContext);
    }

    private void SetupEmptySupabaseToken()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Items["SupabaseToken"] = "";
        _mockHttpContextAccessor.Setup(x => x.HttpContext)
            .Returns(httpContext);
    }

    private void SetupValidSupabaseToken()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Items["SupabaseToken"] = "valid-token-for-testing";
        _mockHttpContextAccessor.Setup(x => x.HttpContext)
            .Returns(httpContext);
    }

    #endregion
}
