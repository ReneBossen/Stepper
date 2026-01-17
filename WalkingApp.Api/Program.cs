using WalkingApp.Api.Common.Authentication;
using WalkingApp.Api.Common.Extensions;
using WalkingApp.Api.Common.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Add HTTP context accessor for accessing user context in repositories
builder.Services.AddHttpContextAccessor();

// Add Supabase services
builder.Services.AddSupabaseServices(builder.Configuration);

// Add user services
builder.Services.AddUserServices();

// Add step services
builder.Services.AddStepServices();

// Add friend services
builder.Services.AddFriendServices();

// Add group services
builder.Services.AddGroupServices();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Add global exception handling middleware (first in pipeline)
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseHttpsRedirection();

// Add Supabase authentication middleware
app.UseMiddleware<SupabaseAuthMiddleware>();

app.MapControllers();

app.Run();
