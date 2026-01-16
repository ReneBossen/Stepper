using Supabase;

namespace WalkingApp.Api.Common.Database;

/// <summary>
/// Factory for creating authenticated Supabase client instances.
/// </summary>
public interface ISupabaseClientFactory
{
    /// <summary>
    /// Creates a Supabase client instance authenticated with the provided JWT token.
    /// </summary>
    /// <param name="jwtToken">The JWT token from Supabase authentication.</param>
    /// <returns>An authenticated Supabase client instance.</returns>
    Task<Client> CreateClientAsync(string jwtToken);

    /// <summary>
    /// Creates an anonymous Supabase client instance.
    /// </summary>
    /// <returns>An anonymous Supabase client instance.</returns>
    Task<Client> CreateAnonymousClientAsync();
}
