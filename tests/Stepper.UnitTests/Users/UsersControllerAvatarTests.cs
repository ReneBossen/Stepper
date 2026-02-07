using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Stepper.Api.Common.Models;
using Stepper.Api.Users;
using Stepper.Api.Users.DTOs;

namespace Stepper.UnitTests.Users;

/// <summary>
/// Unit tests for UsersController avatar-related endpoints.
/// </summary>
public class UsersControllerAvatarTests
{
    private readonly Mock<IUserService> _mockUserService;
    private readonly Mock<ILogger<UsersController>> _mockLogger;
    private readonly UsersController _sut;

    public UsersControllerAvatarTests()
    {
        _mockUserService = new Mock<IUserService>();
        _mockLogger = new Mock<ILogger<UsersController>>();
        _sut = new UsersController(_mockUserService.Object, _mockLogger.Object);
    }

    #region UploadAvatar Tests

    [Fact]
    public async Task UploadAvatar_WithValidFile_ReturnsOkWithAvatarUrl()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var expectedUrl = "https://storage.example.com/avatars/test.jpg";
        var mockFile = CreateMockFile("avatar.jpg", "image/jpeg", 1024);
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UploadAvatarAsync(
                userId,
                It.IsAny<Stream>(),
                "avatar.jpg",
                "image/jpeg"))
            .ReturnsAsync(new AvatarUploadResponse(expectedUrl));

        // Act
        var result = await _sut.UploadAvatar(mockFile.Object);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<AvatarUploadResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.AvatarUrl.Should().Be(expectedUrl);
        _mockUserService.Verify(x => x.UploadAvatarAsync(
            userId,
            It.IsAny<Stream>(),
            "avatar.jpg",
            "image/jpeg"), Times.Once);
    }

    [Fact]
    public async Task UploadAvatar_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var mockFile = CreateMockFile("avatar.jpg", "image/jpeg", 1024);
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.UploadAvatar(mockFile.Object);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<AvatarUploadResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockUserService.Verify(x => x.UploadAvatarAsync(
            It.IsAny<Guid>(),
            It.IsAny<Stream>(),
            It.IsAny<string>(),
            It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UploadAvatar_WithNullFile_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        // Act
        var result = await _sut.UploadAvatar(null!);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<AvatarUploadResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("No file was provided.");
        _mockUserService.Verify(x => x.UploadAvatarAsync(
            It.IsAny<Guid>(),
            It.IsAny<Stream>(),
            It.IsAny<string>(),
            It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UploadAvatar_WithEmptyFile_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var mockFile = CreateMockFile("avatar.jpg", "image/jpeg", 0); // Zero length
        SetupAuthenticatedUser(userId);

        // Act
        var result = await _sut.UploadAvatar(mockFile.Object);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<AvatarUploadResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("No file was provided.");
        _mockUserService.Verify(x => x.UploadAvatarAsync(
            It.IsAny<Guid>(),
            It.IsAny<Stream>(),
            It.IsAny<string>(),
            It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UploadAvatar_WithInvalidFileType_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var mockFile = CreateMockFile("document.pdf", "application/pdf", 1024);
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UploadAvatarAsync(
                userId,
                It.IsAny<Stream>(),
                "document.pdf",
                "application/pdf"))
            .ThrowsAsync(new ArgumentException("Invalid file type. Allowed types: image/jpeg, image/jpg, image/png, image/gif, image/webp"));

        // Act
        var result = await _sut.UploadAvatar(mockFile.Object);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<AvatarUploadResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Invalid file type. Allowed types: image/jpeg, image/jpg, image/png, image/gif, image/webp");
    }

    [Fact]
    public async Task UploadAvatar_WithFileTooLarge_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var fileSizeBytes = 6 * 1024 * 1024; // 6MB (exceeds 5MB limit)
        var mockFile = CreateMockFile("avatar.jpg", "image/jpeg", fileSizeBytes);
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UploadAvatarAsync(
                userId,
                It.IsAny<Stream>(),
                "avatar.jpg",
                "image/jpeg"))
            .ThrowsAsync(new ArgumentException("File size exceeds maximum allowed size of 5MB."));

        // Act
        var result = await _sut.UploadAvatar(mockFile.Object);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<AvatarUploadResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("File size exceeds maximum allowed size of 5MB.");
    }

    [Fact]
    public async Task UploadAvatar_WithNonExistentUser_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var mockFile = CreateMockFile("avatar.jpg", "image/jpeg", 1024);
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UploadAvatarAsync(
                userId,
                It.IsAny<Stream>(),
                "avatar.jpg",
                "image/jpeg"))
            .ThrowsAsync(new KeyNotFoundException($"User profile not found for user ID: {userId}"));

        // Act
        var result = await _sut.UploadAvatar(mockFile.Object);

        // Assert
        result.Should().NotBeNull();
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<ApiResponse<AvatarUploadResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain($"User profile not found for user ID: {userId}");
    }

    [Fact]
    public async Task UploadAvatar_WhenServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var mockFile = CreateMockFile("avatar.jpg", "image/jpeg", 1024);
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UploadAvatarAsync(
                userId,
                It.IsAny<Stream>(),
                "avatar.jpg",
                "image/jpeg"))
            .ThrowsAsync(new Exception("Storage service unavailable"));

        // Act
        var result = await _sut.UploadAvatar(mockFile.Object);

        // Assert
        result.Should().NotBeNull();
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        var response = statusCodeResult.Value.Should().BeOfType<ApiResponse<AvatarUploadResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("An unexpected error occurred. Please try again later.");
    }

    [Theory]
    [InlineData("photo.png", "image/png")]
    [InlineData("image.gif", "image/gif")]
    [InlineData("picture.webp", "image/webp")]
    public async Task UploadAvatar_WithVariousValidImageTypes_ReturnsOk(string fileName, string contentType)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var expectedUrl = $"https://storage.example.com/avatars/{fileName}";
        var mockFile = CreateMockFile(fileName, contentType, 1024);
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UploadAvatarAsync(
                userId,
                It.IsAny<Stream>(),
                fileName,
                contentType))
            .ReturnsAsync(new AvatarUploadResponse(expectedUrl));

        // Act
        var result = await _sut.UploadAvatar(mockFile.Object);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<AvatarUploadResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data!.AvatarUrl.Should().Be(expectedUrl);
    }

    [Fact]
    public async Task UploadAvatar_WithInvalidFileExtension_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var mockFile = CreateMockFile("avatar.txt", "image/jpeg", 1024); // Wrong extension
        SetupAuthenticatedUser(userId);

        _mockUserService.Setup(x => x.UploadAvatarAsync(
                userId,
                It.IsAny<Stream>(),
                "avatar.txt",
                "image/jpeg"))
            .ThrowsAsync(new ArgumentException("Invalid file extension. Allowed extensions: .jpg, .jpeg, .png, .gif, .webp"));

        // Act
        var result = await _sut.UploadAvatar(mockFile.Object);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<AvatarUploadResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Invalid file extension. Allowed extensions: .jpg, .jpeg, .png, .gif, .webp");
    }

    #endregion

    #region Helper Methods

    private void SetupAuthenticatedUser(Guid userId)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    private void SetupUnauthenticatedUser()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity());

        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    private static Mock<IFormFile> CreateMockFile(string fileName, string contentType, long length)
    {
        var mockFile = new Mock<IFormFile>();
        var content = new byte[length];
        var stream = new MemoryStream(content);

        mockFile.Setup(f => f.FileName).Returns(fileName);
        mockFile.Setup(f => f.ContentType).Returns(contentType);
        mockFile.Setup(f => f.Length).Returns(length);
        mockFile.Setup(f => f.OpenReadStream()).Returns(stream);

        return mockFile;
    }

    #endregion
}
