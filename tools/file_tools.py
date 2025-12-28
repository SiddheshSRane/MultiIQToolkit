import pandas as pd
from io import BytesIO, StringIO

def merge_excel(files):
    """Merge multiple Excel files with error handling and validation."""
    if not files:
        return None
    
    try:
        all_data = []
        for file in files:
            try:
                xls = pd.ExcelFile(file)
                for sheet in xls.sheet_names:
                    df = pd.read_excel(xls, sheet_name=sheet)
                    if df.empty:
                        continue
                    df['Source_File'] = file.name
                    df['Sheet_Name'] = sheet
                    all_data.append(df)
            except Exception:
                continue
        
        if not all_data:
            return None
        
        merged = pd.concat(all_data, ignore_index=True)
        output = BytesIO()
        merged.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        return output
    except Exception:
        return None

def merge_csv(files):
    """Merge multiple CSV files with error handling and validation."""
    if not files:
        return None
    
    try:
        dfs = []
        for file in files:
            try:
                df = pd.read_csv(file)
                if df.empty:
                    continue
                df['Source_File'] = file.name
                dfs.append(df)
            except Exception:
                continue
        
        if not dfs:
            return None
        
        merged = pd.concat(dfs, ignore_index=True)
        output = BytesIO()
        merged.to_csv(output, index=False)
        output.seek(0)
        return output
    except Exception:
        return None
