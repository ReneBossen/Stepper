import { API_BASE_URL } from '@env';

/**
 * Normalizes the base URL by removing trailing slashes and /api suffix if present.
 * This allows the env variable to be set as either:
 * - http://localhost:5000
 * - http://localhost:5000/api
 * - http://localhost:5000/api/
 */
function normalizeBaseUrl(url: string): string {
  let normalized = url.replace(/\/+$/, ''); // Remove trailing slashes
  if (normalized.endsWith('/api')) {
    normalized = normalized.slice(0, -4); // Remove /api suffix
  }
  return normalized;
}

/**
 * API configuration for the .NET backend.
 * Supports versioned API routes (e.g., /api/v1/).
 */
export const API_CONFIG = {
  /**
   * Base URL of the backend API server (without /api path).
   * Defaults to localhost:5000 for development.
   */
  BASE_URL: normalizeBaseUrl(API_BASE_URL || 'http://localhost:5000'),

  /**
   * API version prefix.
   */
  VERSION: 'v1',

  /**
   * Full API URL including version prefix.
   * Example: http://localhost:5000/api/v1
   */
  get API_URL() {
    return `${this.BASE_URL}/api/${this.VERSION}`;
  },

  /**
   * Default request timeout in milliseconds.
   */
  TIMEOUT: 30000, // 30 seconds
};
