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
    include_source_col: bool = True,
    join_mode: str = "stack", # "stack", "inner", "left", "right", "outer"
    join_key: Optional[str] = None
) -> Tuple[Optional[BytesIO], Optional[List[str]], str]:
    """
    Advanced file merger with support for stacking (vertical) and joining (horizontal).
    """
    if not files:
        return None, None, "No files provided."

    dfs = []
    
    try:
        for buffer, filename in files:
            is_csv = filename.lower().endswith(".csv")
            
            # Read logic
            if is_csv:
                try:
                    buffer.seek(0)
                    df_read = pd.read_csv(buffer, dtype=str, encoding='utf-8-sig')
                except UnicodeDecodeError:
                    buffer.seek(0)
                    df_read = pd.read_csv(buffer, dtype=str, encoding='latin1')
                df_list = [df_read]
            else:
                xls = pd.ExcelFile(buffer)
                sheets_to_read = xls.sheet_names if all_sheets else [xls.sheet_names[0]]
                df_list = [pd.read_excel(xls, sheet_name=s, dtype=str) for s in sheets_to_read]

            for df in df_list:
                if df.empty: continue
                
                # Clean column names
                df.columns = [str(c).strip() for c in df.columns]
                
                # Source tracking (only for stack)
                if include_source_col and join_mode == "stack":
                    df = df.copy()
                    df["Source_File"] = filename
                
                # Handle duplicate columns in source
                if df.columns.duplicated().any():
                    df = df.loc[:, ~df.columns.duplicated()]
                
                # Data cleaning
                if trim_whitespace:
                    for col in df.select_dtypes(include=['object']).columns:
                        df[col] = df[col].str.strip()
                
                if casing != "none":
                    for col in df.select_dtypes(include=['object']).columns:
                        if casing == "upper":
                            df[col] = df[col].str.upper()
                        elif casing == "lower":
                            df[col] = df[col].str.lower()
                        elif casing == "title":
                            df[col] = df[col].str.title()

                dfs.append(df)

        if not dfs:
            return None, None, "No valid data found."

        if join_mode == "stack":
            # --- VERTICAL STACKING LOGIC ---
            if case_insensitive:
                column_sets = [set(c.lower() for c in df.columns if c != "Source_File") for df in dfs]
            else:
                column_sets = [set(c for c in df.columns if c != "Source_File") for df in dfs]

            if strategy == "intersection":
                shared = set.intersection(*column_sets)
                if not shared:
                    return None, None, "No common columns found."
                
                master_cols = []
                first_df_cols = [c for c in dfs[0].columns if c != "Source_File"]
                if case_insensitive:
                    for c in first_df_cols:
                        if c.lower() in shared: master_cols.append(c)
                else:
                    master_cols = [c for c in first_df_cols if c in shared]
            else:
                seen = set()
                master_cols = []
                for df in dfs:
                    for c in df.columns:
                        if c == "Source_File": continue
                        match_val = c.lower() if case_insensitive else c
                        if match_val not in seen:
                            master_cols.append(c)
                            seen.add(match_val)

            if selected_columns:
                if case_insensitive:
                    sel_lower = [c.lower() for c in selected_columns]
                    master_cols = [c for c in master_cols if c.lower() in sel_lower]
                else:
                    master_cols = [c for c in master_cols if c in selected_columns]

            final_dfs = []
            for df in dfs:
                if case_insensitive:
                    rename_map = {}
                    for c in df.columns:
                        if c == "Source_File": continue
                        for m in master_cols:
                            if c.lower() == m.lower():
                                rename_map[c] = m
                                break
                    df = df.rename(columns=rename_map)
                
                cols_to_keep = [c for c in master_cols if c in df.columns]
                if include_source_col: cols_to_keep.append("Source_File")
                final_dfs.append(df[cols_to_keep])

            merged_df = pd.concat(final_dfs, ignore_index=True)
            if remove_duplicates:
                cols_to_check = [c for c in merged_df.columns if c != "Source_File"]
                merged_df = merged_df.drop_duplicates(subset=cols_to_check)
        
        else:
            # --- HORIZONTAL JOIN LOGIC ---
            if not join_key:
                return None, None, "Join key is required for horizontal merge."
            
            # Find the actual key name in each DF (handle case-insensitive match)
            processed_dfs = []
            for i, df in enumerate(dfs):
                actual_key = next((c for c in df.columns if c.lower() == join_key.lower()), None)
                if not actual_key:
                    return None, None, f"Key '{join_key}' not found in file {i+1}."
                
                # Standardize key name
                if actual_key != join_key:
                    df = df.rename(columns={actual_key: join_key})
                
                processed_dfs.append(df)

            # Perform sequential merge with clearer suffixes for overlapping columns
            merged_df = processed_dfs[0]
            for i, next_df in enumerate(processed_dfs[1:], start=2):
                merged_df = pd.merge(
                    merged_df, next_df, 
                    on=join_key, 
                    how=join_mode, 
                    suffixes=("", f"_F{i}")
                )

            if selected_columns:
                # Always keep the join key
                cols = [join_key] + [c for c in merged_df.columns if c in selected_columns and c != join_key]
                merged_df = merged_df[cols]

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
        filename = f"merged_data_{join_mode}{extension}"
        return output, list(merged_df.columns), filename

    except Exception as e:
        logger.error(f"merge_files_advanced error: {str(e)}", exc_info=True)
        return None, None, f"Merge Error: {str(e)}"

def preview_common_columns(
    files: List[Tuple[BytesIO, str]],
    strategy: str = "intersection",
    case_insensitive: bool = False,
    all_sheets: bool = False
) -> Tuple[List[str], List[List[str]]]:
    """
    Analyzes files to find common columns and returns a preview sample.
    """
    column_sets = []
    first_file_cols_ordered = []
    preview_sample = []

    for i, (buffer, filename) in enumerate(files):
        is_csv = filename.lower().endswith(".csv")
        
        try:
            if is_csv:
                try:
                    if hasattr(buffer, 'seek'): buffer.seek(0)
                    df = pd.read_csv(buffer, nrows=5, dtype=str, encoding='utf-8-sig')
                except UnicodeDecodeError:
                    if hasattr(buffer, 'seek'): buffer.seek(0)
                    df = pd.read_csv(buffer, nrows=5, dtype=str, encoding='latin1')
            else:
                xls = pd.ExcelFile(buffer)
                sheet = xls.sheet_names[0]
                df = pd.read_excel(xls, sheet_name=sheet, nrows=5, dtype=str)
        except Exception as e:
            logger.error(f"Error previewing {filename}: {e}")
            continue

        cols = [str(c).strip() for c in df.columns]
        
        if i == 0:
            first_file_cols_ordered = cols
            # Add headers and few rows for sample (list of lists)
            preview_sample = [cols] + df.astype(str).replace('nan', '').values.tolist()

        target_set = {c.lower() for c in cols} if case_insensitive else set(cols)
        column_sets.append(target_set)

    if not column_sets:
        return [], []

    if strategy == "intersection":
        shared = set.intersection(*column_sets)
        common = [c for c in first_file_cols_ordered if (c.lower() if case_insensitive else c) in shared]
    else:
        # Union
        seen = set()
        common = []
        for s_list in column_sets:
            # We want to preserve original casing from the first file we encounter it in
            for c in s_list:
                if c not in seen:
                    common.append(c)
                    seen.add(c)

    return common, preview_sample
