import { supabase } from '../supabase';
import { API_CONFIG } from '../../config/api';
import { ApiResponse, ApiError, ApiErrorResponse } from './types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Gets the current authentication token from Supabase.
 * Returns null if no session exists.
 */
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Makes an HTTP request to the backend API.
 *
 * @param method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param endpoint - API endpoint (e.g., '/users/profile')
 * @param options - Request options (body, headers, timeout)
 * @returns The response data
 * @throws ApiError on failure
 */
async function request<T>(
  method: HttpMethod,
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${API_CONFIG.API_URL}${endpoint}`;
  const token = await getAuthToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.timeout || API_CONFIG.TIMEOUT
  );

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    const json = await response.json() as ApiResponse<T> | ApiErrorResponse;

    if (!response.ok || !json.success) {
      throw ApiError.fromResponse(json as ApiErrorResponse, response.status);
    }

    return json.data;
  } catch (error) {
    clearTimeout(timeoutId);

    // Re-throw ApiErrors as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle abort/timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408);
    }

    // Handle other errors (network errors, etc.)
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

/**
 * Makes a multipart form data request (for file uploads).
 *
 * @param endpoint - API endpoint (e.g., '/users/avatar')
 * @param formData - The FormData object to send
 * @returns The response data
 * @throws ApiError on failure
 */
async function requestFormData<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const url = `${API_CONFIG.API_URL}${endpoint}`;
  const token = await getAuthToken();

  const headers: Record<string, string> = {};
  // Note: Don't set Content-Type for FormData - browser/runtime sets it with boundary

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    const json = await response.json() as ApiResponse<T> | ApiErrorResponse;

    if (!response.ok || !json.success) {
      throw ApiError.fromResponse(json as ApiErrorResponse, response.status);
    }

    return json.data;
  } catch (error) {
    // Re-throw ApiErrors as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

/**
 * HTTP client for making requests to the backend API.
 *
 * Automatically handles:
 * - Authentication (adds Bearer token from Supabase session)
 * - Request timeouts
 * - JSON serialization/deserialization
 * - Standard API response format
 * - Error handling with ApiError class
 *
 * @example
 * ```typescript
 * // GET request
 * const user = await apiClient.get<UserProfile>('/users/me');
 *
 * // POST request with body
 * const result = await apiClient.post<StepEntry>('/steps', { steps: 5000 });
 *
 * // PUT request
 * await apiClient.put('/users/profile', { display_name: 'New Name' });
 *
 * // DELETE request
 * await apiClient.delete('/friends/123');
 *
 * // File upload
 * const formData = new FormData();
 * formData.append('file', imageFile);
 * const result = await apiClient.upload<AvatarResponse>('/users/avatar', formData);
 * ```
 */
export const apiClient = {
  /**
   * Makes a GET request.
   *
   * @param endpoint - API endpoint (e.g., '/users/profile')
   * @param options - Optional request options
   * @returns The response data
   */
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>('GET', endpoint, options),

  /**
   * Makes a POST request.
   *
   * @param endpoint - API endpoint
   * @param body - Request body (will be JSON serialized)
   * @param options - Optional request options
   * @returns The response data
   */
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', endpoint, { ...options, body }),

  /**
   * Makes a PUT request.
   *
   * @param endpoint - API endpoint
   * @param body - Request body (will be JSON serialized)
   * @param options - Optional request options
   * @returns The response data
   */
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', endpoint, { ...options, body }),

  /**
   * Makes a PATCH request.
   *
   * @param endpoint - API endpoint
   * @param body - Request body (will be JSON serialized)
   * @param options - Optional request options
   * @returns The response data
   */
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', endpoint, { ...options, body }),

  /**
   * Makes a DELETE request.
   *
   * @param endpoint - API endpoint
   * @param options - Optional request options
   * @returns The response data
   */
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>('DELETE', endpoint, options),

  /**
   * Makes a multipart form data POST request (for file uploads).
   *
   * @param endpoint - API endpoint
   * @param formData - The FormData object to send
   * @returns The response data
   */
  upload: <T>(endpoint: string, formData: FormData) =>
    requestFormData<T>(endpoint, formData),
};
