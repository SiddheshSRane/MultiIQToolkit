"""
File manipulation tools for the MiniIQ Toolkit.
Handles merging and combining Excel and CSV files.
"""

import logging
from typing import Optional, List
from io import BytesIO
import pandas as pd

logger = logging.getLogger(__name__)


def merge_excel(files: list) -> Optional[BytesIO]:
    """
    Merge multiple Excel files into one with sheet tracking.
    
    Args:
        files: List of uploaded file objects
        
    Returns:
        BytesIO object with merged Excel data or None on failure
    """
    if not files:
        logger.warning("merge_excel: no files provided")
        return None

    all_data = []
    file_count = 0
    
    for file in files:
        try:
            logger.info(f"Processing Excel file: {file.name}")
            xls = pd.ExcelFile(file)
            for sheet in xls.sheet_names:
                df = pd.read_excel(xls, sheet_name=sheet)
                if df.empty:
                    logger.debug(f"Skipping empty sheet: {sheet} from {file.name}")
                    continue
                df["Source_File"] = file.name
                df["Sheet_Name"] = sheet
                all_data.append(df)
                file_count += 1
        except Exception as e:
            logger.error(f"Error processing Excel file {file.name}: {str(e)}")
            continue

    if not all_data:
        logger.warning("merge_excel: no valid data found in any files")
        return None

    try:
        merged = pd.concat(all_data, ignore_index=True)
        output = BytesIO()
        merged.to_excel(output, index=False, engine="openpyxl")
        output.seek(0)
        logger.info(f"merge_excel: successfully merged {file_count} file(s)")
        return output
    except Exception as e:
        logger.error(f"Error merging Excel files: {str(e)}")
        return None


def merge_csv(files: list) -> Optional[BytesIO]:
    """
    Merge multiple CSV files into one combined dataset.
    
    Args:
        files: List of uploaded file objects
        
    Returns:
        BytesIO object with merged CSV data or None on failure
    """
    if not files:
        logger.warning("merge_csv: no files provided")
        return None

    all_data = []
    file_count = 0
    
    for file in files:
        try:
            logger.info(f"Processing CSV file: {file.name}")
            try:
                if hasattr(file, 'seek'): file.seek(0)
                df = pd.read_csv(file, encoding='utf-8-sig')
            except UnicodeDecodeError:
                if hasattr(file, 'seek'): file.seek(0)
                df = pd.read_csv(file, encoding='latin1')
            
            if df.empty:
                logger.debug(f"Skipping empty CSV: {file.name}")
                continue
            df["Source_File"] = file.name
            all_data.append(df)
            file_count += 1
        except Exception as e:
            logger.error(f"Error processing CSV file {file.name}: {str(e)}")
            continue

    if not all_data:
        logger.warning("merge_csv: no valid data found in any files")
        return None

    try:
        merged = pd.concat(all_data, ignore_index=True)
        # Write CSV to bytes explicitly to avoid encoding/buffer issues
        output = BytesIO()
        csv_bytes = merged.to_csv(index=False).encode("utf-8")
        output.write(csv_bytes)
        output.seek(0)
        logger.info(f"merge_csv: successfully merged {file_count} file(s)")
        return output
    except Exception as e:
        logger.error(f"Error merging CSV files: {str(e)}")
        return None
# -----------------------------------------------------------