using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using WalkingApp.Api.Common.Middleware;
using WalkingApp.Api.Common.Models;

namespace WalkingApp.UnitTests.Common.Middleware;

public class ExceptionHandlingMiddlewareTests
{
    private readonly Mock<ILogger<ExceptionHandlingMiddleware>> _loggerMock;

    public ExceptionHandlingMiddlewareTests()
    {
        _loggerMock = new Mock<ILogger<ExceptionHandlingMiddleware>>();
    }

    [Fact]
    public async Task InvokeAsync_WithNoException_CallsNextMiddleware()
    {
        // Arrange
        var nextCalled = false;
        RequestDelegate next = (HttpContext ctx) =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        };

        var middleware = new ExceptionHandlingMiddleware(next, _loggerMock.Object);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        nextCalled.Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_WithUnauthorizedAccessException_Returns401()
    {
        // Arrange
        RequestDelegate next = (HttpContext ctx) =>
        {
            throw new UnauthorizedAccessException("Test unauthorized");
        };

        var middleware = new ExceptionHandlingMiddleware(next, _loggerMock.Object);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.Unauthorized);
        context.Response.ContentType.Should().Be("application/json");

        var response = await GetResponseBody<ApiResponse<object>>(context);
        response.Should().NotBeNull();
        response!.Success.Should().BeFalse();
        response.Errors.Should().Contain("Unauthorized access.");
    }

    [Fact]
    public async Task InvokeAsync_WithArgumentException_Returns400()
    {
        // Arrange
        var errorMessage = "Invalid argument provided";
        RequestDelegate next = (HttpContext ctx) =>
        {
            throw new ArgumentException(errorMessage);
        };

        var middleware = new ExceptionHandlingMiddleware(next, _loggerMock.Object);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.BadRequest);
        context.Response.ContentType.Should().Be("application/json");

        var response = await GetResponseBody<ApiResponse<object>>(context);
        response.Should().NotBeNull();
        response!.Success.Should().BeFalse();
        response.Errors.Should().Contain(errorMessage);
    }

    [Fact]
    public async Task InvokeAsync_WithInvalidOperationException_Returns400()
    {
        // Arrange
        var errorMessage = "Invalid operation";
        RequestDelegate next = (HttpContext ctx) =>
        {
            throw new InvalidOperationException(errorMessage);
        };

        var middleware = new ExceptionHandlingMiddleware(next, _loggerMock.Object);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.BadRequest);
        context.Response.ContentType.Should().Be("application/json");

        var response = await GetResponseBody<ApiResponse<object>>(context);
        response.Should().NotBeNull();
        response!.Success.Should().BeFalse();
        response.Errors.Should().Contain(errorMessage);
    }

    [Fact]
    public async Task InvokeAsync_WithHttpRequestException_Returns502()
    {
        // Arrange
        RequestDelegate next = (HttpContext ctx) =>
        {
            throw new HttpRequestException("Database connection failed");
        };

        var middleware = new ExceptionHandlingMiddleware(next, _loggerMock.Object);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.BadGateway);
        context.Response.ContentType.Should().Be("application/json");

        var response = await GetResponseBody<ApiResponse<object>>(context);
        response.Should().NotBeNull();
        response!.Success.Should().BeFalse();
        response.Errors.Should().Contain("An external service error occurred.");
    }

    [Fact]
    public async Task InvokeAsync_WithUnhandledException_Returns500()
    {
        // Arrange
        RequestDelegate next = (HttpContext ctx) =>
        {
            throw new Exception("Unexpected error");
        };

        var middleware = new ExceptionHandlingMiddleware(next, _loggerMock.Object);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.InternalServerError);
        context.Response.ContentType.Should().Be("application/json");

        var response = await GetResponseBody<ApiResponse<object>>(context);
        response.Should().NotBeNull();
        response!.Success.Should().BeFalse();
        response.Errors.Should().Contain("An unexpected error occurred.");
    }

    [Fact]
    public async Task InvokeAsync_WithException_LogsError()
    {
        // Arrange
        var errorMessage = "Test error";
        RequestDelegate next = (HttpContext ctx) =>
        {
            throw new Exception(errorMessage);
        };

        var middleware = new ExceptionHandlingMiddleware(next, _loggerMock.Object);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("An unhandled exception occurred")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WithException_ReturnsJsonResponse()
    {
        // Arrange
        RequestDelegate next = (HttpContext ctx) =>
        {
            throw new Exception("Test error");
        };

        var middleware = new ExceptionHandlingMiddleware(next, _loggerMock.Object);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseBody = await reader.ReadToEndAsync();

        responseBody.Should().NotBeNullOrEmpty();
        var response = JsonSerializer.Deserialize<ApiResponse<object>>(
            responseBody,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        response.Should().NotBeNull();
        response!.Success.Should().BeFalse();
        response.Data.Should().BeNull();
        response.Errors.Should().NotBeEmpty();
    }

    [Fact]
    public async Task InvokeAsync_WithException_ResponseUsesCamelCase()
    {
        // Arrange
        RequestDelegate next = (HttpContext ctx) =>
        {
            throw new Exception("Test error");
        };

        var middleware = new ExceptionHandlingMiddleware(next, _loggerMock.Object);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseBody = await reader.ReadToEndAsync();

        responseBody.Should().Contain("\"success\":");
        responseBody.Should().Contain("\"data\":");
        responseBody.Should().Contain("\"errors\":");
    }

    private static async Task<T?> GetResponseBody<T>(HttpContext context)
    {
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseBody = await reader.ReadToEndAsync();

        return JsonSerializer.Deserialize<T>(
            responseBody,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    }
}
