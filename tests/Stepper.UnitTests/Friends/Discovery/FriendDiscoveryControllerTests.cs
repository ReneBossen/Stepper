using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Stepper.Api.Common.Models;
using Stepper.Api.Friends.Discovery;
using Stepper.Api.Friends.Discovery.DTOs;

namespace Stepper.UnitTests.Friends.Discovery;

public class FriendDiscoveryControllerTests
{
    private readonly Mock<IFriendDiscoveryService> _mockDiscoveryService;
    private readonly FriendDiscoveryController _sut;

    public FriendDiscoveryControllerTests()
    {
        _mockDiscoveryService = new Mock<IFriendDiscoveryService>();
        _sut = new FriendDiscoveryController(_mockDiscoveryService.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullDiscoveryService_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new FriendDiscoveryController(null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region SearchUsers Tests

    [Fact]
    public async Task SearchUsers_WithValidQuery_ReturnsOkWithSearchResults()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var query = "john";
        var searchResponse = new SearchUsersResponse
        {
            Users = new List<UserSearchResult>
            {
                new UserSearchResult { Id = Guid.NewGuid(), DisplayName = "John Doe", FriendshipStatus = "none" },
                new UserSearchResult { Id = Guid.NewGuid(), DisplayName = "Johnny Smith", FriendshipStatus = "pending" }
            },
            TotalCount = 2
        };
        SetupAuthenticatedUser(userId);

        _mockDiscoveryService.Setup(x => x.SearchUsersAsync(userId, query))
            .ReturnsAsync(searchResponse);

        // Act
        var result = await _sut.SearchUsers(query);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<SearchUsersResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.Users.Should().HaveCount(2);
        apiResponse.Data.TotalCount.Should().Be(2);
        _mockDiscoveryService.Verify(x => x.SearchUsersAsync(userId, query), Times.Once);
    }

    [Fact]
    public async Task SearchUsers_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var query = "john";
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.SearchUsers(query);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var apiResponse = unauthorizedResult.Value.Should().BeOfType<ApiResponse<SearchUsersResponse>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("User is not authenticated.");
        _mockDiscoveryService.Verify(x => x.SearchUsersAsync(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task SearchUsers_WithEmptyQuery_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        // Act
        var result = await _sut.SearchUsers("");

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var apiResponse = badRequestResult.Value.Should().BeOfType<ApiResponse<SearchUsersResponse>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("Search query cannot be empty.");
        _mockDiscoveryService.Verify(x => x.SearchUsersAsync(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task SearchUsers_WithWhitespaceQuery_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        // Act
        var result = await _sut.SearchUsers("   ");

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var apiResponse = badRequestResult.Value.Should().BeOfType<ApiResponse<SearchUsersResponse>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("Search query cannot be empty.");
        _mockDiscoveryService.Verify(x => x.SearchUsersAsync(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region GetMyQrCode Tests

    [Fact]
    public async Task GetMyQrCode_WithAuthenticatedUser_ReturnsOkWithQrCode()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var qrCodeResponse = new QrCodeResponse
        {
            QrCodeId = "abc123",
            QrCodeImage = "base64-encoded-image",
            DeepLink = "Stepper://invite/abc123"
        };
        SetupAuthenticatedUser(userId);

        _mockDiscoveryService.Setup(x => x.GetMyQrCodeAsync(userId))
            .ReturnsAsync(qrCodeResponse);

        // Act
        var result = await _sut.GetMyQrCode();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<QrCodeResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.QrCodeId.Should().Be("abc123");
        apiResponse.Data.QrCodeImage.Should().Be("base64-encoded-image");
        apiResponse.Data.DeepLink.Should().Be("Stepper://invite/abc123");
        _mockDiscoveryService.Verify(x => x.GetMyQrCodeAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetMyQrCode_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetMyQrCode();

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var apiResponse = unauthorizedResult.Value.Should().BeOfType<ApiResponse<QrCodeResponse>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("User is not authenticated.");
        _mockDiscoveryService.Verify(x => x.GetMyQrCodeAsync(It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region GetUserByQrCode Tests

    [Fact]
    public async Task GetUserByQrCode_WithValidQrCodeId_ReturnsOkWithUserInfo()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var qrCodeId = "abc123";
        var userSearchResult = new UserSearchResult
        {
            Id = Guid.NewGuid(),
            DisplayName = "John Doe",
            AvatarUrl = "https://example.com/avatar.jpg",
            FriendshipStatus = "none"
        };
        SetupAuthenticatedUser(userId);

        _mockDiscoveryService.Setup(x => x.GetUserByQrCodeAsync(qrCodeId))
            .ReturnsAsync(userSearchResult);

        // Act
        var result = await _sut.GetUserByQrCode(qrCodeId);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<UserSearchResult>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.DisplayName.Should().Be("John Doe");
        apiResponse.Data.FriendshipStatus.Should().Be("none");
        _mockDiscoveryService.Verify(x => x.GetUserByQrCodeAsync(qrCodeId), Times.Once);
    }

    [Fact]
    public async Task GetUserByQrCode_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var qrCodeId = "abc123";
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetUserByQrCode(qrCodeId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var apiResponse = unauthorizedResult.Value.Should().BeOfType<ApiResponse<UserSearchResult>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("User is not authenticated.");
        _mockDiscoveryService.Verify(x => x.GetUserByQrCodeAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetUserByQrCode_WithEmptyQrCodeId_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        // Act
        var result = await _sut.GetUserByQrCode("");

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var apiResponse = badRequestResult.Value.Should().BeOfType<ApiResponse<UserSearchResult>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("QR code ID cannot be empty.");
        _mockDiscoveryService.Verify(x => x.GetUserByQrCodeAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetUserByQrCode_WithWhitespaceQrCodeId_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        // Act
        var result = await _sut.GetUserByQrCode("   ");

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var apiResponse = badRequestResult.Value.Should().BeOfType<ApiResponse<UserSearchResult>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("QR code ID cannot be empty.");
        _mockDiscoveryService.Verify(x => x.GetUserByQrCodeAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region GenerateInviteLink Tests

    [Fact]
    public async Task GenerateInviteLink_WithValidRequest_ReturnsOkWithInviteLink()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new GenerateInviteLinkRequest
        {
            ExpirationHours = 24,
            MaxUsages = 5
        };
        var response = new GenerateInviteLinkResponse
        {
            Code = "abc123xyz",
            DeepLink = "Stepper://invite/abc123xyz",
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            MaxUsages = 5
        };
        SetupAuthenticatedUser(userId);

        _mockDiscoveryService.Setup(x => x.GenerateInviteLinkAsync(userId, request))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.GenerateInviteLink(request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<GenerateInviteLinkResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.Code.Should().Be("abc123xyz");
        apiResponse.Data.DeepLink.Should().Be("Stepper://invite/abc123xyz");
        apiResponse.Data.MaxUsages.Should().Be(5);
        _mockDiscoveryService.Verify(x => x.GenerateInviteLinkAsync(userId, request), Times.Once);
    }

    [Fact]
    public async Task GenerateInviteLink_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var request = new GenerateInviteLinkRequest();
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GenerateInviteLink(request);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var apiResponse = unauthorizedResult.Value.Should().BeOfType<ApiResponse<GenerateInviteLinkResponse>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("User is not authenticated.");
        _mockDiscoveryService.Verify(x => x.GenerateInviteLinkAsync(It.IsAny<Guid>(), It.IsAny<GenerateInviteLinkRequest>()), Times.Never);
    }

    #endregion

    #region RedeemInviteCode Tests

    [Fact]
    public async Task RedeemInviteCode_WithValidCode_ReturnsOkWithSuccessMessage()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RedeemInviteCodeRequest
        {
            Code = "abc123xyz"
        };
        SetupAuthenticatedUser(userId);

        _mockDiscoveryService.Setup(x => x.RedeemInviteCodeAsync(userId, request.Code))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.RedeemInviteCode(request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        apiResponse.Success.Should().BeTrue();
        _mockDiscoveryService.Verify(x => x.RedeemInviteCodeAsync(userId, request.Code), Times.Once);
    }

    [Fact]
    public async Task RedeemInviteCode_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var request = new RedeemInviteCodeRequest
        {
            Code = "abc123xyz"
        };
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.RedeemInviteCode(request);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var apiResponse = unauthorizedResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("User is not authenticated.");
        _mockDiscoveryService.Verify(x => x.RedeemInviteCodeAsync(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
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

    #endregion
}
