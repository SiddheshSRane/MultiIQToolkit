import pandas as pd
from io import BytesIO

# -----------------------------------------------------------
# READ EXCEL COLUMNS (FASTAPI VERSION)
# -----------------------------------------------------------

def get_excel_columns(upload_file, sheet_name=None):
    """
    Return column names from a specific sheet.
    If sheet_name is None, pandas uses the first sheet.
    """
    try:
        df = pd.read_excel(upload_file.file, sheet_name=sheet_name, nrows=0)
        return list(df.columns)
    except Exception:
        return None


# -----------------------------------------------------------
# REMOVE COLUMNS FROM EXCEL (FASTAPI VERSION)
# -----------------------------------------------------------

def remove_columns(upload_file, columns_to_remove, sheet_name):
    if not columns_to_remove:
        return None, "No columns selected"

    try:
        # Read selected sheet
        df = pd.read_excel(upload_file.file, sheet_name=sheet_name)

        if df.empty and len(df.columns) == 0:
            return None, f"Sheet '{sheet_name}' is empty"

        # Original filename (without extension)
        original_name = upload_file.filename.rsplit(".", 1)[0]

        # Validate columns
        valid_columns = [c for c in columns_to_remove if c in df.columns]
        if not valid_columns:
            return None, f"Columns not found in sheet '{sheet_name}'"

        # Remove columns
        df_filtered = df.drop(columns=valid_columns, errors="ignore")

        # Write to memory
        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df_filtered.to_excel(writer, index=False, sheet_name=sheet_name)

        output.seek(0)
        return output, original_name

    except Exception as e:
        return None, str(e)
# -----------------------------------------------------------