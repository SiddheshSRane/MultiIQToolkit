import pandas as pd
import io
import logging
from typing import Dict, List, Optional, Any, Tuple

logger = logging.getLogger(__name__)

def get_excel_headers(file_buffer: io.BytesIO, is_csv: bool = False) -> List[str]:
    """Reads headers from an Excel or CSV file."""
    try:
        file_buffer.seek(0)
        if is_csv:
            df = pd.read_csv(file_buffer, nrows=0)
        else:
            df = pd.read_excel(file_buffer, nrows=0)
        return df.columns.tolist()
    except Exception as e:
        logger.error(f"Error reading headers: {e}")
        return []

def map_template_data(
    template_headers: List[str],
    data_buffer: io.BytesIO,
    is_csv: bool,
    mapping: Dict[str, Dict[str, Any]] # template_col -> {type: 'column'|'static'|'none', value: string}
) -> Tuple[Optional[io.BytesIO], str]:
    """
    Maps data from data_buffer to template_headers structure based on mapping.
    """
    try:
        data_buffer.seek(0)
        if is_csv:
            data_df = pd.read_csv(data_buffer)
        else:
            data_df = pd.read_excel(data_buffer)

        output_df = pd.DataFrame(columns=template_headers)
        row_count = len(data_df)
        
        for t_col in template_headers:
            map_rule = mapping.get(t_col, {"type": "none"})
            
            if map_rule["type"] == "column":
                source_col = map_rule["value"]
                if source_col in data_df.columns:
                    output_df[t_col] = data_df[source_col]
                else:
                    output_df[t_col] = ["" for _ in range(row_count)]
            elif map_rule["type"] == "static":
                static_val = map_rule["value"]
                output_df[t_col] = [static_val for _ in range(row_count)]
            else:
                output_df[t_col] = ["" for _ in range(row_count)]

        output = io.BytesIO()
        output_df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        return output, "mapped_output.xlsx"

    except Exception as e:
        logger.error(f"Error mapping template data: {e}")
        return None, str(e)

def preview_mapped_data(
    template_headers: List[str],
    data_buffer: io.BytesIO,
    is_csv: bool,
    mapping: Dict[str, Dict[str, Any]]
) -> Dict[str, Any]:
    """Generates a preview of the mapped data (first 5 rows)."""
    try:
        data_buffer.seek(0)
        if is_csv:
            data_df = pd.read_csv(data_buffer, nrows=5)
        else:
            data_df = pd.read_excel(data_buffer, nrows=5)

        preview_rows = []
        row_count = len(data_df)
        
        for i in range(row_count):
            row = {}
            for t_col in template_headers:
                map_rule = mapping.get(t_col, {"type": "none"})
                if map_rule["type"] == "column":
                    source_col = map_rule["value"]
                    row[t_col] = str(data_df.iloc[i][source_col]) if source_col in data_df.columns else ""
                elif map_rule["type"] == "static":
                    row[t_col] = map_rule["value"]
                else:
                    row[t_col] = ""
            preview_rows.append(list(row.values()))

        return {
            "headers": template_headers,
            "rows": preview_rows
        }
    except Exception as e:
        logger.error(f"Error generating preview: {e}")
        return {"headers": [], "rows": [], "error": str(e)}
