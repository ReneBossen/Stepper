# Plan 1: Supabase Integration and Project Setup

## Summary

This foundational plan establishes the Supabase integration for the Walking App, including the Supabase .NET client configuration, JWT authentication middleware, and shared infrastructure in the `/Common` folder. This must be completed before any feature implementation as all features depend on Supabase for data access and authentication.

## Affected Feature Slices

- **Common**: Database/SupabaseClientFactory.cs, Authentication/SupabaseAuthMiddleware.cs, Extensions/ServiceCollectionExtensions.cs
- **Root**: Program.cs configuration updates

## Proposed Types

| Type Name | Feature/Location | Responsibility |
|-----------|------------------|----------------|
| SupabaseClientFactory | Common/Database | Creates configured Supabase client instances |
| ISupabaseClientFactory | Common/Database | Interface for Supabase client factory |
| SupabaseSettings | Common/Configuration | Strongly-typed settings for Supabase configuration |
| SupabaseAuthMiddleware | Common/Authentication | Validates Supabase JWT tokens and extracts user identity |
| ClaimsPrincipalExtensions | Common/Extensions | Extension methods to extract user ID from claims |
| ServiceCollectionExtensions | Common/Extensions | DI registration for Supabase services |
| ApiResponse<T> | Common/Models | Standard API response wrapper |
| ExceptionHandlingMiddleware | Common/Middleware | Global exception handling |

## Implementation Steps

1. **Add Supabase NuGet package** to `Stepper.Api.csproj`:
   - `Supabase` (official .NET client)
   - `Microsoft.AspNetCore.Authentication.JwtBearer` for token validation

2. **Create Common folder structure**:
   ```
   Stepper.Api/Common/
   ├── Configuration/
   │   └── SupabaseSettings.cs
   ├── Database/
   │   ├── ISupabaseClientFactory.cs
   │   └── SupabaseClientFactory.cs
   ├── Authentication/
   │   └── SupabaseAuthMiddleware.cs
   ├── Extensions/
   │   ├── ClaimsPrincipalExtensions.cs
   │   └── ServiceCollectionExtensions.cs
   ├── Middleware/
   │   └── ExceptionHandlingMiddleware.cs
   └── Models/
       └── ApiResponse.cs
   ```

3. **Implement SupabaseSettings** for strongly-typed configuration:
   - `Url` (required)
   - `AnonKey` (required)
   - `JwtSecret` (required for token validation)

4. **Implement ISupabaseClientFactory and SupabaseClientFactory**:
   - Create authenticated Supabase client instances
   - Pass user JWT token to client for RLS enforcement
   - Handle connection lifecycle

5. **Implement SupabaseAuthMiddleware**:
   - Extract JWT from Authorization header
   - Validate token signature using Supabase JWT secret
   - Populate HttpContext.User with claims
   - Return 401 for invalid/missing tokens on protected endpoints

6. **Implement ClaimsPrincipalExtensions**:
   - `GetUserId()` extension to extract user UUID from claims
   - Handle Supabase-specific claim names (`sub` claim)

7. **Implement ApiResponse<T>** wrapper:
   - `Success` boolean
   - `Data` generic payload
   - `Errors` list for validation/error messages

8. **Implement ExceptionHandlingMiddleware**:
   - Catch unhandled exceptions
   - Log exceptions appropriately
   - Return standardized error responses
   - Handle Supabase-specific exceptions

9. **Update appsettings.json** structure:
   ```json
   {
     "Supabase": {
       "Url": "",
       "AnonKey": "",
       "JwtSecret": ""
     }
   }
   ```

10. **Create appsettings.Development.json.template** with placeholder values

11. **Update Program.cs**:
    - Register Supabase services
    - Add authentication middleware
    - Add exception handling middleware
    - Configure JWT bearer authentication

12. **Remove template files**:
    - Delete `WeatherForecast.cs`
    - Delete `Controllers/WeatherForecastController.cs`
    - Remove `Controllers/` folder (features will have their own controllers)

13. **Update .gitignore** to exclude sensitive configuration

## Dependencies

| Package | Version | Justification |
|---------|---------|---------------|
| Supabase | Latest stable | Official .NET client for Supabase |
| Microsoft.AspNetCore.Authentication.JwtBearer | 10.0.0 | JWT token validation |

## Database Changes

No database tables in this plan - this is infrastructure setup. Supabase project should be created separately with:
- Authentication enabled
- Database access configured
- API keys generated

## Tests

**Unit Tests** (Stepper.UnitTests/Common/):
- `SupabaseClientFactoryTests` - Verify client creation
- `ClaimsPrincipalExtensionsTests` - Verify user ID extraction
- `ExceptionHandlingMiddlewareTests` - Verify error responses

**Integration Tests** (Stepper.Api.Tests/Common/):
- `AuthenticationIntegrationTests` - Verify protected endpoints require valid tokens
- `SupabaseConnectionTests` - Verify connection to test Supabase instance

**Architecture Tests**:
- Verify Common folder has no dependencies on feature folders

## Acceptance Criteria

- [ ] Supabase client can connect to Supabase project
- [ ] JWT tokens from Supabase Auth are validated correctly
- [ ] User ID is extracted from valid tokens
- [ ] Protected endpoints return 401 without valid token
- [ ] All exceptions are handled and return standardized responses
- [ ] Configuration is loaded from environment/appsettings
- [ ] No secrets are hardcoded in source code
- [ ] Template files (WeatherForecast) are removed

## Risks and Open Questions

| Risk/Question | Mitigation/Answer |
|--------------|-------------------|
| Supabase .NET client may have breaking changes | Pin to specific version, test upgrade path |
| JWT secret rotation | Document secret rotation process |
| Connection pooling configuration | Use Supabase defaults, monitor performance |
| Development vs Production configuration | Use environment-specific appsettings files |
