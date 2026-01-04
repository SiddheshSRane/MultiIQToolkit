"""
Consolidated helpers module for MiniIQ Toolkit.
Includes configuration, utilities, validation, and UI components.
"""

import logging
import streamlit as st
from typing import Any, Optional, Tuple
from pathlib import Path

# ===== LOGGING CONFIG =====
LOG_LEVEL = logging.INFO
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
logger = logging.getLogger(__name__)
logger.setLevel(LOG_LEVEL)

# Create logs directory if it doesn't exist
LOGS_DIR = Path(__file__).parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# ===== FILE LIMITS =====
MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
MAX_ROWS_DISPLAY = 10000
MAX_COLUMNS_DISPLAY = 100
MAX_MERGE_FILES = 100

# ===== TEXT PROCESSING LIMITS =====
MAX_TEXT_LENGTH = 1_000_000
MAX_TEXT_LINES = 50_000

# ===== SUPPORTED FILE TYPES =====
ALLOWED_EXCEL_TYPES = ["xlsx", "xls"]
ALLOWED_CSV_TYPES = ["csv"]

# ===== UI CONFIGURATION =====
PAGE_TITLE = "📦 MiniIQ Toolkit"
PAGE_ICON = "📦"
LAYOUT = "wide"
INITIAL_SIDEBAR_STATE = "collapsed"

# ===== COLORS =====
COLOR_PRIMARY = "#00B4D8"
COLOR_BG_DARK = "#0F1117"
COLOR_SUCCESS = "#28A745"
COLOR_ERROR = "#DC3545"
COLOR_WARNING = "#FFC107"

# ===== TIMEOUT SETTINGS =====
PROCESSING_TIMEOUT_SECONDS = 120

# ===== VALIDATION MESSAGES =====
ERROR_EMPTY_INPUT = "❌ Input cannot be empty"
ERROR_FILE_TOO_LARGE = f"❌ File exceeds {MAX_FILE_SIZE_MB}MB limit"
ERROR_INVALID_FORMAT = "❌ Invalid file format"
ERROR_EMPTY_FILE_LIST = "❌ No files selected"
ERROR_INVALID_SHEET = "❌ Invalid sheet name"

# ===== VALIDATION FUNCTIONS =====

def validate_text_input(text: str, operation: str = "process") -> Tuple[bool, Optional[str]]:
    """
    Validate text input for length and line limits.
    
    Args:
        text: Input text to validate
        operation: Description of operation (for logging)
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not text or not text.strip():
        logger.warning(f"Text validation failed for {operation}: empty input")
        return False, ERROR_EMPTY_INPUT
    
    if len(text) > MAX_TEXT_LENGTH:
        msg = f"❌ Input exceeds {MAX_TEXT_LENGTH:,} character limit"
        logger.warning(f"Text validation failed for {operation}: {msg}")
        return False, msg
    
    lines = text.count("\n")
    if lines > MAX_TEXT_LINES:
        msg = f"❌ Input exceeds {MAX_TEXT_LINES:,} line limit"
        logger.warning(f"Text validation failed for {operation}: {msg}")
        return False, msg
    
    logger.info(f"Text validation passed for {operation}")
    return True, None


def validate_file_size(file_size_bytes: int) -> Tuple[bool, Optional[str]]:
    """
    Validate file size against limits.
    
    Args:
        file_size_bytes: Size of file in bytes
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if file_size_bytes > MAX_FILE_SIZE_BYTES:
        logger.warning(f"File size validation failed: {file_size_bytes} bytes exceeds limit")
        return False, ERROR_FILE_TOO_LARGE
    
    logger.info(f"File size validation passed: {file_size_bytes} bytes")
    return True, None


def validate_file_extension(filename: str, allowed_types: list) -> Tuple[bool, Optional[str]]:
    """
    Validate file extension against allowed types.
    
    Args:
        filename: Name of file
        allowed_types: List of allowed extensions (e.g., ['xlsx', 'xls'])
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not filename:
        return False, "❌ Invalid filename"
    
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    
    if extension not in allowed_types:
        msg = f"❌ Invalid format. Allowed: {', '.join(allowed_types)}"
        logger.warning(f"File extension validation failed for {filename}: {msg}")
        return False, msg
    
    logger.info(f"File extension validation passed for {filename}")
    return True, None


def sanitize_column_name(name: str) -> str:
    """
    Sanitize column name to prevent issues.
    
    Args:
        name: Original column name
        
    Returns:
        Sanitized column name
    """
    if not name:
        return "Unnamed"
    
    name = name.strip()
    name = name.replace("\n", " ").replace("\r", " ")
    
    return name if name else "Unnamed"


def safe_getattr(obj: Any, attr: str, default: Any = None) -> Any:
    """
    Safely get attribute from object with logging.
    
    Args:
        obj: Object to access
        attr: Attribute name
        default: Default value if attribute not found
        
    Returns:
        Attribute value or default
    """
    try:
        return getattr(obj, attr, default)
    except Exception as e:
        logger.warning(f"Failed to get attribute '{attr}': {str(e)}")
        return default


def format_error_message(exception: Exception, context: str = "operation") -> str:
    """
    Format an exception into a user-friendly error message.
    
    Args:
        exception: The exception that occurred
        context: Context description (for logging)
        
    Returns:
        Formatted error message
    """
    error_str = str(exception)
    logger.error(f"Error during {context}: {error_str}")
    
    # Return a user-friendly message
    if "column" in error_str.lower():
        return f"❌ Column operation failed: {error_str}"
    elif "sheet" in error_str.lower():
        return f"❌ Sheet operation failed: {error_str}"
    elif "file" in error_str.lower():
        return f"❌ File operation failed: {error_str}"
    else:
        return f"❌ {context.capitalize()} failed: {error_str}"


# ===== UI HELPER FUNCTIONS =====

def render_copy_button(text: str, button_text: str = "📋 Copy to Clipboard") -> None:
    """
    Render text in a code block with native Streamlit copy functionality.
    
    Args:
        text: Text to copy
        button_text: Button label text (unused, kept for compatibility)
    """
    st.code(text, language="text")


def render_copy_button_custom(text: str) -> None:
    """
    Render a custom copy button using JavaScript with proper escaping.
    
    Args:
        text: Text to copy to clipboard
    """
    import uuid
    import base64
    
    button_id = f"copy_btn_{uuid.uuid4().hex[:8]}"
    text_b64 = base64.b64encode(text.encode()).decode()
    
    html = f"""
    <script>
    function copyToClipboard_{uuid.uuid4().hex[:8]}() {{
        const text = atob('{text_b64}');
        navigator.clipboard.writeText(text).then(() => {{
            console.log('Copied to clipboard');
        }}).catch(err => {{
            console.error('Failed to copy:', err);
        }});
    }}
    </script>
    <button style="
        margin-top:8px;
        padding:8px 16px;
        background-color:#00B4D8;
        color:white;
        border:none;
        border-radius:6px;
        cursor:pointer;
        transition: all 0.3s ease;
        font-weight: 600;"
        onmouseover="this.style.backgroundColor='#0096C7'"
        onmouseout="this.style.backgroundColor='#00B4D8'"
        onclick="copyToClipboard_{uuid.uuid4().hex[:8]}()">
        📋 Copy to Clipboard
    </button>
    """
    
    st.markdown(html, unsafe_allow_html=True)
