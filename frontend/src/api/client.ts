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

export async function convertColumn(payload: ConvertPayload) {
  const res = await fetch("/api/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("API request failed");
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

export async function exportXlsx(payload: ConvertPayload) {
  const res = await fetch("/api/convert/export-xlsx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Export failed");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "conversion.xlsx";
  a.click();
  window.URL.revokeObjectURL(url);
  return blob;
}
