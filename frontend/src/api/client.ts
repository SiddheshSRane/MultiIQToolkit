import { supabase } from "../lib/supabase";

export type ConvertPayload = {
  text: string;
  delimiter?: string;
  item_prefix?: string;
  item_suffix?: string;
  result_prefix?: string;
  result_suffix?: string;
  remove_duplicates?: boolean;
  sort_items?: boolean;
  reverse_items?: boolean;
  ignore_comments?: boolean;
  strip_quotes?: boolean;
  trim_items?: boolean;
  case_transform?: string;
};

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return headers;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const authHeaders = await getAuthHeaders();

  // Don't override Content-Type for FormData - browser sets it automatically with boundary
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...authHeaders,
  };

  // Only merge custom headers if not FormData, or if Content-Type is explicitly provided
  if (options.headers) {
    if (isFormData) {
      // For FormData, only include non-Content-Type headers
      Object.entries(options.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== "content-type") {
          headers[key] = value as string;
        }
      });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}

export async function convertColumn(payload: ConvertPayload) {
  const res = await fetchWithAuth("/api/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "API request failed");
  }

  return res.json() as Promise<{
    result: string;
    stats: {
      total_lines: number;
      non_empty: number;
      unique: number;
    };
  }>;
}

export async function exportXlsx(payload: ConvertPayload): Promise<Blob> {
  const res = await fetchWithAuth("/api/convert/export-xlsx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const contentType = res.headers.get("content-type");
    let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
    
    if (contentType && contentType.includes("application/json")) {
      try {
        const errorData = await res.json();
        errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
      } catch {
        // Use default error message if JSON parsing fails
      }
    } else {
      try {
        const text = await res.text();
        if (text) errorMessage = text;
      } catch {
        // Use default error message if text parsing fails
      }
    }
    
    throw new Error(errorMessage);
  }

  // Validate response has content
  const contentType = res.headers.get("content-type");
  if (!contentType) {
    throw new Error("Server response missing content type");
  }

  const blob = await res.blob();
  
  // Validate blob is not empty
  if (blob.size === 0) {
    throw new Error("Server returned empty file");
  }

  return blob;
}
