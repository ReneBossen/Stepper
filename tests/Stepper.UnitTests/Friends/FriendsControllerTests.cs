using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Stepper.Api.Common.Models;
using Stepper.Api.Friends;
using Stepper.Api.Friends.DTOs;

namespace Stepper.UnitTests.Friends;

public class FriendsControllerTests
{
    private readonly Mock<IFriendService> _mockFriendService;
    private readonly FriendsController _sut;

    public FriendsControllerTests()
    {
        _mockFriendService = new Mock<IFriendService>();
        _sut = new FriendsController(_mockFriendService.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullFriendService_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new FriendsController(null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region SendFriendRequest Tests

    [Fact]
    public async Task SendFriendRequest_WithValidRequest_ReturnsOkWithFriendRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendUserId = Guid.NewGuid();
        var request = new SendFriendRequestRequest { FriendUserId = friendUserId };
        var response = CreateTestFriendRequestResponse(userId, friendUserId);
        SetupAuthenticatedUser(userId);

        _mockFriendService.Setup(x => x.SendFriendRequestAsync(userId, request))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.SendFriendRequest(request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<FriendRequestResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.Id.Should().Be(response.Id);
        apiResponse.Data.RequesterId.Should().Be(userId);
        _mockFriendService.Verify(x => x.SendFriendRequestAsync(userId, request), Times.Once);
    }

    [Fact]
    public async Task SendFriendRequest_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var request = new SendFriendRequestRequest { FriendUserId = Guid.NewGuid() };
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.SendFriendRequest(request);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var apiResponse = unauthorizedResult.Value.Should().BeOfType<ApiResponse<FriendRequestResponse>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("User is not authenticated.");
        _mockFriendService.Verify(x => x.SendFriendRequestAsync(It.IsAny<Guid>(), It.IsAny<SendFriendRequestRequest>()), Times.Never);
    }

    #endregion

    #region GetPendingRequests Tests

    [Fact]
    public async Task GetPendingRequests_WithAuthenticatedUser_ReturnsOkWithPendingRequests()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var pendingRequests = new List<FriendRequestResponse>
        {
            CreateTestFriendRequestResponse(Guid.NewGuid(), userId),
            CreateTestFriendRequestResponse(Guid.NewGuid(), userId)
        };
        SetupAuthenticatedUser(userId);

        _mockFriendService.Setup(x => x.GetPendingRequestsAsync(userId))
            .ReturnsAsync(pendingRequests);

        // Act
        var result = await _sut.GetPendingRequests();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<List<FriendRequestResponse>>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data.Should().HaveCount(2);
        _mockFriendService.Verify(x => x.GetPendingRequestsAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetPendingRequests_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetPendingRequests();

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var apiResponse = unauthorizedResult.Value.Should().BeOfType<ApiResponse<List<FriendRequestResponse>>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("User is not authenticated.");
        _mockFriendService.Verify(x => x.GetPendingRequestsAsync(It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region GetSentRequests Tests

    [Fact]
    public async Task GetSentRequests_WithAuthenticatedUser_ReturnsOkWithSentRequests()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var sentRequests = new List<FriendRequestResponse>
        {
            CreateTestFriendRequestResponse(userId, Guid.NewGuid()),
            CreateTestFriendRequestResponse(userId, Guid.NewGuid())
        };
        SetupAuthenticatedUser(userId);

        _mockFriendService.Setup(x => x.GetSentRequestsAsync(userId))
            .ReturnsAsync(sentRequests);

        // Act
        var result = await _sut.GetSentRequests();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<List<FriendRequestResponse>>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data.Should().HaveCount(2);
        _mockFriendService.Verify(x => x.GetSentRequestsAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetSentRequests_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetSentRequests();

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var apiResponse = unauthorizedResult.Value.Should().BeOfType<ApiResponse<List<FriendRequestResponse>>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("User is not authenticated.");
        _mockFriendService.Verify(x => x.GetSentRequestsAsync(It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region AcceptRequest Tests

    [Fact]
    public async Task AcceptRequest_WithValidRequest_ReturnsOkWithAcceptedRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var requestId = Guid.NewGuid();
        var response = CreateTestFriendRequestResponse(Guid.NewGuid(), userId, "accepted");
        SetupAuthenticatedUser(userId);

        _mockFriendService.Setup(x => x.AcceptRequestAsync(userId, requestId))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.AcceptRequest(requestId);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<FriendRequestResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.Status.Should().Be("accepted");
        _mockFriendService.Verify(x => x.AcceptRequestAsync(userId, requestId), Times.Once);
    }

    [Fact]
    public async Task AcceptRequest_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var requestId = Guid.NewGuid();
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.AcceptRequest(requestId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var apiResponse = unauthorizedResult.Value.Should().BeOfType<ApiResponse<FriendRequestResponse>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("User is not authenticated.");
        _mockFriendService.Verify(x => x.AcceptRequestAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region RejectRequest Tests

    [Fact]
    public async Task RejectRequest_WithValidRequest_ReturnsOkWithRejectedRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var requestId = Guid.NewGuid();
        var response = CreateTestFriendRequestResponse(Guid.NewGuid(), userId, "rejected");
        SetupAuthenticatedUser(userId);

        _mockFriendService.Setup(x => x.RejectRequestAsync(userId, requestId))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.RejectRequest(requestId);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<FriendRequestResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.Status.Should().Be("rejected");
        _mockFriendService.Verify(x => x.RejectRequestAsync(userId, requestId), Times.Once);
    }

    [Fact]
    public async Task RejectRequest_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var requestId = Guid.NewGuid();
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.RejectRequest(requestId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var apiResponse = unauthorizedResult.Value.Should().BeOfType<ApiResponse<FriendRequestResponse>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("User is not authenticated.");
        _mockFriendService.Verify(x => x.RejectRequestAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region CancelRequest Tests

    [Fact]
    public async Task CancelRequest_WithValidRequest_ReturnsNoContent()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var requestId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockFriendService.Setup(x => x.CancelRequestAsync(userId, requestId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.CancelRequest(requestId);

        // Assert
        result.Should().NotBeNull();
        result.Result.Should().BeOfType<NoContentResult>();
        _mockFriendService.Verify(x => x.CancelRequestAsync(userId, requestId), Times.Once);
    }

    [Fact]
    public async Task CancelRequest_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var requestId = Guid.NewGuid();
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.CancelRequest(requestId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var apiResponse = unauthorizedResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("User is not authenticated.");
        _mockFriendService.Verify(x => x.CancelRequestAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region GetFriends Tests

    [Fact]
    public async Task GetFriends_WithAuthenticatedUser_ReturnsOkWithFriendsList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendListResponse = new FriendListResponse
        {
            Friends = new List<FriendResponse>
            {
                new FriendResponse { UserId = Guid.NewGuid(), DisplayName = "Friend 1" },
                new FriendResponse { UserId = Guid.NewGuid(), DisplayName = "Friend 2" }
            },
            TotalCount = 2
        };
        SetupAuthenticatedUser(userId);

        _mockFriendService.Setup(x => x.GetFriendsAsync(userId))
            .ReturnsAsync(friendListResponse);

        // Act
        var result = await _sut.GetFriends();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<FriendListResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.Friends.Should().HaveCount(2);
        apiResponse.Data.TotalCount.Should().Be(2);
        _mockFriendService.Verify(x => x.GetFriendsAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetFriends_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetFriends();

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var apiResponse = unauthorizedResult.Value.Should().BeOfType<ApiResponse<FriendListResponse>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("User is not authenticated.");
        _mockFriendService.Verify(x => x.GetFriendsAsync(It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region GetFriend Tests

    [Fact]
    public async Task GetFriend_WithValidFriendId_ReturnsOkWithFriendProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();
        var friendResponse = new FriendResponse
        {
            UserId = friendId,
            DisplayName = "Friend User",
            AvatarUrl = "https://example.com/avatar.jpg",
            FriendsSince = DateTime.UtcNow.AddDays(-30)
        };
        SetupAuthenticatedUser(userId);

        _mockFriendService.Setup(x => x.GetFriendAsync(userId, friendId))
            .ReturnsAsync(friendResponse);

        // Act
        var result = await _sut.GetFriend(friendId);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<FriendResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.UserId.Should().Be(friendId);
        apiResponse.Data.DisplayName.Should().Be("Friend User");
        _mockFriendService.Verify(x => x.GetFriendAsync(userId, friendId), Times.Once);
    }

    [Fact]
    public async Task GetFriend_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var friendId = Guid.NewGuid();
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetFriend(friendId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var apiResponse = unauthorizedResult.Value.Should().BeOfType<ApiResponse<FriendResponse>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("User is not authenticated.");
        _mockFriendService.Verify(x => x.GetFriendAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    #endregion

    #region RemoveFriend Tests

    [Fact]
    public async Task RemoveFriend_WithValidFriendId_ReturnsNoContent()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var friendId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockFriendService.Setup(x => x.RemoveFriendAsync(userId, friendId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.RemoveFriend(friendId);

        // Assert
        result.Should().NotBeNull();
        result.Result.Should().BeOfType<NoContentResult>();
        _mockFriendService.Verify(x => x.RemoveFriendAsync(userId, friendId), Times.Once);
    }

    [Fact]
    public async Task RemoveFriend_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var friendId = Guid.NewGuid();
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.RemoveFriend(friendId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var apiResponse = unauthorizedResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        apiResponse.Success.Should().BeFalse();
        apiResponse.Errors.Should().Contain("User is not authenticated.");
        _mockFriendService.Verify(x => x.RemoveFriendAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
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

    private static FriendRequestResponse CreateTestFriendRequestResponse(Guid requesterId, Guid addresseeId, string status = "pending")
    {
        return new FriendRequestResponse
        {
            Id = Guid.NewGuid(),
            RequesterId = requesterId,
            RequesterDisplayName = "Test User",
            RequesterAvatarUrl = "https://example.com/avatar.jpg",
            Status = status,
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };
    }

    #endregion
}
