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

def apply_transformation(series: pd.Series, transform: Optional[str]) -> pd.Series:
    """Applies a transformation to a pandas Series."""
    if not transform or transform == "none":
        return series
    
    if transform == "trim":
        return series.astype(str).str.strip()
    elif transform == "uppercase":
        return series.astype(str).str.upper()
    elif transform == "lowercase":
        return series.astype(str).str.lower()
    elif transform == "titlecase":
        return series.astype(str).str.title()
    return series

def map_template_data(
    template_headers: List[str],
    data_buffer: io.BytesIO,
    is_csv: bool,
    mapping: Dict[str, Dict[str, Any]]
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
            transform = map_rule.get("transform", "none")
            
            if map_rule["type"] == "column":
                source_col = map_rule["value"]
                if source_col in data_df.columns:
                    output_df[t_col] = apply_transformation(data_df[source_col], transform)
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

        row_count = len(data_df)
        temp_df = pd.DataFrame(columns=template_headers)
        
        for t_col in template_headers:
            map_rule = mapping.get(t_col, {"type": "none"})
            transform = map_rule.get("transform", "none")
            
            if map_rule["type"] == "column":
                source_col = map_rule["value"]
                if source_col in data_df.columns:
                    temp_df[t_col] = apply_transformation(data_df[source_col], transform)
                else:
                    temp_df[t_col] = ["" for _ in range(row_count)]
            elif map_rule["type"] == "static":
                temp_df[t_col] = [map_rule["value"] for _ in range(row_count)]
            else:
                temp_df[t_col] = ["" for _ in range(row_count)]

        preview_rows = temp_df.values.tolist()
        # Convert all to string for JSON safety
        preview_rows = [[str(cell) if pd.notnull(cell) else "" for cell in row] for row in preview_rows]

        return {
            "headers": template_headers,
            "rows": preview_rows
        }
    except Exception as e:
        logger.error(f"Error generating preview: {e}")
        return {"headers": [], "rows": [], "error": str(e)}
