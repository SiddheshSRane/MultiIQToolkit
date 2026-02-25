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
export async function compareText(text1: string, text2: string, ignoreWhitespace = false, ignoreCase = false) {
  const res = await fetchWithAuth("/api/diff/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text1, text2, ignore_whitespace: ignoreWhitespace, ignore_case: ignoreCase }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Comparison failed");
  }

  return res.json();
}

export async function splitFile(file: File, rowsPerSplit: number): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("rows_per_split", rowsPerSplit.toString());

  const res = await fetchWithAuth("/api/file/split-file", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Split failed");
  }

  return res.blob();
}

export async function previewColumns(file: File | Blob, sheetName?: string | null): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  if (sheetName) formData.append("sheet_name", sheetName);

  const res = await fetchWithAuth("/api/file/preview-columns", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Preview failed");
  }
  return res.json();
}

export async function modifyFiles(
  type: 'remove' | 'rename' | 'replace' | 'datetime',
  files: File[],
  params: any
): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  files.forEach(f => formData.append("files", f));

  if (type === 'remove') {
    formData.append("columns", params.columns);
  } else if (type === 'rename') {
    formData.append("mapping", JSON.stringify(params.mapping));
  } else if (type === 'replace') {
    formData.append("columns", params.columns);
    formData.append("replacement", params.replacement || "");
  } else if (type === 'datetime') {
    formData.append("column", params.column);
    formData.append("target_format", params.targetFormat);
  }

  if (params.sheetName) formData.append("sheet_name", params.sheetName);
  formData.append("all_sheets", String(!!params.allSheets));

  const endpoint = `/api/file/${type === 'datetime' ? 'convert-datetime' : type === 'replace' ? 'replace-blanks' : type + '-columns'}`;
  const res = await fetchWithAuth(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Operation failed");
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get("content-disposition");
  // Simple filename extraction
  let filename = files.length > 1 ? "modified_batch.zip" : files[0].name;
  if (contentDisposition && contentDisposition.includes("filename=")) {
    const match = contentDisposition.match(/filename="(.+)"/);
    if (match) filename = match[1];
  }

  return { blob, filename };
}

export async function previewCommonColumns(files: (File | Blob)[], strategy: string, caseInsensitive: boolean, allSheets: boolean): Promise<any> {
  const formData = new FormData();
  files.forEach(f => formData.append("files", f));
  formData.append("strategy", strategy);
  formData.append("case_insensitive", String(caseInsensitive));
  formData.append("all_sheets", String(allSheets));

  const res = await fetchWithAuth("/api/file/preview-common-columns", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Common preview failed");
  }
  return res.json();
}

export async function mergeFiles(files: File[], params: any): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  files.forEach(f => formData.append("files", f));
  formData.append("selected_columns", params.selectedColumns);
  formData.append("strategy", params.strategy || "intersection");
  formData.append("case_insensitive", String(!!params.caseInsensitive));
  formData.append("remove_duplicates", String(!!params.removeDuplicates));
  formData.append("all_sheets", String(!!params.allSheets));
  formData.append("trim_whitespace", String(!!params.trimWhitespace));
  formData.append("casing", params.casing || "none");
  formData.append("include_source_col", String(!!params.includeSource));
  formData.append("join_mode", params.joinMode || "stack");
  if (params.joinKey) formData.append("join_key", params.joinKey);

  const res = await fetchWithAuth("/api/file/merge-common-columns", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Merge failed");
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get("content-disposition");
  let filename = "merged_data.xlsx";
  if (contentDisposition && contentDisposition.includes("filename=")) {
    const match = contentDisposition.match(/filename="(.+)"/);
    if (match) filename = match[1];
  }
  return { blob, filename };
}

export async function convertToJson(files: File[], params: any): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  files.forEach(f => formData.append("files", f));
  formData.append("orient", params.orient || "records");
  formData.append("indent", String(params.indent ?? 4));
  if (params.sheetName) formData.append("sheet_name", params.sheetName);
  formData.append("all_sheets", String(!!params.allSheets));

  const res = await fetchWithAuth("/api/file/convert-to-json", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "JSON conversion failed");
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get("content-disposition");
  const defaultName = files.length > 1 ? "json_export_batch.zip" : `${files[0].name.split('.')[0]}.json`;
  let filename = defaultName;
  if (contentDisposition && contentDisposition.includes("filename=")) {
    const match = contentDisposition.match(/filename="(.+)"/);
    if (match) filename = match[1];
  }
  return { blob, filename };
}

export async function convertDateTimeText(text: string, targetFormat: string): Promise<any> {
  const res = await fetchWithAuth("/api/convert/datetime", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      target_format: targetFormat,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "DateTime conversion failed");
  }
  return res.json();
}

export async function getTemplateHeaders(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetchWithAuth("/api/file/template-headers", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to load template headers");
  }
  return res.json();
}

export async function mapTemplate(templateHeaders: string[], dataFile: File, mapping: any): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  formData.append("template_headers", JSON.stringify(templateHeaders));
  formData.append("data_file", dataFile);
  formData.append("mapping_json", JSON.stringify(mapping));

  const res = await fetchWithAuth("/api/file/template-map", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Template mapping failed");
  }

  const blob = await res.blob();
  const filename = `mapped_${dataFile.name}`;
  return { blob, filename };
}

export async function previewTemplate(templateHeaders: string[], dataFile: File, mapping: any): Promise<any> {
  const formData = new FormData();
  formData.append("template_headers", JSON.stringify(templateHeaders));
  formData.append("data_file", dataFile);
  formData.append("mapping_json", JSON.stringify(mapping));

  const res = await fetchWithAuth("/api/file/template-preview", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Template preview failed");
  }
  return res.json();
}
