"""
Text and list conversion tools for the MiniIQ Toolkit.
Provides utilities for converting between different data formats.
"""

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)


def convert_column_advanced(
    text: str,
    delimiter: str = ",",
    item_prefix: str = "",
    item_suffix: str = "",
    result_prefix: str = "",
    result_suffix: str = ""
) -> str:
    """
    Advanced column conversion with customizable delimiters and wrapping.
    Core function used by all converters.
    
    Args:
        text: Newline-separated text
        delimiter: Character(s) to use as delimiter (default: ",")
        item_prefix: Prefix to add before each item
        item_suffix: Suffix to add after each item
        result_prefix: Prefix to add at the start of result
        result_suffix: Suffix to add at the end of result
        
    Returns:
        Converted string with custom formatting
    """
    try:
        if not text or not text.strip():
            return ""
        
        # Extract and clean items
        items = [x.strip() for x in text.splitlines() if x.strip()]
        
        if not items:
            return ""
        
        # Apply item-level wrapping
        wrapped_items = [f"{item_prefix}{item}{item_suffix}" for item in items]
        
        # Join with delimiter
        joined = delimiter.join(wrapped_items)
        
        # Apply result-level wrapping
        result = f"{result_prefix}{joined}{result_suffix}"
        
        logger.info(f"convert_column_advanced: converted {len(items)} items with delimiter='{delimiter}'")
        return result
    except Exception as e:
        logger.error(f"Error in convert_column_advanced: {str(e)}")
        return ""


def column_to_comma(text: str) -> str:
    """
    Convert column (newline) data into a comma-separated list.
    
    Args:
        text: Newline-separated text
        
    Returns:
        Comma-separated string
    """
    try:
        result = convert_column_advanced(text, delimiter=", ")
        logger.debug(f"column_to_comma: converted text")
        return result
    except Exception as e:
        logger.error(f"Error in column_to_comma: {str(e)}")
        return ""


def column_to_quoted_comma(text: str) -> str:
    """
    Convert column (newline) data into a quoted comma-separated list.
    
    Args:
        text: Newline-separated text
        
    Returns:
        Quoted comma-separated string
    """
    try:
        result = convert_column_advanced(text, delimiter=", ", item_prefix="'", item_suffix="'")
        logger.debug(f"column_to_quoted_comma: converted text")
        return result
    except Exception as e:
        logger.error(f"Error in column_to_quoted_comma: {str(e)}")
        return ""


def comma_to_column(text: str) -> str:
    """
    Convert comma-separated values into newline-separated column.
    
    Args:
        text: Comma-separated text
        
    Returns:
        Newline-separated string
    """
    try:
        if not text or not text.strip():
            return ""
        items = [x.strip() for x in text.split(",") if x.strip()]
        result = "\n".join(items) if items else ""
        logger.debug(f"comma_to_column: converted {len(items)} items")
        return result
    except Exception as e:
        logger.error(f"Error in comma_to_column: {str(e)}")
        return ""


def spaces_to_commas(text: str) -> str:
    """
    Replace spaces with commas, collapsing multiple spaces.
    
    Args:
        text: Text with spaces
        
    Returns:
        Text with spaces replaced by commas
    """
    try:
        if not text or not text.strip():
            return ""
        # Collapse multiple whitespace into single space then replace
        collapsed = re.sub(r"\s+", " ", text.strip())
        result = collapsed.replace(" ", ",")
        logger.debug(f"spaces_to_commas: processed text")
        return result
    except Exception as e:
        logger.error(f"Error in spaces_to_commas: {str(e)}")
        return ""



def newlines_to_commas(text: str) -> str:
    """
    Replace newlines with commas, strip carriage returns.
    
    Args:
        text: Newline-separated text
        
    Returns:
        Comma-separated string
    """
    try:
        if not text or not text.strip():
            return ""
        result = ",".join([line.strip() for line in text.splitlines() if line.strip()])
        logger.debug(f"newlines_to_commas: processed text")
        return result
    except Exception as e:
        logger.error(f"Error in newlines_to_commas: {str(e)}")
        return ""
# -----------------------------------------------------------