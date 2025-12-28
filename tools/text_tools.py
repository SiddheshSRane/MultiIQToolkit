import re

def to_upper(text):
    """Convert text to uppercase with input validation."""
    return text.upper() if text else ""

def to_lower(text):
    """Convert text to lowercase with input validation."""
    return text.lower() if text else ""

def to_proper(text):
    """Convert text to proper case."""
    if not text:
        return ""
    return ' '.join(w.capitalize() for w in text.split())

def replace_spaces_with_commas(text):
    """Replace spaces with commas."""
    return text.replace(' ', '') if text else ""

def replace_newlines_with_commas(text):
    """Replace newlines with commas."""
    if not text:
        return ""
    return text.replace('\n', ',').replace('\r', '')

def regex_replace(text, pattern, repl):
    """Replace text using regex pattern with error handling."""
    if not text or not pattern:
        return ""
    try:
        return re.sub(pattern, repl, text)
    except re.error as e:
        return f"❌ Regex Error: {str(e)}"
