import pandas as pd
from io import BytesIO
from typing import List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

def merge_files_advanced(
    files: List[Tuple[BytesIO, str]],
    strategy: str = "intersection",  # "intersection" or "union"
    case_insensitive: bool = False,
    remove_duplicates: bool = False,
    all_sheets: bool = False
) -> Tuple[Optional[BytesIO], Optional[List[str]], str]:
    """
    Advanced file merger with support for strategies, case-sensitivity, and deduplication.
    """
    if not files:
        return None, None, "No files provided."

    dfs = []
    
    try:
        for buffer, filename in files:
            is_csv = filename.lower().endswith(".csv")
            
            # Read logic
            if is_csv:
                df_list = [pd.read_csv(buffer, dtype=str)]
            else:
                xls = pd.ExcelFile(buffer)
                sheets_to_read = xls.sheet_names if all_sheets else [xls.sheet_names[0]]
                df_list = [pd.read_excel(xls, sheet_name=s, dtype=str) for s in sheets_to_read]

            for df in df_list:
                if df.empty: continue
                
                # Clean column names
                df.columns = [str(c).strip() for c in df.columns]
                
                if case_insensitive:
                    # Map original columns to lowercase for matching
                    # But we'll keep the first file's casing as the master
                    pass 

                # Source tracking
                df = df.copy()
                df["Source_File"] = filename
                
                # Handle duplicate columns in source
                if df.columns.duplicated().any():
                    df = df.loc[:, ~df.columns.duplicated()]
                
                dfs.append(df)

        if not dfs:
            return None, None, "No valid data found."

        # Column Logic
        if case_insensitive:
            # Normalize all columns to lowercase to find shared ones
            column_sets = [set(c.lower() for c in df.columns if c != "Source_File") for df in dfs]
        else:
            column_sets = [set(c for c in df.columns if c != "Source_File") for df in dfs]

        if strategy == "intersection":
            shared_lower = set.intersection(*column_sets)
            if not shared_lower:
                return None, None, "No common columns found."
            
            # Resolve to original casing from first file
            master_cols = []
            first_df_cols = [c for c in dfs[0].columns if c != "Source_File"]
            
            if case_insensitive:
                for c in first_df_cols:
                    if c.lower() in shared_lower:
                        master_cols.append(c)
            else:
                master_cols = [c for c in first_df_cols if c in shared_lower]
        else:
            # Union strategy
            if case_insensitive:
                # This is tricky: union of case-insensitive columns. 
                # We'll just use the union of original names and let pandas align what it can.
                master_cols = list(set().union(*(set(df.columns) for df in dfs)))
                master_cols = [c for c in master_cols if c != "Source_File"]
            else:
                # Simple union of columns as they are
                all_cols_ordered = []
                seen = set()
                for df in dfs:
                    for c in df.columns:
                        if c != "Source_File" and c not in seen:
                            all_cols_ordered.append(c)
                            seen.add(c)
                master_cols = all_cols_ordered

        # Final Alignment
        final_dfs = []
        for df in dfs:
            if strategy == "intersection":
                if case_insensitive:
                    # Rename df columns to match first file's casing
                    rename_map = {}
                    for c in df.columns:
                        for m in master_cols:
                            if c.lower() == m.lower():
                                rename_map[c] = m
                    df = df.rename(columns=rename_map)
                final_dfs.append(df[master_cols + ["Source_File"]])
            else:
                # Union: just append, pandas handles NaNs
                # But if case_insensitive, we should still align them
                if case_insensitive:
                    rename_map = {}
                    for c in df.columns:
                        for m in master_cols:
                            if c.lower() == m.lower() and c != m:
                                rename_map[c] = m
                    df = df.rename(columns=rename_map)
                final_dfs.append(df)

        merged_df = pd.concat(final_dfs, ignore_index=True)
        
        if remove_duplicates:
            # Drop duplicates across all columns except Source_File if possible
            cols_to_check = [c for c in merged_df.columns if c != "Source_File"]
            merged_df = merged_df.drop_duplicates(subset=cols_to_check)

        output = BytesIO()
        any_excel = any(not f[1].lower().endswith(".csv") for f in files)
        
        if any_excel:
            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                merged_df.to_excel(writer, index=False, sheet_name="Merged_Data")
            extension = ".xlsx"
        else:
            merged_df.to_csv(output, index=False)
            extension = ".csv"

        output.seek(0)
        return output, list(merged_df.columns), f"merged_data_{strategy}{extension}"

    except Exception as e:
        logger.error(f"merge_files_advanced error: {str(e)}")
        return None, None, f"Merge Error: {str(e)}"
