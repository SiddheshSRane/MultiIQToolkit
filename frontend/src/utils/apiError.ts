/**
 * Type definition for API error responses
 */
export type ApiErrorResponse = {
  detail?: string;
  message?: string;
  error?: string;
};

/**
 * Parse API error response from various formats
 * Handles JSON errors, text errors, and HTTP status codes
 */
export async function parseApiError(response: Response): Promise<string> {
  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const errorData: ApiErrorResponse = await response.json();
      return errorData.detail || errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    } else {
      const text = await response.text();
      return text || `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch {
    return `HTTP ${response.status}: ${response.statusText}`;
  }
}
