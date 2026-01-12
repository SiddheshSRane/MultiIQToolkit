"""
Text and list conversion tools for the MiniIQ Toolkit.
Provides utilities for converting between different data formats.
"""

import logging
import re
import pandas as pd
from typing import List, Optional

logger = logging.getLogger(__name__)


# ===========================================================
# CORE ADVANCED CONVERTER (EXTENDED, BACKWARD SAFE)
# ===========================================================
def convert_column_advanced(
    text: str,
    delimiter: str = ",",
    item_prefix: str = "",
    item_suffix: str = "",
    result_prefix: str = "",
    result_suffix: str = "",
    *,
    remove_duplicates: bool = False,
    sort_items: bool = False,
    reverse_items: bool = False,
    ignore_comments: bool = True,
    comment_prefixes: tuple = ("#", "//"),
    keep_empty: bool = False,
    strip_quotes: bool = False,
    trim_items: bool = False,
    case_transform: str = "none",  # "none", "upper", "lower", "title"
) -> str:
    """
    Advanced column conversion with customizable delimiters and wrapping.

    Features:
    - remove_duplicates
    - sort_items / reverse_items
    - ignore_comments
    - trim_items / strip_quotes
    - case_transform (upper, lower, title)
    """

    try:
        if not text:
            return ""

        # Unescape delimiter
        if delimiter == "\\n": delimiter = "\n"
        if delimiter == "\\t": delimiter = "\t"

        # Normalize newlines
        lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")

        items: List[str] = []
        for line in lines:
            raw = line.strip() if trim_items else line

            if not raw and not keep_empty:
                continue

            if ignore_comments and raw.strip().startswith(comment_prefixes):
                continue

            if strip_quotes:
                raw = raw.strip("\"'")

            if case_transform == "upper":
                raw = raw.upper()
            elif case_transform == "lower":
                raw = raw.lower()
            elif case_transform == "title":
                raw = raw.title()

            items.append(raw)

        if not items:
            return ""

        # Remove duplicates (preserve order)
        if remove_duplicates:
            seen = set()
            items = [x for x in items if not (x in seen or seen.add(x))]

        # Sort items
        if sort_items:
            items = sorted(items)
        
        # Reverse items
        if reverse_items:
            items = items[::-1]

        # Apply wrapping
        wrapped_items = [
            f"{item_prefix}{item}{item_suffix}" for item in items
        ]

        joined = delimiter.join(wrapped_items)
        result = f"{result_prefix}{joined}{result_suffix}"

        logger.info(
            f"convert_column_advanced: {len(items)} items | "
            f"dedupe={remove_duplicates}, sort={sort_items}, reverse={reverse_items}"
        )
        return result

    except Exception as e:
        logger.error(f"Error in convert_column_advanced: {str(e)}")
        return ""


# ===========================================================
# SIMPLE PRESETS (UNCHANGED)
# ===========================================================
def column_to_comma(text: str) -> str:
    return convert_column_advanced(text, delimiter=", ")


def column_to_quoted_comma(text: str) -> str:
    return convert_column_advanced(
        text,
        delimiter=", ",
        item_prefix="'",
        item_suffix="'"
    )


def comma_to_column(text: str) -> str:
    try:
        if not text or not text.strip():
            return ""
        items = [x.strip() for x in text.split(",") if x.strip()]
        return "\n".join(items)
    except Exception as e:
        logger.error(f"Error in comma_to_column: {str(e)}")
        return ""


# ===========================================================
# EXTRA UTILITIES (NEW)
# ===========================================================
def split_by_pattern(text: str, pattern: str) -> str:
    """
    Split text by a regex pattern and return newline-separated values.
    Example pattern: r"[;,|]"
    """
    try:
        if not text or not text.strip():
            return ""
        parts = [x.strip() for x in re.split(pattern, text) if x.strip()]
        return "\n".join(parts)
    except Exception as e:
        logger.error(f"Error in split_by_pattern: {str(e)}")
        return ""


def spaces_to_commas(text: str) -> str:
    try:
        if not text or not text.strip():
            return ""
        collapsed = re.sub(r"\s+", " ", text.strip())
        return collapsed.replace(" ", ",")
    except Exception as e:
        logger.error(f"Error in spaces_to_commas: {str(e)}")
        return ""


def newlines_to_commas(text: str) -> str:
    try:
        if not text or not text.strip():
            return ""
        return ",".join(
            line.strip() for line in text.splitlines() if line.strip()
        )
    except Exception as e:
        logger.error(f"Error in newlines_to_commas: {str(e)}")
        return ""


# ===========================================================
# METADATA / STATS (NEW)
# ===========================================================
def column_stats(text: str) -> dict:
    """
    Return useful stats about a column of text.
    """
    try:
        if not text or not text.strip():
            return {
                "total_lines": 0,
                "non_empty": 0,
                "unique": 0
            }

        lines = [x.strip() for x in text.splitlines()]
        non_empty = [x for x in lines if x]

        return {
            "total_lines": len(lines),
            "non_empty": len(non_empty),
            "unique": len(set(non_empty))
        }
    except Exception as e:
        logger.error(f"Error in column_stats: {str(e)}")
        return {}


def convert_dates_text(text: str, target_format: str) -> str:
    """
    Converts a newline-separated list of date strings to the target format.
    Invalid dates are preserved as-is. Includes line-by-line fallback for mixed formats.
    """
    logger.info(f"convert_dates_text: input_length={len(text)}, format={target_format}")
    try:
        if not text:
            return ""

        lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        results = []

        # Target format normalization
        fmt = target_format
        if fmt == "ISO 8601":
            fmt = "%Y-%m-%dT%H:%M:%S"

        for line in lines:
            if not line.strip():
                results.append("")
                continue
            
            try:
                # Try parsing with format='mixed' for high coverage
                dt = pd.to_datetime(line, errors="coerce", format="mixed", dayfirst=True)
                
                if pd.notna(dt):
                    results.append(dt.strftime(fmt))
                else:
                    results.append(line)  # Preserve invalid as-is
            except Exception:
                results.append(line)

        logger.info(f"convert_dates_text: processed {len(lines)} lines")
        return "\n".join(results)

    except Exception as e:
        logger.error(f"Error in convert_dates_text: {str(e)}", exc_info=True)
        return text 
