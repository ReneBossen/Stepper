using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.RateLimiting;
using Stepper.Api.Common.Authentication;
using Stepper.Api.Common.Extensions;
using Stepper.Api.Common.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Ensure consistent JSON serialization with camelCase property names
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        // Write indented JSON for better debugging
        options.JsonSerializerOptions.WriteIndented = false;
    });

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Add HTTP context accessor for accessing user context in repositories
builder.Services.AddHttpContextAccessor();

// Add Supabase services
builder.Services.AddSupabaseServices(builder.Configuration);

// Configure authentication with Supabase JWT handler
builder.Services.AddAuthentication(SupabaseAuthDefaults.AuthenticationScheme)
    .AddScheme<AuthenticationSchemeOptions, SupabaseAuthHandler>(
        SupabaseAuthDefaults.AuthenticationScheme, null);

// Add authorization services
builder.Services.AddAuthorization();

// Add rate limiting
builder.Services.AddRateLimiter(options =>
{
    // Global rate limit: 100 requests per minute per IP
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Stricter limit for auth endpoints: 10 requests per minute per IP
    options.AddFixedWindowLimiter("auth", limiterOptions =>
    {
        limiterOptions.PermitLimit = 10;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueLimit = 0;
    });

    // Return 429 Too Many Requests
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Add user services
builder.Services.AddUserServices();

// Add step services
builder.Services.AddStepServices();

// Add friend services
builder.Services.AddFriendServices();

// Add group services
builder.Services.AddGroupServices();

// Add auth services
builder.Services.AddAuthServices();

// Add activity services
builder.Services.AddActivityServices();

// Add notification services
builder.Services.AddNotificationServices();

// Add health checks
builder.Services.AddHealthChecks();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Add global exception handling middleware (first in pipeline)
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseRateLimiter();

app.UseHttpsRedirection();

// Add authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

// Expose Program for integration tests
public partial class Program { }
