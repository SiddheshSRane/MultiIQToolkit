"""
File modification tools for the MiniIQ Toolkit.
Handles column removal, rename, and blank value replacement.
"""

import logging
from typing import Optional, Tuple, Dict
from io import BytesIO
import pandas as pd
import streamlit as st

logger = logging.getLogger(__name__)

# ==========================================================
# UTIL: GET EXCEL COLUMNS
# ==========================================================

@st.cache_data
def get_excel_columns(file_bytes: bytes, sheet_name: Optional[str] = None) -> Optional[list]:
    """
    Return the column names from a specific sheet of an Excel file.
    """
    try:
        df = pd.read_excel(BytesIO(file_bytes), sheet_name=sheet_name, nrows=0)
        return list(df.columns)
    except Exception as e:
        logger.error(f"Error reading Excel columns: {str(e)}")
        return None


# ==========================================================
# TOOL 1: REMOVE COLUMNS
# ==========================================================

def remove_columns(
    file,
    columns_to_remove: list,
    sheet_name: str,
    is_csv: bool = False
) -> Tuple[Optional[BytesIO], str]:

    if not columns_to_remove:
        return None, "No columns selected."

    try:
        original_name = file.name.rsplit(".", 1)[0]
        output = BytesIO()

        if is_csv:
            df = pd.read_csv(file)
            df.drop(columns=columns_to_remove, inplace=True, errors='ignore')
            df.to_csv(output, index=False)
        else:
            xls = pd.ExcelFile(file)
            sheets = {}

            for s in xls.sheet_names:
                try:
                    sheets[s] = pd.read_excel(xls, sheet_name=s)
                except Exception:
                    sheets[s] = None

            if sheet_name not in sheets or sheets[sheet_name] is None:
                return None, f"Sheet '{sheet_name}' not found or unreadable."

            df = sheets[sheet_name]
            if df.empty:
                return None, f"Sheet '{sheet_name}' is empty."

            valid_columns = [c for c in columns_to_remove if c in df.columns]
            if not valid_columns:
                return None, "Selected columns not found in sheet."

            df_filtered = df.drop(columns=valid_columns, errors="ignore")
            if df_filtered.empty:
                return None, "Operation would remove all data. Cancelled."

            sheets[sheet_name] = df_filtered

            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                for name, data in sheets.items():
                    if data is None:
                        pd.DataFrame().to_excel(writer, sheet_name=name, index=False)
                    else:
                        data.to_excel(writer, sheet_name=name, index=False)

        output.seek(0)
        return output, original_name

    except pd.errors.EmptyDataError:
        err_msg = "The file is not empty, but no columns could be found. Please check that it is a valid, well-formed CSV or Excel file."
        logger.error(f"EmptyDataError processing {file.name}: {err_msg}")
        return None, err_msg
    except Exception as e:
        logger.error(f"Error in remove_columns for {file.name}: {str(e)}")
        return None, str(e)


# ==========================================================
# TOOL 2: BULK RENAME COLUMNS
# ==========================================================

def bulk_rename_columns(
    file,
    rename_map: Dict[str, str],
    sheet_name: Optional[str] = None,
    apply_all_sheets: bool = False,
    is_csv: bool = False
) -> Tuple[Optional[BytesIO], str]:

    try:
        original_name = file.name.rsplit(".", 1)[0]
        output = BytesIO()

        if is_csv:
            df = pd.read_csv(file)
            df.rename(columns=rename_map, inplace=True)
            df.to_csv(output, index=False)
        else:
            if len(set(rename_map.values())) != len(rename_map.values()):
                return None, "Duplicate column names detected."

            xls = pd.ExcelFile(file)
            sheets = {}

            for sheet in xls.sheet_names:
                df = pd.read_excel(xls, sheet_name=sheet)

                if df.empty:
                    sheets[sheet] = df
                    continue

                if apply_all_sheets or sheet == sheet_name:
                    df = df.rename(columns=rename_map)

                sheets[sheet] = df

            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                for name, df in sheets.items():
                    df.to_excel(writer, sheet_name=name, index=False)

        output.seek(0)
        return output, original_name

    except pd.errors.EmptyDataError:
        err_msg = "The file is not empty, but no columns could be found. Please check that it is a valid, well-formed CSV or Excel file."
        logger.error(f"EmptyDataError processing {file.name}: {err_msg}")
        return None, err_msg
    except Exception as e:
        logger.error(f"Error in bulk_rename_columns for {file.name}: {str(e)}")
        return None, str(e)


# ==========================================================
# TOOL 3: REPLACE BLANK VALUES (NEW)
# ==========================================================

def replace_blank_values(
    file,
    replace_value,
    sheet_name: Optional[str] = None,
    apply_all_sheets: bool = False,
    target_columns: Optional[list] = None,
    is_csv: bool = False
) -> Tuple[Optional[BytesIO], str]:
    """
    Replace blank (NaN / empty) values in Excel or CSV files.

    Args:
        file: Uploaded Excel/CSV file
        replace_value: Value to replace blanks with
        sheet_name: Target sheet (for Excel)
        apply_all_sheets: Apply to all sheets (for Excel)
        target_columns: Columns to apply replacement (None = all)
        is_csv: Flag to indicate if the file is a CSV

    Returns:
        BytesIO output, original filename
    """
    try:
        original_name = file.name.rsplit(".", 1)[0]
        output = BytesIO()

        if is_csv:
            df = pd.read_csv(file)
            if target_columns:
                valid_cols = [c for c in target_columns if c in df.columns]
                df[valid_cols] = df[valid_cols].fillna(replace_value)
            else:
                df = df.fillna(replace_value)
            df.to_csv(output, index=False)
        else:
            xls = pd.ExcelFile(file)
            sheets = {}

            for sheet in xls.sheet_names:
                df = pd.read_excel(xls, sheet_name=sheet)

                if df.empty:
                    sheets[sheet] = df
                    continue

                if apply_all_sheets or sheet == sheet_name:
                    if target_columns:
                        valid_cols = [c for c in target_columns if c in df.columns]
                        df[valid_cols] = df[valid_cols].fillna(replace_value)
                    else:
                        df = df.fillna(replace_value)

                sheets[sheet] = df

            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                for name, df in sheets.items():
                    df.to_excel(writer, sheet_name=name, index=False)

        output.seek(0)
        return output, original_name

    except pd.errors.EmptyDataError:
        err_msg = "The file is not empty, but no columns could be found. Please check that it is a valid, well-formed CSV or Excel file."
        logger.error(f"EmptyDataError processing {file.name}: {err_msg}")
        return None, err_msg
    except Exception as e:
        logger.error(f"Error in replace_blank_values for {file.name}: {str(e)}")
        return None, str(e)
