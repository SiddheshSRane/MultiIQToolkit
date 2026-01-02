import pandas as pd
from io import BytesIO
import streamlit as st

@st.cache_data
def get_excel_columns(file_bytes, sheet_name=None):
    """
    Return the column names from a specific sheet of an Excel file.
    If sheet_name is None, it defaults to the first sheet.
    """
    try:
        # Wrap bytes in BytesIO to make it readable by pandas
        # We read 0 rows just to grab the header (extremely fast)
        df = pd.read_excel(BytesIO(file_bytes), sheet_name=sheet_name, nrows=0)
        return list(df.columns)
    except Exception:
        return None


def remove_columns(file, columns_to_remove, sheet_name):
    """
    Remove specified columns from a specific sheet in an Excel file 
    and return the modified file as a bytes object.
    """
    if not columns_to_remove:
        return None, "No columns selected."

    try:
        # 1. Load the specific sheet selected by the user via the UI
        df = pd.read_excel(file, sheet_name=sheet_name)
        
        # 2. Check if the sheet actually contains data/columns
        if df.empty and len(df.columns) == 0:
            return None, f"Sheet '{sheet_name}' is empty."

        # 3. Prepare the original filename (without extension) for the download
        original_name = file.name.rsplit(".", 1)[0]
        
        # 4. Verify that the columns to remove actually exist in this specific sheet
        valid_columns = [col for col in columns_to_remove if col in df.columns]
        
        if not valid_columns:
            return None, f"Selected columns not found in sheet '{sheet_name}'."

        # 5. Perform the removal operation
        df_filtered = df.drop(columns=valid_columns, errors="ignore")
        
        # 6. Save the result to an in-memory buffer (BytesIO)
        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            # Save the cleaned data back to a sheet with the original name
            df_filtered.to_excel(writer, index=False, sheet_name=sheet_name)
        
        # 7. Get the byte data from the buffer
        processed_data = output.getvalue()
        
        return processed_data, original_name
        
    except Exception as e:
        # Return the error message so it can be displayed in st.error
        return None, str(e)
# ---------------------------------------------------------------------------
# INTEGRATION SNIPPET FOR app.py