# tools/file_tools.py
import pandas as pd
from io import BytesIO

# -----------------------------------------------------------
# MERGE EXCEL FILES
# -----------------------------------------------------------

def merge_excel(files):
    """Merge multiple Excel files into one with sheet tracking."""
    if not files:
        return None

    all_data = []

    for file in files:
        try:
            # 🔥 FastAPI UploadFile → use file.file
            xls = pd.ExcelFile(file.file)

            for sheet in xls.sheet_names:
                df = pd.read_excel(xls, sheet_name=sheet)

                if df.empty:
                    continue

                df["Source_File"] = file.filename
                df["Sheet_Name"] = sheet
                all_data.append(df)

        except Exception as e:
            print("Excel merge error:", e)
            return None

    if not all_data:
        return None

    merged = pd.concat(all_data, ignore_index=True)

    output = BytesIO()
    merged.to_excel(output, index=False, engine="openpyxl")
    output.seek(0)

    return output


# -----------------------------------------------------------
# MERGE CSV FILES
# -----------------------------------------------------------

def merge_csv(files):
    """Merge multiple CSV files into one combined dataset."""
    if not files:
        return None

    all_data = []

    for file in files:
        try:
            # 🔥 THIS IS THE FIX
            df = pd.read_csv(file.file)

            if df.empty:
                continue

            df["Source_File"] = file.filename
            all_data.append(df)

        except Exception as e:
            print("CSV merge error:", e)
            return None

    if not all_data:
        return None

    merged = pd.concat(all_data, ignore_index=True)

    output = BytesIO()
    merged.to_csv(output, index=False)
    output.seek(0)

    return output
# -----------------------------------------------------------
# REMOVE COLUMNS FROM EXCEL FILE