def column_to_comma(text):
    """Convert column/newline-separated items to comma-separated list."""
    if not text or not text.strip():
        return ""
    items = [x.strip() for x in text.splitlines() if x.strip()]
    return ', '.join(items) if items else ""

def column_to_quoted_comma(text):
    """Convert column/newline-separated items to quoted comma-separated list."""
    if not text or not text.strip():
        return ""
    items = [f"'{x.strip()}'" for x in text.splitlines() if x.strip()]
    return ', '.join(items) if items else ""

def comma_to_column(text):
    """Convert comma-separated items to column/newline-separated list."""
    if not text or not text.strip():
        return ""
    items = [x.strip() for x in text.split(',') if x.strip()]
    return '\n'.join(items) if items else ""
