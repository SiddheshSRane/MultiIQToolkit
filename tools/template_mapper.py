import pandas as pd
import io
import logging
from typing import Dict, List, Optional, Any, Tuple

logger = logging.getLogger(__name__)

def get_excel_headers(file_obj, is_csv: bool = False) -> List[str]:
    """Reads headers from an Excel or CSV file-like object."""
    try:
        if hasattr(file_obj, 'seek'):
            file_obj.seek(0)
            
        if is_csv:
            try:
                # Use engine='c' for speed
                df = pd.read_csv(file_obj, nrows=0, encoding='utf-8-sig', engine='c')
            except Exception:
                if hasattr(file_obj, 'seek'): file_obj.seek(0)
                df = pd.read_csv(file_obj, nrows=0, encoding='latin1', engine='c')
        else:
            df = pd.read_excel(file_obj, nrows=0)
            
        return [str(c) for c in df.columns]
    except Exception as e:
        logger.error(f"Error reading headers: {e}")
        return []

def apply_transformation(series: pd.Series, transform: Optional[str]) -> pd.Series:
    """Applies a transformation to a pandas Series."""
    if not transform or transform == "none":
        return series
    
    # Ensure string type for transformations
    s = series.astype(str)
    if transform == "trim":
        return s.str.strip()
    elif transform == "uppercase":
        return s.str.upper()
    elif transform == "lowercase":
        return s.str.lower()
    elif transform == "titlecase":
        return s.str.title()
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
            try:
                data_df = pd.read_csv(data_buffer, encoding='utf-8-sig')
            except Exception:
                data_buffer.seek(0)
                data_df = pd.read_csv(data_buffer, encoding='latin1')
        else:
            data_df = pd.read_excel(data_buffer)

        output_df = pd.DataFrame(index=data_df.index)
        
        for t_col in template_headers:
            map_rule = mapping.get(t_col, {"type": "none"})
            transform = map_rule.get("transform", "none")
            
            if map_rule["type"] == "column":
                source_col = map_rule["value"]
                if source_col in data_df.columns:
                    output_df[t_col] = apply_transformation(data_df[source_col], transform)
                else:
                    output_df[t_col] = "" # Broadcast empty string
            elif map_rule["type"] == "static":
                output_df[t_col] = map_rule.get("value", "") # Broadcast static value
            else:
                output_df[t_col] = "" # Broadcast empty string

        # Ensure correct column order
        output_df = output_df[template_headers]

        output = io.BytesIO()
        output_df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        return output, "mapped_output.xlsx"

    except Exception as e:
        logger.error(f"Error mapping template data: {e}", exc_info=True)
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
            try:
                data_df = pd.read_csv(data_buffer, nrows=5, encoding='utf-8-sig')
            except Exception:
                data_buffer.seek(0)
                data_df = pd.read_csv(data_buffer, nrows=5, encoding='latin1')
        else:
            data_df = pd.read_excel(data_buffer, nrows=5)

        temp_df = pd.DataFrame(index=data_df.index)
        
        for t_col in template_headers:
            map_rule = mapping.get(t_col, {"type": "none"})
            transform = map_rule.get("transform", "none")
            
            if map_rule["type"] == "column":
                source_col = map_rule["value"]
                if source_col in data_df.columns:
                    temp_df[t_col] = apply_transformation(data_df[source_col], transform)
                else:
                    temp_df[t_col] = ""
            elif map_rule["type"] == "static":
                temp_df[t_col] = map_rule.get("value", "")
            else:
                temp_df[t_col] = ""

        # Safe conversion to list with explicit NaN handling
        preview_rows = temp_df[template_headers].astype(str).replace('nan', '').values.tolist()

        return {
            "headers": template_headers,
            "rows": preview_rows
        }
    except Exception as e:
        logger.error(f"Error generating preview: {e}")
        return {"headers": [], "rows": [], "error": str(e)}
