using System.Net;
using System.Text.Json;
using Stepper.Api.Common.Models;
using Supabase.Gotrue.Exceptions;
using Supabase.Postgrest.Exceptions;

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
            GotrueException => (HttpStatusCode.BadGateway, "An authentication service error occurred."),
            PostgrestException => (HttpStatusCode.BadGateway, "A database error occurred."),
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred.")
        };
    }

    private void LogException(Exception exception, HttpStatusCode statusCode)
    {
        var message = GetDetailedMessage(exception);

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "An unhandled exception occurred: {Message}", message);
            return;
        }

        _logger.LogWarning("Handled exception ({StatusCode}): {Message}", (int)statusCode, message);
    }

    private static string GetDetailedMessage(Exception exception)
    {
        if (exception is PostgrestException postgrestEx)
        {
            var parts = new[] { postgrestEx.Message, postgrestEx.Content?.ToString() }
                .Where(s => !string.IsNullOrWhiteSpace(s));
            var detail = string.Join(" | ", parts);
            return string.IsNullOrEmpty(detail)
                ? $"PostgrestException (StatusCode: {postgrestEx.StatusCode})"
                : detail;
        }

        if (exception is GotrueException gotrueEx)
        {
            var parts = new[] { gotrueEx.Message, gotrueEx.Content?.ToString() }
                .Where(s => !string.IsNullOrWhiteSpace(s));
            var detail = string.Join(" | ", parts);
            return string.IsNullOrEmpty(detail)
                ? $"GotrueException (Reason: {gotrueEx.Reason}, StatusCode: {gotrueEx.StatusCode})"
                : $"{detail} (Reason: {gotrueEx.Reason})";
        }

        return exception.Message;
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
