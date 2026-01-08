export type ConvertPayload = {
  text: string;
  delimiter?: string;
  item_prefix?: string;
  item_suffix?: string;
  result_prefix?: string;
  result_suffix?: string;
  remove_duplicates?: boolean;
  sort_items?: boolean;
  ignore_comments?: boolean;
  strip_quotes?: boolean;
};

export async function convertColumn(payload: ConvertPayload) {
  const res = await fetch("http://localhost:8000/convert", {
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
