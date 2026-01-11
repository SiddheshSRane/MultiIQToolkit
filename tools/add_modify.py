# ==========================================================
# File: add_modify.py (Refactored – Step 1)
# ==========================================================

import logging
from typing import Optional, Tuple, Dict, Callable
from io import BytesIO
import pandas as pd

logger = logging.getLogger(__name__)

# ==========================================================
# INTERNAL HELPERS
# ==========================================================

def _read_csv(file) -> pd.DataFrame:
    return pd.read_csv(file)


def _read_excel_sheets(file) -> dict:
    # Use dtype=str to prevent pandas from inferring types (e.g. converting "00123" to 123).
    # This preserves text IDs, leading zeros, and date strings as-is.
    # We accept that visual formatting (colors, widths) will be reset by this read-write cycle.
    xls = pd.ExcelFile(file)
    sheets = {}
    for name in xls.sheet_names:
        try:
            sheets[name] = pd.read_excel(xls, sheet_name=name, dtype=str)
        except Exception:
            sheets[name] = pd.DataFrame()
    return sheets


def _write_excel(output: BytesIO, sheets: dict):
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        for name, df in sheets.items():
            df.to_excel(writer, sheet_name=name, index=False)


def _safe_filename(file) -> str:
    return file.name.rsplit(".", 1)[0]


# ==========================================================
# TOOL 1: REMOVE COLUMNS
# ==========================================================

def remove_columns(
    file,
    columns_to_remove: list,
    sheet_name: Optional[str],
    apply_all_sheets: bool = False,
    is_csv: bool = False
) -> Tuple[Optional[BytesIO], str]:

    if not columns_to_remove:
        return None, "No columns selected."

    try:
        output = BytesIO()
        original_name = _safe_filename(file)

        if is_csv:
            df = _read_csv(file)
            df = df.drop(columns=columns_to_remove, errors="ignore")
            df.to_csv(output, index=False)
        else:
            sheets = _read_excel_sheets(file)

            if not apply_all_sheets and sheet_name not in sheets:
                return None, f"Sheet '{sheet_name}' not found."

            for name, df in sheets.items():
                if apply_all_sheets or name == sheet_name:
                    valid = [c for c in columns_to_remove if c in df.columns]
                    if valid:
                        sheets[name] = df.drop(columns=valid)

            _write_excel(output, sheets)

        output.seek(0)
        return output, original_name

    except Exception as e:
        logger.error(f"remove_columns error: {str(e)}", exc_info=True)
        return None, str(e)


# ==========================================================
# TOOL 2: BULK RENAME COLUMNS
# ==========================================================

def bulk_rename_columns(
    file,
    rename_map: Dict[str, str],
    sheet_name: Optional[str],
    apply_all_sheets: bool = False,
    is_csv: bool = False
) -> Tuple[Optional[BytesIO], str]:

    try:
        output = BytesIO()
        original_name = _safe_filename(file)

        if is_csv:
            df = _read_csv(file)
            df.columns = [str(c).strip() for c in df.columns]
            df = df.rename(columns=rename_map)
            df.to_csv(output, index=False)
        else:
            if len(set(rename_map.values())) != len(rename_map.values()):
                return None, "Duplicate column names detected."

            sheets = _read_excel_sheets(file)

            for name, df in sheets.items():
                if apply_all_sheets or name == sheet_name:
                    df.columns = [str(c).strip() for c in df.columns]
                    sheets[name] = df.rename(columns=rename_map)

            _write_excel(output, sheets)

        output.seek(0)
        return output, original_name

    except Exception as e:
        logger.error(f"bulk_rename_columns error: {str(e)}", exc_info=True)
        return None, str(e)


# ==========================================================
# TOOL 3: REPLACE BLANK VALUES
# ==========================================================

def replace_blank_values(
    file,
    replace_value,
    sheet_name: Optional[str],
    apply_all_sheets: bool = False,
    target_columns: Optional[list] = None,
    is_csv: bool = False
) -> Tuple[Optional[BytesIO], str]:

    try:
        output = BytesIO()
        original_name = _safe_filename(file)

        def _fill(df: pd.DataFrame) -> pd.DataFrame:
            import numpy as np
            
            # Standardize columns first
            df.columns = [str(c).strip() for c in df.columns]
            
            cols_to_fix = target_columns if target_columns else df.columns
            valid_cols = [c for c in cols_to_fix if c in df.columns]

            if not valid_cols:
                return df

            # Faster vectorized replacement
            # regex=True allows matching pattern ^\s*$ for empty/whitespace
            df[valid_cols] = df[valid_cols].replace(r'^\s*$', np.nan, regex=True)
            df[valid_cols] = df[valid_cols].fillna(replace_value)
            
            return df

        if is_csv:
            df = _read_csv(file)
            df = _fill(df)
            df.to_csv(output, index=False)
        else:
            sheets = _read_excel_sheets(file)

            for name, df in sheets.items():
                if apply_all_sheets or name == sheet_name:
                    sheets[name] = _fill(df)

            _write_excel(output, sheets)

        output.seek(0)
        return output, original_name

    except Exception as e:
        logger.error(f"replace_blank_values error: {str(e)}", exc_info=True)
        return None, str(e)


# ==========================================================
# TOOL 4: DATETIME CONVERTER
# ==========================================================

def convert_datetime_column(
    file,
    column_names: list,
    target_format: str,
    sheet_name: Optional[str] = None,
    apply_all_sheets: bool = False,
    is_csv: bool = False
) -> Tuple[Optional[BytesIO], str]:
    """
    Converts multiple date/time columns to a user-selected format.
    Uses errors='coerce' to preserve unparseable values as NaT, 
    but we then fill NaT back with original strings to satisfy 'Preserve invalid values'.
    """
    if not column_names:
        return None, "No columns selected."
    if not target_format:
        return None, "No target format selected."

    try:
        output = BytesIO()
        original_name = _safe_filename(file)

        def _convert(df: pd.DataFrame) -> pd.DataFrame:
            for col in column_names:
                if col not in df.columns:
                    continue
                
                # Ensure the column is string for processing
                col_data = df[col].astype(str)
                
                # Record original values to restore them if coersion fails
                original_values = col_data.copy()
                
                # Convert to datetime safely with mixed format support
                def _parse_cell(val):
                    if pd.isna(val) or str(val).strip() == "":
                        return pd.NaT
                    try:
                        return pd.to_datetime(val, errors="coerce", format="mixed", dayfirst=True)
                    except:
                        return pd.NaT

                dt_series = col_data.apply(_parse_cell)
                
                # Format the valid dates
                fmt = target_format
                if fmt == "ISO 8601":
                    fmt = "%Y-%m-%dT%H:%M:%S"
                
                formatted_series = dt_series.dt.strftime(fmt)
                
                # Set unparseable values as empty string
                df[col] = formatted_series.fillna("")
            
            return df

        if is_csv:
            df = _read_csv(file)
            df = _convert(df)
            df.to_csv(output, index=False)
        else:
            sheets = _read_excel_sheets(file)

            for name, df in sheets.items():
                if apply_all_sheets or name == sheet_name:
                    sheets[name] = _convert(df)

            _write_excel(output, sheets)

        output.seek(0)
        return output, original_name

    except Exception as e:
        logger.error(f"convert_datetime_column error: {str(e)}", exc_info=True)
        return None, str(e)
# ==========================================================