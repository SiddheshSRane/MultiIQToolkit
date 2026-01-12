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
    indent: int = 4
) -> Tuple[Optional[io.BytesIO], str]:
    """
    Converts a CSV or Excel file to JSON format.
    """
    try:
        file_buffer.seek(0)
        if is_csv:
            try:
                df = pd.read_csv(file_buffer, encoding='utf-8-sig')
            except UnicodeDecodeError:
                file_buffer.seek(0)
                df = pd.read_csv(file_buffer, encoding='latin1')
        else:
            df = pd.read_excel(file_buffer, sheet_name=sheet_name)

        # Convert to JSON string
        json_str = df.to_json(orient=orient, indent=indent)
        
        # Convert back to BytesIO for unified_batch_handler compatibility
        output = io.BytesIO(json_str.encode('utf-8'))
        output.seek(0)
        
        return output, "converted"

    except Exception as e:
        logger.error(f"Error converting to JSON: {e}")
        return None, str(e)
