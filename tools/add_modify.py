"""
File modification tools for the MiniIQ Toolkit.
Handles column removal and other dataframe transformations.
"""

import logging
from typing import Optional, Tuple
from io import BytesIO
import pandas as pd
import streamlit as st

logger = logging.getLogger(__name__)


@st.cache_data
def get_excel_columns(file_bytes: bytes, sheet_name: Optional[str] = None) -> Optional[list]:
    """
    Return the column names from a specific sheet of an Excel file.
    
    Args:
        file_bytes: Bytes of Excel file
        sheet_name: Optional sheet name (defaults to first sheet)
        
    Returns:
        List of column names or None on failure
    """
    try:
        # Wrap bytes in BytesIO to make it readable by pandas
        # We read 0 rows just to grab the header (extremely fast)
        df = pd.read_excel(BytesIO(file_bytes), sheet_name=sheet_name, nrows=0)
        columns = list(df.columns)
        logger.info(f"Retrieved {len(columns)} columns from Excel sheet")
        return columns
    except Exception as e:
        logger.error(f"Error reading Excel columns: {str(e)}")
        return None


def remove_columns(
    file,
    columns_to_remove: list,
    sheet_name: str
) -> Tuple[Optional[BytesIO], str]:
    """
    Remove specified columns from a specific sheet in an Excel file.
    
    Args:
        file: Uploaded file object
        columns_to_remove: List of column names to remove
        sheet_name: Name of the sheet to process
        
    Returns:
        Tuple of (BytesIO with modified data, original filename) or (None, error_message)
    """
    if not columns_to_remove:
        logger.warning("remove_columns: no columns selected for removal")
        return None, "No columns selected."

    try:
        logger.info(f"Removing columns from sheet '{sheet_name}'")
        
        # Read entire workbook so we can preserve all sheets
        xls = pd.ExcelFile(file)
        sheets = {}
        for s in xls.sheet_names:
            try:
                sheets[s] = pd.read_excel(xls, sheet_name=s)
            except Exception:
                # If sheet cannot be read as a table, skip it (preserve empty)
                sheets[s] = None

        # Ensure target sheet exists and has columns
        if sheet_name not in sheets or sheets[sheet_name] is None:
            msg = f"Sheet '{sheet_name}' not found or unreadable."
            logger.warning(f"remove_columns: {msg}")
            return None, msg

        df = sheets[sheet_name]
        if df.empty or len(df.columns) == 0:
            msg = f"Sheet '{sheet_name}' is empty."
            logger.warning(f"remove_columns: {msg}")
            return None, msg

        # Prepare the original filename (without extension)
        original_name = file.name.rsplit(".", 1)[0]

        # Verify requested columns exist
        valid_columns = [col for col in columns_to_remove if col in df.columns]
        if not valid_columns:
            msg = f"Selected columns not found in sheet '{sheet_name}'."
            logger.warning(f"remove_columns: {msg}")
            return None, msg

        # Perform removal on the target sheet
        df_filtered = df.drop(columns=valid_columns, errors="ignore")
        logger.info(f"Removed {len(valid_columns)} column(s) from sheet '{sheet_name}'")

        if df_filtered.empty:
            msg = "Operation would remove all data from the sheet. Cancelled."
            logger.warning(f"remove_columns: {msg}")
            return None, msg

        # Replace the sheet in the sheets dict and write all sheets back
        sheets[sheet_name] = df_filtered

        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            for s_name, df_obj in sheets.items():
                # If a sheet could not be read earlier, write an empty DataFrame
                try:
                    if df_obj is None:
                        pd.DataFrame().to_excel(writer, sheet_name=s_name, index=False)
                    else:
                        df_obj.to_excel(writer, sheet_name=s_name, index=False)
                except Exception as e:
                    logger.warning(f"Failed to write sheet {s_name}: {str(e)}")

        output.seek(0)
        logger.info(f"Successfully removed columns from '{sheet_name}' and preserved workbook structure")
        return output, original_name
        
    except Exception as e:
        # Return the error message so it can be displayed in st.error
        error_msg = str(e)
        logger.error(f"Error in remove_columns: {error_msg}")
        return None, error_msg
# ---------------------------------------------------------------------------
# INTEGRATION SNIPPET FOR app.py