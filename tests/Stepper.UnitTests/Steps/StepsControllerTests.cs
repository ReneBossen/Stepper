using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Stepper.Api.Common.Models;
using Stepper.Api.Steps;
using Stepper.Api.Steps.DTOs;

namespace Stepper.UnitTests.Steps;

public class StepsControllerTests
{
    private readonly Mock<IStepService> _mockStepService;
    private readonly StepsController _sut;

    public StepsControllerTests()
    {
        _mockStepService = new Mock<IStepService>();
        _sut = new StepsController(_mockStepService.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullStepService_ThrowsArgumentNullException()
    {
        // Arrange & Act
        var act = () => new StepsController(null!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region RecordSteps Tests

    [Fact]
    public async Task RecordSteps_WithValidRequest_ReturnsCreatedWithEntry()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RecordStepsRequest
        {
            StepCount = 5000,
            DistanceMeters = 3500.5,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Source = "Apple Health"
        };
        var response = CreateTestStepEntryResponse(userId, request);
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.RecordStepsAsync(userId, request))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.RecordSteps(request);

        // Assert
        result.Should().NotBeNull();
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var apiResponse = createdResult.Value.Should().BeOfType<ApiResponse<StepEntryResponse>>().Subject;
        apiResponse.Success.Should().BeTrue();
        apiResponse.Data.Should().NotBeNull();
        apiResponse.Data!.StepCount.Should().Be(5000);
        apiResponse.Data.DistanceMeters.Should().Be(3500.5);
        _mockStepService.Verify(x => x.RecordStepsAsync(userId, request), Times.Once);
    }

    [Fact]
    public async Task RecordSteps_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var request = new RecordStepsRequest
        {
            StepCount = 5000,
            Date = DateOnly.FromDateTime(DateTime.UtcNow)
        };
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.RecordSteps(request);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<StepEntryResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockStepService.Verify(x => x.RecordStepsAsync(It.IsAny<Guid>(), It.IsAny<RecordStepsRequest>()), Times.Never);
    }

    [Fact]
    public async Task RecordSteps_WithNullRequest_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        // Act
        var result = await _sut.RecordSteps(null!);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<StepEntryResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Request body cannot be null.");
        _mockStepService.Verify(x => x.RecordStepsAsync(It.IsAny<Guid>(), It.IsAny<RecordStepsRequest>()), Times.Never);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(200001)]
    public async Task RecordSteps_WithInvalidStepCount_ReturnsBadRequest(int stepCount)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RecordStepsRequest
        {
            StepCount = stepCount,
            Date = DateOnly.FromDateTime(DateTime.UtcNow)
        };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.RecordStepsAsync(userId, request))
            .ThrowsAsync(new ArgumentException("Step count must be between 0 and 200000."));

        // Act
        var result = await _sut.RecordSteps(request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<StepEntryResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Step count must be between 0 and 200000.");
    }

    [Fact]
    public async Task RecordSteps_WithNegativeDistance_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RecordStepsRequest
        {
            StepCount = 5000,
            DistanceMeters = -100,
            Date = DateOnly.FromDateTime(DateTime.UtcNow)
        };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.RecordStepsAsync(userId, request))
            .ThrowsAsync(new ArgumentException("Distance must be a positive value."));

        // Act
        var result = await _sut.RecordSteps(request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<StepEntryResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Distance must be a positive value.");
    }

    [Fact]
    public async Task RecordSteps_WithFutureDate_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RecordStepsRequest
        {
            StepCount = 5000,
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1))
        };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.RecordStepsAsync(userId, request))
            .ThrowsAsync(new ArgumentException("Date cannot be in the future."));

        // Act
        var result = await _sut.RecordSteps(request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<StepEntryResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Date cannot be in the future.");
    }

    [Fact]
    public async Task RecordSteps_WhenServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new RecordStepsRequest
        {
            StepCount = 5000,
            Date = DateOnly.FromDateTime(DateTime.UtcNow)
        };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.RecordStepsAsync(userId, request))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _sut.RecordSteps(request);

        // Assert
        result.Should().NotBeNull();
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        var response = statusCodeResult.Value.Should().BeOfType<ApiResponse<StepEntryResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("An error occurred: Database connection failed");
    }

    #endregion

    #region GetToday Tests

    [Fact]
    public async Task GetToday_WithAuthenticatedUser_ReturnsOkWithSummary()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var summary = new DailyStepsResponse
        {
            Date = today,
            TotalSteps = 8000,
            TotalDistanceMeters = 5600.0
        };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.GetTodayAsync(userId))
            .ReturnsAsync(summary);

        // Act
        var result = await _sut.GetToday();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<DailyStepsResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.TotalSteps.Should().Be(8000);
        response.Data.TotalDistanceMeters.Should().Be(5600.0);
        _mockStepService.Verify(x => x.GetTodayAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetToday_WithNoStepsToday_ReturnsOkWithZeroValues()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var summary = new DailyStepsResponse
        {
            Date = today,
            TotalSteps = 0,
            TotalDistanceMeters = 0
        };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.GetTodayAsync(userId))
            .ReturnsAsync(summary);

        // Act
        var result = await _sut.GetToday();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<DailyStepsResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.TotalSteps.Should().Be(0);
        response.Data.TotalDistanceMeters.Should().Be(0);
    }

    [Fact]
    public async Task GetToday_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetToday();

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<DailyStepsResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockStepService.Verify(x => x.GetTodayAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetToday_WhenServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.GetTodayAsync(userId))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _sut.GetToday();

        // Assert
        result.Should().NotBeNull();
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        var response = statusCodeResult.Value.Should().BeOfType<ApiResponse<DailyStepsResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("An error occurred: Database connection failed");
    }

    #endregion

    #region GetDailyHistory Tests

    [Fact]
    public async Task GetDailyHistory_WithValidRange_ReturnsOkWithHistory()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var startDate = new DateOnly(2026, 1, 1);
        var endDate = new DateOnly(2026, 1, 7);
        var summaries = new List<DailyStepsResponse>
        {
            new() { Date = new DateOnly(2026, 1, 7), TotalSteps = 10000, TotalDistanceMeters = 7000 },
            new() { Date = new DateOnly(2026, 1, 6), TotalSteps = 8000, TotalDistanceMeters = 5600 }
        };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.GetDailyHistoryAsync(userId, It.Is<DateRange>(r =>
            r.StartDate == startDate && r.EndDate == endDate)))
            .ReturnsAsync(summaries);

        // Act
        var result = await _sut.GetDailyHistory(startDate, endDate);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<List<DailyStepsResponse>>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data.Should().HaveCount(2);
        response.Data![0].TotalSteps.Should().Be(10000);
        response.Data[1].TotalSteps.Should().Be(8000);
    }

    [Fact]
    public async Task GetDailyHistory_WithEmptyResult_ReturnsOkWithEmptyList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var startDate = new DateOnly(2026, 1, 1);
        var endDate = new DateOnly(2026, 1, 7);
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.GetDailyHistoryAsync(userId, It.IsAny<DateRange>()))
            .ReturnsAsync(new List<DailyStepsResponse>());

        // Act
        var result = await _sut.GetDailyHistory(startDate, endDate);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<List<DailyStepsResponse>>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data.Should().BeEmpty();
    }

    [Fact]
    public async Task GetDailyHistory_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var startDate = new DateOnly(2026, 1, 1);
        var endDate = new DateOnly(2026, 1, 7);
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetDailyHistory(startDate, endDate);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<List<DailyStepsResponse>>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockStepService.Verify(x => x.GetDailyHistoryAsync(It.IsAny<Guid>(), It.IsAny<DateRange>()), Times.Never);
    }

    [Fact]
    public async Task GetDailyHistory_WithInvalidDateRange_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var startDate = new DateOnly(2026, 1, 7);
        var endDate = new DateOnly(2026, 1, 1);
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.GetDailyHistoryAsync(userId, It.IsAny<DateRange>()))
            .ThrowsAsync(new ArgumentException("Start date must be before or equal to end date."));

        // Act
        var result = await _sut.GetDailyHistory(startDate, endDate);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<List<DailyStepsResponse>>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Start date must be before or equal to end date.");
    }

    [Fact]
    public async Task GetDailyHistory_WhenServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var startDate = new DateOnly(2026, 1, 1);
        var endDate = new DateOnly(2026, 1, 7);
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.GetDailyHistoryAsync(userId, It.IsAny<DateRange>()))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _sut.GetDailyHistory(startDate, endDate);

        // Assert
        result.Should().NotBeNull();
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        var response = statusCodeResult.Value.Should().BeOfType<ApiResponse<List<DailyStepsResponse>>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("An error occurred: Database connection failed");
    }

    #endregion

    #region GetHistory Tests

    [Fact]
    public async Task GetHistory_WithValidParameters_ReturnsOkWithPaginatedHistory()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var startDate = new DateOnly(2026, 1, 1);
        var endDate = new DateOnly(2026, 1, 7);
        var page = 1;
        var pageSize = 50;
        var historyResponse = new StepHistoryResponse
        {
            Items = new List<StepEntryResponse>
            {
                CreateTestStepEntryResponse(userId, 5000),
                CreateTestStepEntryResponse(userId, 3000)
            },
            TotalCount = 2,
            Page = page,
            PageSize = pageSize
        };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.GetDetailedHistoryAsync(userId, It.Is<DateRange>(r =>
            r.StartDate == startDate && r.EndDate == endDate), page, pageSize))
            .ReturnsAsync(historyResponse);

        // Act
        var result = await _sut.GetHistory(startDate, endDate, page, pageSize);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<StepHistoryResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.Items.Should().HaveCount(2);
        response.Data.TotalCount.Should().Be(2);
        response.Data.Page.Should().Be(1);
        response.Data.PageSize.Should().Be(50);
    }

    [Fact]
    public async Task GetHistory_WithDefaultPagination_UsesDefaultValues()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var startDate = new DateOnly(2026, 1, 1);
        var endDate = new DateOnly(2026, 1, 7);
        var historyResponse = new StepHistoryResponse
        {
            Items = new List<StepEntryResponse>(),
            TotalCount = 0,
            Page = 1,
            PageSize = 50
        };
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.GetDetailedHistoryAsync(userId, It.IsAny<DateRange>(), 1, 50))
            .ReturnsAsync(historyResponse);

        // Act
        var result = await _sut.GetHistory(startDate, endDate);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<StepHistoryResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.Page.Should().Be(1);
        response.Data.PageSize.Should().Be(50);
        _mockStepService.Verify(x => x.GetDetailedHistoryAsync(userId, It.IsAny<DateRange>(), 1, 50), Times.Once);
    }

    [Fact]
    public async Task GetHistory_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var startDate = new DateOnly(2026, 1, 1);
        var endDate = new DateOnly(2026, 1, 7);
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetHistory(startDate, endDate);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<StepHistoryResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockStepService.Verify(x => x.GetDetailedHistoryAsync(It.IsAny<Guid>(), It.IsAny<DateRange>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task GetHistory_WithInvalidPage_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var startDate = new DateOnly(2026, 1, 1);
        var endDate = new DateOnly(2026, 1, 7);
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.GetDetailedHistoryAsync(userId, It.IsAny<DateRange>(), 0, 50))
            .ThrowsAsync(new ArgumentException("Page number must be greater than 0."));

        // Act
        var result = await _sut.GetHistory(startDate, endDate, 0, 50);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<StepHistoryResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Page number must be greater than 0.");
    }

    [Fact]
    public async Task GetHistory_WhenServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var startDate = new DateOnly(2026, 1, 1);
        var endDate = new DateOnly(2026, 1, 7);
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.GetDetailedHistoryAsync(userId, It.IsAny<DateRange>(), It.IsAny<int>(), It.IsAny<int>()))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _sut.GetHistory(startDate, endDate);

        // Assert
        result.Should().NotBeNull();
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        var response = statusCodeResult.Value.Should().BeOfType<ApiResponse<StepHistoryResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("An error occurred: Database connection failed");
    }

    #endregion

    #region GetEntry Tests

    [Fact]
    public async Task GetEntry_WithValidId_ReturnsOkWithEntry()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entryId = Guid.NewGuid();
        var entry = CreateTestStepEntryResponse(userId, 5000, entryId);
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.GetEntryAsync(userId, entryId))
            .ReturnsAsync(entry);

        // Act
        var result = await _sut.GetEntry(entryId);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<StepEntryResponse>>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.Id.Should().Be(entryId);
        response.Data.StepCount.Should().Be(5000);
        _mockStepService.Verify(x => x.GetEntryAsync(userId, entryId), Times.Once);
    }

    [Fact]
    public async Task GetEntry_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var entryId = Guid.NewGuid();
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetEntry(entryId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<StepEntryResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockStepService.Verify(x => x.GetEntryAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetEntry_WithEmptyGuid_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        // Act
        var result = await _sut.GetEntry(Guid.Empty);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<StepEntryResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Entry ID cannot be empty.");
        _mockStepService.Verify(x => x.GetEntryAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetEntry_WithNonExistentEntry_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entryId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.GetEntryAsync(userId, entryId))
            .ThrowsAsync(new KeyNotFoundException($"Step entry not found with ID: {entryId}"));

        // Act
        var result = await _sut.GetEntry(entryId);

        // Assert
        result.Should().NotBeNull();
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<ApiResponse<StepEntryResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain($"Step entry not found with ID: {entryId}");
    }

    [Fact]
    public async Task GetEntry_WithUnauthorizedAccess_ReturnsForbid()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entryId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.GetEntryAsync(userId, entryId))
            .ThrowsAsync(new UnauthorizedAccessException("You do not have permission to access this step entry."));

        // Act
        var result = await _sut.GetEntry(entryId);

        // Assert
        result.Should().NotBeNull();
        result.Result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task GetEntry_WhenServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entryId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.GetEntryAsync(userId, entryId))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _sut.GetEntry(entryId);

        // Assert
        result.Should().NotBeNull();
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        var response = statusCodeResult.Value.Should().BeOfType<ApiResponse<StepEntryResponse>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("An error occurred: Database connection failed");
    }

    #endregion

    #region DeleteEntry Tests

    [Fact]
    public async Task DeleteEntry_WithValidId_ReturnsNoContent()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entryId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.DeleteEntryAsync(userId, entryId))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.DeleteEntry(entryId);

        // Assert
        result.Should().NotBeNull();
        result.Result.Should().BeOfType<NoContentResult>();
        _mockStepService.Verify(x => x.DeleteEntryAsync(userId, entryId), Times.Once);
    }

    [Fact]
    public async Task DeleteEntry_WithUnauthenticatedUser_ReturnsUnauthorized()
    {
        // Arrange
        var entryId = Guid.NewGuid();
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.DeleteEntry(entryId);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        var response = unauthorizedResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("User is not authenticated.");
        _mockStepService.Verify(x => x.DeleteEntryAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task DeleteEntry_WithEmptyGuid_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        // Act
        var result = await _sut.DeleteEntry(Guid.Empty);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Entry ID cannot be empty.");
        _mockStepService.Verify(x => x.DeleteEntryAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task DeleteEntry_WithNonExistentEntry_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entryId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.DeleteEntryAsync(userId, entryId))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.DeleteEntry(entryId);

        // Assert
        result.Should().NotBeNull();
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Step entry not found.");
    }

    [Fact]
    public async Task DeleteEntry_WithUnauthorizedAccess_ReturnsForbid()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entryId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.DeleteEntryAsync(userId, entryId))
            .ThrowsAsync(new UnauthorizedAccessException("You do not have permission to delete this step entry."));

        // Act
        var result = await _sut.DeleteEntry(entryId);

        // Assert
        result.Should().NotBeNull();
        result.Result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task DeleteEntry_WhenServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entryId = Guid.NewGuid();
        SetupAuthenticatedUser(userId);

        _mockStepService.Setup(x => x.DeleteEntryAsync(userId, entryId))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _sut.DeleteEntry(entryId);

        // Assert
        result.Should().NotBeNull();
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        var response = statusCodeResult.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("An error occurred: Database connection failed");
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

    private static StepEntryResponse CreateTestStepEntryResponse(Guid userId, RecordStepsRequest request)
    {
        return new StepEntryResponse
        {
            Id = Guid.NewGuid(),
            StepCount = request.StepCount,
            DistanceMeters = request.DistanceMeters,
            Date = request.Date,
            RecordedAt = DateTime.UtcNow,
            Source = request.Source
        };
    }

    private static StepEntryResponse CreateTestStepEntryResponse(Guid userId, int stepCount, Guid? entryId = null)
    {
        return new StepEntryResponse
        {
            Id = entryId ?? Guid.NewGuid(),
            StepCount = stepCount,
            DistanceMeters = stepCount * 0.7,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            RecordedAt = DateTime.UtcNow,
            Source = "Test"
        };
    }

    #endregion
}
