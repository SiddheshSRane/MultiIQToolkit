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
    all_sheets: bool = False,
    selected_columns: Optional[List[str]] = None,
    trim_whitespace: bool = False,
    casing: str = "none",  # "none", "upper", "lower"
    include_source_col: bool = True
) -> Tuple[Optional[BytesIO], Optional[List[str]], str]:
    """
    Advanced file merger with support for strategies, case-sensitivity, deduplication,
    column selection, and data cleaning.
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
                
                # Source tracking
                if include_source_col:
                    df = df.copy()
                    df["Source_File"] = filename
                
                # Handle duplicate columns in source
                if df.columns.duplicated().any():
                    df = df.loc[:, ~df.columns.duplicated()]
                
                # Data cleaning
                if trim_whitespace:
                    df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
                
                if casing == "upper":
                    df = df.apply(lambda x: x.str.upper() if x.dtype == "object" else x)
                elif casing == "lower":
                    df = df.apply(lambda x: x.str.lower() if x.dtype == "object" else x)

                dfs.append(df)

        if not dfs:
            return None, None, "No valid data found."

        # Column Logic
        if case_insensitive:
            column_sets = [set(c.lower() for c in df.columns if c != "Source_File") for df in dfs]
        else:
            column_sets = [set(c for c in df.columns if c != "Source_File") for df in dfs]

        if strategy == "intersection":
            shared = set.intersection(*column_sets)
            if not shared:
                return None, None, "No common columns found."
            
            # Resolve to original casing from first file for shared columns
            master_cols = []
            first_df_cols = [c for c in dfs[0].columns if c != "Source_File"]
            
            if case_insensitive:
                for c in first_df_cols:
                    if c.lower() in shared:
                        master_cols.append(c)
            else:
                master_cols = [c for c in first_df_cols if c in shared]
        else:
            # Union strategy
            seen = set()
            master_cols = []
            for df in dfs:
                for c in df.columns:
                    if c == "Source_File": continue
                    match_val = c.lower() if case_insensitive else c
                    if match_val not in seen:
                        master_cols.append(c)
                        seen.add(match_val)

        # Apply column selection if provided
        if selected_columns:
            if case_insensitive:
                sel_lower = [c.lower() for c in selected_columns]
                master_cols = [c for c in master_cols if c.lower() in sel_lower]
            else:
                master_cols = [c for c in master_cols if c in selected_columns]

        # Final Alignment
        final_dfs = []
        for df in dfs:
            rename_map = {}
            if case_insensitive:
                # Rename df columns to match master_cols casing
                for c in df.columns:
                    if c == "Source_File": continue
                    for m in master_cols:
                        if c.lower() == m.lower():
                            rename_map[c] = m
                            break
                df = df.rename(columns=rename_map)
            
            # Filter to master_cols (+ Source_File if needed)
            cols_to_keep = [c for c in master_cols if c in df.columns]
            if include_source_col:
                cols_to_keep.append("Source_File")
            
            final_dfs.append(df[cols_to_keep])

        merged_df = pd.concat(final_dfs, ignore_index=True)
        
        if remove_duplicates:
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
        logger.error(f"merge_files_advanced error: {str(e)}", exc_info=True)
        return None, None, f"Merge Error: {str(e)}"
