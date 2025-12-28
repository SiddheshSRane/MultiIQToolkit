import pandas as pd
from io import BytesIO
import streamlit as st

@st.cache_data
def get_excel_columns(file_bytes):
    """Get list of columns from Excel file (cached for speed)."""
    try:
        df = pd.read_excel(file_bytes, nrows=0)  # Read only headers
        return list(df.columns)
    except Exception:
        return None

def remove_columns(file, columns_to_remove):
    """Remove specified columns from Excel file with validation."""
    if not columns_to_remove:
        return None, "No columns selected for removal"
    
    try:
        df = pd.read_excel(file)
        
        if df.empty:
            return None, "Excel file is empty"
        
        original_name = file.name.rsplit('.', 1)[0]
        valid_columns = [col for col in columns_to_remove if col in df.columns]
        
        if not valid_columns:
            return None, "No valid columns found"
        
        df_filtered = df.drop(columns=valid_columns, errors='ignore')
        output = BytesIO()
        df_filtered.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        
        return output, original_name
    except Exception as e:
        return None, str(e)
