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
        logger.error(f"remove_columns error: {str(e)}")
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
            df = df.rename(columns=rename_map)
            df.to_csv(output, index=False)
        else:
            if len(set(rename_map.values())) != len(rename_map.values()):
                return None, "Duplicate column names detected."

            sheets = _read_excel_sheets(file)

            for name, df in sheets.items():
                if apply_all_sheets or name == sheet_name:
                    sheets[name] = df.rename(columns=rename_map)

            _write_excel(output, sheets)

        output.seek(0)
        return output, original_name

    except Exception as e:
        logger.error(f"bulk_rename_columns error: {str(e)}")
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
            # First, treat whitespace-only strings and empty strings as NaN
            # regex=True allows matching pattern ^\s*$ for empty/whitespace
            import numpy as np
            
            # Apply to specific columns if requested
            cols_to_fix = target_columns if target_columns else df.columns
            valid_cols = [c for c in cols_to_fix if c in df.columns]

            # Replace whitespace/empty with NaN
            df[valid_cols] = df[valid_cols].replace(r'^\s*$', np.nan, regex=True)
            
            # Fill NaN with replacement value
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
        logger.error(f"replace_blank_values error: {str(e)}")
        return None, str(e)
# ==========================================================