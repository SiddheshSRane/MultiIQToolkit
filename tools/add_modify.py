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
    xls = pd.ExcelFile(file)
    sheets = {}
    for name in xls.sheet_names:
        try:
            sheets[name] = pd.read_excel(xls, sheet_name=name)
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

            if sheet_name not in sheets:
                return None, f"Sheet '{sheet_name}' not found."

            df = sheets[sheet_name]
            valid = [c for c in columns_to_remove if c in df.columns]

            if not valid:
                return None, "Selected columns not found."

            df = df.drop(columns=valid)
            if df.empty:
                return None, "Operation would remove all data."

            sheets[sheet_name] = df
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
            if target_columns:
                valid = [c for c in target_columns if c in df.columns]
                df[valid] = df[valid].fillna(replace_value)
                return df
            return df.fillna(replace_value)

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