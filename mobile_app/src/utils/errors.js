/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — UNIVERSAL ERROR FORMATTER (ITEM 6)
 * Converts arbitrary API, Axios, DRF, or Network errors into
 * clean, actionable human-readable messages.
 * ═══════════════════════════════════════════════════════════════
 */

export function formatApiError(error, defaultMsg = 'An unexpected error occurred. Please try again.') {
  if (!error) return defaultMsg;

  // 1. Check if error is already a string
  if (typeof error === 'string') return error;

  // 2. Network / Offline errors
  if (error.message === 'Network Error' || !error.response) {
    if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
      return 'The request timed out. Please check your internet connection and try again.';
    }
    return 'Unable to reach the server. Please check your internet connection.';
  }

  const { status, data } = error.response;

  // 3. Rate limiting (429)
  if (status === 429) {
    if (data?.error) return data.error;
    if (data?.detail) return data.detail;
    return 'Too many requests. Please wait a moment before trying again.';
  }

  // 4. Unauthorized (401)
  if (status === 401) {
    if (data?.error) return data.error;
    if (data?.detail) return data.detail;
    return 'Your session has expired. Please log in again.';
  }

  // 5. Forbidden (403)
  if (status === 403) {
    if (data?.error) return data.error;
    if (data?.detail) return data.detail;
    return 'You do not have permission to perform this action.';
  }

  // 6. Not Found (404)
  if (status === 404) {
    if (data?.error) return data.error;
    if (data?.detail) return data.detail;
    return 'The requested record or resource was not found.';
  }

  // 7. Server error (500, 502, 503)
  if (status >= 500) {
    return 'Our servers encountered an issue. Please try again in a few seconds.';
  }

  // 8. Parse DRF payload data
  if (data) {
    // String message
    if (typeof data === 'string') {
      return data.length < 150 ? data : defaultMsg;
    }

    // Direct error key
    if (data.error && typeof data.error === 'string') {
      return data.error;
    }

    // Direct detail key
    if (data.detail && typeof data.detail === 'string') {
      return data.detail;
    }

    // Direct message key
    if (data.message && typeof data.message === 'string') {
      return data.message;
    }

    // DRF Field Validation errors { field_name: ["Error message 1", ...] }
    if (typeof data === 'object') {
      const messages = [];
      for (const [key, val] of Object.entries(data)) {
        if (Array.isArray(val)) {
          const fieldLabel = key.replace(/_/g, ' ');
          messages.push(`${fieldLabel}: ${val.join(', ')}`);
        } else if (typeof val === 'string') {
          const fieldLabel = key.replace(/_/g, ' ');
          messages.push(`${fieldLabel}: ${val}`);
        }
      }
      if (messages.length > 0) {
        return messages.join('\n');
      }
    }
  }

  return error.message || defaultMsg;
}
