using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Stepper.Api.Common.Models;
using Stepper.Api.Steps;
using Stepper.Api.Steps.DTOs;

namespace Stepper.UnitTests.Steps;

public class StepsControllerSyncTests
{
    private readonly Mock<IStepService> _mockStepService;
    private readonly StepsController _sut;

    public StepsControllerSyncTests()
    {
        _mockStepService = new Mock<IStepService>();
        _sut = new StepsController(_mockStepService.Object);
    }

    #region SyncSteps Tests

    [Fact]
    public async Task SyncSteps_WithValidRequest_ReturnsOkWithResponse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = today, StepCount = 5000, DistanceMeters = 3500, Source = "HealthKit" },
                new() { Date = today.AddDays(-1), StepCount = 8000, DistanceMeters = 5600, Source = "HealthKit" }
            }
        };
        var response = new SyncStepsResponse { Created = 2, Updated = 0, Total = 2 };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.SyncStepsAsync(userId, request))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.SyncSteps(request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<SyncStepsResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.Created.Should().Be(2);
        apiResponse.Data.Updated.Should().Be(0);
        apiResponse.Data.Total.Should().Be(2);
        _mockStepService.Verify(x => x.SyncStepsAsync(userId, request), Times.Once);
    }

    [Fact]
    public async Task SyncSteps_WithMixedCreateUpdate_ReturnsOkWithMixedCounts()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = today, StepCount = 5000, Source = "HealthKit" },
                new() { Date = today.AddDays(-1), StepCount = 8000, Source = "HealthKit" },
                new() { Date = today.AddDays(-2), StepCount = 10000, Source = "HealthKit" }
            }
        };
        var response = new SyncStepsResponse { Created = 2, Updated = 1, Total = 3 };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.SyncStepsAsync(userId, request))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.SyncSteps(request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<SyncStepsResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data!.Created.Should().Be(2);
        apiResponse.Data.Updated.Should().Be(1);
        apiResponse.Data.Total.Should().Be(3);
    }

    [Fact]
    public async Task SyncSteps_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = DateOnly.FromDateTime(DateTime.UtcNow), StepCount = 5000, Source = "HealthKit" }
            }
        };
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.SyncSteps(request);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<SyncStepsResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockStepService.Verify(x => x.SyncStepsAsync(It.IsAny<Guid>(), It.IsAny<SyncStepsRequest>()), Times.Never);
    }

    [Fact]
    public async Task SyncSteps_WithNullRequest_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        // Act
        var result = await _sut.SyncSteps(null!);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<SyncStepsResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Request body cannot be null.");
        _mockStepService.Verify(x => x.SyncStepsAsync(It.IsAny<Guid>(), It.IsAny<SyncStepsRequest>()), Times.Never);
    }

    [Fact]
    public async Task SyncSteps_WithEmptyEntriesList_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new SyncStepsRequest { Entries = new List<SyncStepEntry>() };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.SyncStepsAsync(userId, request))
            .ThrowsAsync(new ArgumentException("At least one entry is required."));

        // Act
        var result = await _sut.SyncSteps(request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<SyncStepsResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("At least one entry is required.");
    }

    [Fact]
    public async Task SyncSteps_WithTooManyEntries_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entries = Enumerable.Range(0, 32)
            .Select(i => new SyncStepEntry
            {
                Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-i)),
                StepCount = 5000,
                Source = "HealthKit"
            })
            .ToList();
        var request = new SyncStepsRequest { Entries = entries };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.SyncStepsAsync(userId, request))
            .ThrowsAsync(new ArgumentException("Maximum 31 entries allowed per sync."));

        // Act
        var result = await _sut.SyncSteps(request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<SyncStepsResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Maximum 31 entries allowed per sync.");
    }

    [Fact]
    public async Task SyncSteps_WithFutureDate_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)), StepCount = 5000, Source = "HealthKit" }
            }
        };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.SyncStepsAsync(userId, request))
            .ThrowsAsync(new ArgumentException("Date cannot be in the future."));

        // Act
        var result = await _sut.SyncSteps(request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<SyncStepsResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Date cannot be in the future.");
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(200001)]
    public async Task SyncSteps_WithInvalidStepCount_ReturnsBadRequest(int stepCount)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = DateOnly.FromDateTime(DateTime.UtcNow), StepCount = stepCount, Source = "HealthKit" }
            }
        };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.SyncStepsAsync(userId, request))
            .ThrowsAsync(new ArgumentException("Step count must be between 0 and 200000."));

        // Act
        var result = await _sut.SyncSteps(request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<SyncStepsResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Step count must be between 0 and 200000.");
    }

    [Fact]
    public async Task SyncSteps_WithNegativeDistance_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = DateOnly.FromDateTime(DateTime.UtcNow), StepCount = 5000, DistanceMeters = -100, Source = "HealthKit" }
            }
        };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.SyncStepsAsync(userId, request))
            .ThrowsAsync(new ArgumentException("Distance must be a positive value."));

        // Act
        var result = await _sut.SyncSteps(request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<SyncStepsResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Distance must be a positive value.");
    }

    [Fact]
    public async Task SyncSteps_WhenServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new SyncStepsRequest
        {
            Entries = new List<SyncStepEntry>
            {
                new() { Date = DateOnly.FromDateTime(DateTime.UtcNow), StepCount = 5000, Source = "HealthKit" }
            }
        };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.SyncStepsAsync(userId, request))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _sut.SyncSteps(request);

        // Assert
        result.Should().NotBeNull();
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        var response = statusCodeResult.Value.Should().BeOfType<ApiResponse<SyncStepsResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("An error occurred: Database connection failed");
    }

    #endregion

    #region DeleteBySource Tests

    [Fact]
    public async Task DeleteBySource_WithValidSource_ReturnsOkWithCount()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var source = "HealthKit";
        var response = new DeleteBySourceResponse { DeletedCount = 5 };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.DeleteBySourceAsync(userId, source))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.DeleteBySource(source);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<DeleteBySourceResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.DeletedCount.Should().Be(5);
        _mockStepService.Verify(x => x.DeleteBySourceAsync(userId, source), Times.Once);
    }

    [Fact]
    public async Task DeleteBySource_WithNoMatchingEntries_ReturnsOkWithZeroCount()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var source = "NonExistentSource";
        var response = new DeleteBySourceResponse { DeletedCount = 0 };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.DeleteBySourceAsync(userId, source))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.DeleteBySource(source);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<DeleteBySourceResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data!.DeletedCount.Should().Be(0);
    }

    [Fact]
    public async Task DeleteBySource_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var source = "HealthKit";
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.DeleteBySource(source);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<DeleteBySourceResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockStepService.Verify(x => x.DeleteBySourceAsync(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task DeleteBySource_WithEmptySource_ReturnsBadRequest(string? source)
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        // Act
        var result = await _sut.DeleteBySource(source!);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<DeleteBySourceResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Source cannot be empty.");
        _mockStepService.Verify(x => x.DeleteBySourceAsync(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task DeleteBySource_WithServiceArgumentException_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var source = "HealthKit";
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.DeleteBySourceAsync(userId, source))
            .ThrowsAsync(new ArgumentException("Source cannot be empty."));

        // Act
        var result = await _sut.DeleteBySource(source);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<DeleteBySourceResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Source cannot be empty.");
    }

    [Fact]
    public async Task DeleteBySource_WhenServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var source = "HealthKit";
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.DeleteBySourceAsync(userId, source))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _sut.DeleteBySource(source);

        // Assert
        result.Should().NotBeNull();
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        var response = statusCodeResult.Value.Should().BeOfType<ApiResponse<DeleteBySourceResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("An error occurred: Database connection failed");
    }

    [Fact]
    public async Task DeleteBySource_WithSpecialCharactersInSource_ReturnsOk()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var source = "Apple Health/HealthKit-v2.0";
        var response = new DeleteBySourceResponse { DeletedCount = 3 };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.DeleteBySourceAsync(userId, source))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.DeleteBySource(source);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<DeleteBySourceResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data!.DeletedCount.Should().Be(3);
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
