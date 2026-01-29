using FluentAssertions;
using Stepper.Api.Common.Models;

namespace Stepper.UnitTests.Common.Models;

public class ApiResponseTests
{
    [Fact]
    public void SuccessResponse_WithData_CreatesSuccessfulResponse()
    {
        // Arrange
        var data = new { Name = "Test", Value = 42 };

        // Act
        var response = ApiResponse<object>.SuccessResponse(data);

        // Assert
        response.Success.Should().BeTrue();
        response.Data.Should().Be(data);
        response.Errors.Should().BeEmpty();
    }

    [Fact]
    public void SuccessResponse_WithNull_CreatesSuccessfulResponseWithNullData()
    {
        // Arrange & Act
        var response = ApiResponse<string?>.SuccessResponse(null);

        // Assert
        response.Success.Should().BeTrue();
        response.Data.Should().BeNull();
        response.Errors.Should().BeEmpty();
    }

    [Fact]
    public void ErrorResponse_WithSingleError_CreatesErrorResponse()
    {
        // Arrange
        var errorMessage = "Something went wrong";

        // Act
        var response = ApiResponse<object>.ErrorResponse(errorMessage);

        // Assert
        response.Success.Should().BeFalse();
        response.Data.Should().BeNull();
        response.Errors.Should().ContainSingle();
        response.Errors[0].Should().Be(errorMessage);
    }

    [Fact]
    public void ErrorResponse_WithMultipleErrors_CreatesErrorResponseWithAllErrors()
    {
        // Arrange
        var error1 = "Error 1";
        var error2 = "Error 2";
        var error3 = "Error 3";

        // Act
        var response = ApiResponse<object>.ErrorResponse(error1, error2, error3);

        // Assert
        response.Success.Should().BeFalse();
        response.Data.Should().BeNull();
        response.Errors.Should().HaveCount(3);
        response.Errors.Should().Contain(error1);
        response.Errors.Should().Contain(error2);
        response.Errors.Should().Contain(error3);
    }

    [Fact]
    public void ErrorResponse_WithNoErrors_CreatesErrorResponseWithEmptyErrors()
    {
        // Act
        var response = ApiResponse<object>.ErrorResponse();

        // Assert
        response.Success.Should().BeFalse();
        response.Data.Should().BeNull();
        response.Errors.Should().BeEmpty();
    }

    [Fact]
    public void ErrorResponse_WithEmptyString_CreatesErrorResponseWithEmptyString()
    {
        // Act
        var response = ApiResponse<object>.ErrorResponse("");

        // Assert
        response.Success.Should().BeFalse();
        response.Data.Should().BeNull();
        response.Errors.Should().ContainSingle();
        response.Errors[0].Should().BeEmpty();
    }

    [Fact]
    public void Constructor_InitializesWithDefaultValues()
    {
        // Act
        var response = new ApiResponse<string>();

        // Assert
        response.Success.Should().BeFalse(); // default(bool) is false
        response.Data.Should().BeNull();
        response.Errors.Should().NotBeNull();
        response.Errors.Should().BeEmpty();
    }

    [Fact]
    public void ApiResponse_CanBeUsedWithDifferentTypes()
    {
        // Arrange & Act
        var stringResponse = ApiResponse<string>.SuccessResponse("test");
        var intResponse = ApiResponse<int>.SuccessResponse(42);
        var objectResponse = ApiResponse<object>.SuccessResponse(new { Id = 1 });

        // Assert
        stringResponse.Data.Should().Be("test");
        intResponse.Data.Should().Be(42);
        objectResponse.Data.Should().NotBeNull();
    }

    [Fact]
    public void ErrorResponse_PreservesErrorOrder()
    {
        // Arrange
        var errors = new[] { "First", "Second", "Third", "Fourth" };

        // Act
        var response = ApiResponse<object>.ErrorResponse(errors);

        // Assert
        response.Errors.Should().ContainInOrder(errors);
    }

    [Fact]
    public void SuccessResponse_WithComplexType_StoresComplexType()
    {
        // Arrange
        var complexData = new
        {
            Id = Guid.NewGuid(),
            Name = "Test User",
            Email = "test@example.com",
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
            Tags = new[] { "tag1", "tag2" }
        };

        // Act
        var response = ApiResponse<object>.SuccessResponse(complexData);

        // Assert
        response.Success.Should().BeTrue();
        response.Data.Should().Be(complexData);
        response.Errors.Should().BeEmpty();
    }
}
