"""
Consolidated helpers module for MiniIQ Toolkit.
Includes configuration, utilities, validation, and UI components.
"""

import logging
import streamlit as st
import html
from typing import Any, Optional, Tuple
from pathlib import Path

# ===========================================================
# LOGGING CONFIG
# ===========================================================
LOG_LEVEL = logging.INFO
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
logger = logging.getLogger(__name__)
logger.setLevel(LOG_LEVEL)

LOGS_DIR = Path(__file__).parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# ===========================================================
# FILE LIMITS
# ===========================================================
MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
MAX_ROWS_DISPLAY = 10000
MAX_COLUMNS_DISPLAY = 100
MAX_MERGE_FILES = 100

# ===========================================================
# TEXT PROCESSING LIMITS
# ===========================================================
MAX_TEXT_LENGTH = 1_000_000
MAX_TEXT_LINES = 50_000

# ===========================================================
# SUPPORTED FILE TYPES
# ===========================================================
ALLOWED_EXCEL_TYPES = ["xlsx", "xls"]
ALLOWED_CSV_TYPES = ["csv"]

# ===========================================================
# UI CONFIGURATION
# ===========================================================
PAGE_TITLE = "📦 MiniIQ Toolkit"
PAGE_ICON = "📦"
LAYOUT = "wide"
INITIAL_SIDEBAR_STATE = "collapsed"

# ===========================================================
# COLORS
# ===========================================================
COLOR_PRIMARY = "#00B4D8"
COLOR_BG_DARK = "#0F1117"
COLOR_SUCCESS = "#28A745"
COLOR_ERROR = "#DC3545"
COLOR_WARNING = "#FFC107"

# ===========================================================
# VALIDATION MESSAGES
# ===========================================================
ERROR_EMPTY_INPUT = "❌ Input cannot be empty"
ERROR_FILE_TOO_LARGE = f"❌ File exceeds {MAX_FILE_SIZE_MB}MB limit"
ERROR_INVALID_FORMAT = "❌ Invalid file format"
ERROR_EMPTY_FILE_LIST = "❌ No files selected"
ERROR_INVALID_SHEET = "❌ Invalid sheet name"

# ===========================================================
# VALIDATION FUNCTIONS
# ===========================================================
def validate_text_input(text: str, operation: str = "process") -> Tuple[bool, Optional[str]]:
    if text is None or not isinstance(text, str) or text.strip() == "":
        return False, ERROR_EMPTY_INPUT

    if len(text) > MAX_TEXT_LENGTH:
        return False, f"❌ Input exceeds maximum length ({MAX_TEXT_LENGTH} characters)"

    if text.count("\n") + 1 > MAX_TEXT_LINES:
        return False, f"❌ Input exceeds maximum line count ({MAX_TEXT_LINES} lines)"

    return True, None


def validate_file_extension(filename: str, allowed_types: list) -> Tuple[bool, Optional[str]]:
    if not filename:
        return False, "❌ Invalid filename"

    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in allowed_types:
        return False, f"❌ Invalid format. Allowed: {', '.join(allowed_types)}"

    return True, None


def sanitize_column_name(name: str) -> str:
    if not name:
        return "Unnamed"
    name = name.strip().replace("\n", " ").replace("\r", " ")
    return name or "Unnamed"


def safe_getattr(obj: Any, attr: str, default: Any = None) -> Any:
    try:
        return getattr(obj, attr, default)
    except Exception:
        return default


def format_error_message(exception: Exception, context: str = "operation") -> str:
    msg = str(exception)
    logger.error(f"Error during {context}: {msg}")

    if "column" in msg.lower():
        return f"❌ Column operation failed: {msg}"
    if "sheet" in msg.lower():
        return f"❌ Sheet operation failed: {msg}"
    if "file" in msg.lower():
        return f"❌ File operation failed: {msg}"

    return f"❌ {context.capitalize()} failed: {msg}"

# ===========================================================
# COPY BUTTON HELPERS (STREAMLIT-SAFE)
# ===========================================================
def render_copy_button(text: str, button_text: str = "📋 Copy to Clipboard") -> None:
    """
    Render text + copy button (shows text).
    """
    import uuid
    import base64

    uid = uuid.uuid4().hex[:8]
    safe_text = html.escape(text)
    text_b64 = base64.b64encode(text.encode()).decode()

    st.markdown(
        f"""
        <div style="display:flex;gap:10px;">
            <pre style="
                flex:1;
                white-space:pre-wrap;
                padding:8px;
                border-radius:6px;
                background:#f6f8fa;
                border:1px solid #ddd;
            ">{safe_text}</pre>

            <button
                id="copy_btn_{uid}"
                style="
                    padding:8px 12px;
                    border-radius:6px;
                    border:none;
                    background:{COLOR_PRIMARY};
                    color:white;
                    cursor:pointer;
                "
                onclick="
                    (function() {{
                        navigator.clipboard.writeText(atob('{text_b64}')).then(() => {{
                            const b = document.getElementById('copy_btn_{uid}');
                            b.innerText = 'Copied';
                            setTimeout(() => b.innerText = '{button_text}', 1500);
                        }});
                    }})();
                "
            >
                {button_text}
            </button>
        </div>
        """,
        unsafe_allow_html=True
    )


def render_copy_button_only(text: str, button_text: str = "📋 Copy Result") -> None:
    import streamlit.components.v1 as components
    import base64
    import uuid

    uid = uuid.uuid4().hex[:8]
    text_b64 = base64.b64encode(text.encode()).decode()

    components.html(
        f"""
        <html>
        <body style="margin:0;padding:0;">
            <button
                id="copy_{uid}"
                style="
                    width:100%;
                    padding:8px 12px;
                    border-radius:6px;
                    border:none;
                    background:#00B4D8;
                    color:white;
                    cursor:pointer;
                    font-size:14px;
                "
            >
                {button_text}
            </button>

            <script>
                const btn = document.getElementById("copy_{uid}");
                btn.onclick = () => {{
                    const text = atob("{text_b64}");
                    navigator.clipboard.writeText(text).then(() => {{
                        btn.innerText = "✅ Copied";
                        setTimeout(() => btn.innerText = "{button_text}", 1500);
                    }});
                }};
            </script>
        </body>
        </html>
        """,
        height=45,
    )
