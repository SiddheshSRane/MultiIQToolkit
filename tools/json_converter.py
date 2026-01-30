import pandas as pd
import io
import logging
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

def convert_to_json(
    file_buffer: io.BytesIO,
    is_csv: bool = True,
    sheet_name: Optional[str] = None,
    orient: str = "records",
    indent: int = 4,
    apply_all_sheets: bool = False
) -> Tuple[Optional[io.BytesIO], str]:
    """
    Converts a CSV or Excel file to JSON format.
    Supports single sheet or multi-sheet (returns dict of sheets).
    """
    try:
        file_buffer.seek(0)
        if is_csv:
            try:
                # Try UTF-8-sig first to handle BOM
                df = pd.read_csv(file_buffer, encoding='utf-8-sig', engine='c')
                json_str = df.to_json(orient=orient, indent=indent)
            except Exception:
                # Fallback to Latin-1
                file_buffer.seek(0)
                df = pd.read_csv(file_buffer, encoding='latin1', engine='c')
                json_str = df.to_json(orient=orient, indent=indent)
        else:
            xls = pd.ExcelFile(file_buffer)
            if apply_all_sheets:
                # Convert all sheets to a single JSON object {sheet_name: data}
                all_data = {}
                for name in xls.sheet_names:
                    df = pd.read_excel(xls, sheet_name=name)
                    # Use standard records orientation for nested structures
                    all_data[name] = json.loads(df.to_json(orient=orient))
                json_str = json.dumps(all_data, indent=indent)
            else:
                target = sheet_name or (xls.sheet_names[0] if xls.sheet_names else None)
                df = pd.read_excel(xls, sheet_name=target)
                json_str = df.to_json(orient=orient, indent=indent)

        # Convert back to BytesIO
        output = io.BytesIO(json_str.encode('utf-8'))
        output.seek(0)
        
        return output, ".json"

    except Exception as e:
        logger.error(f"Error converting to JSON: {e}")
        return None, str(e)
