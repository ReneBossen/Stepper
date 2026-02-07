using System.Net;
using System.Text.Json;
using Stepper.Api.Common.Models;

namespace Stepper.Api.Common.Middleware;

/// <summary>
/// Global exception handling middleware to catch unhandled exceptions and return standardized error responses.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var (statusCode, message) = MapException(ex);
            LogException(ex, statusCode);
            await WriteErrorResponse(context, statusCode, message);
        }
    }

    private static (HttpStatusCode StatusCode, string Message) MapException(Exception exception)
    {
        return exception switch
        {
            KeyNotFoundException => (HttpStatusCode.NotFound, exception.Message),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "Unauthorized access."),
            ArgumentException => (HttpStatusCode.BadRequest, exception.Message),
            InvalidOperationException => (HttpStatusCode.BadRequest, exception.Message),
            HttpRequestException => (HttpStatusCode.BadGateway, "An external service error occurred."),
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred.")
        };
    }

    private void LogException(Exception exception, HttpStatusCode statusCode)
    {
        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "An unhandled exception occurred: {Message}", exception.Message);
            return;
        }

        _logger.LogWarning("Handled exception ({StatusCode}): {Message}", (int)statusCode, exception.Message);
    }

    private static async Task WriteErrorResponse(HttpContext context, HttpStatusCode statusCode, string message)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var response = ApiResponse<object>.ErrorResponse(message);
        var jsonResponse = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(jsonResponse);
    }
}
