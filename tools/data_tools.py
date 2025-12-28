import io
import pandas as pd

def load_excel(file):
    """Load Excel file into a DataFrame."""
    return pd.read_excel(file)

def merge_columns(df, cols, sep="_", new_name="merged"):
    """Merge multiple columns into one."""
    df[new_name] = df[cols].astype(str).agg(sep.join, axis=1)
    return df

def split_column(df, column, delimiter=","):
    """Split one column into multiple based on a delimiter."""
    new_cols = df[column].str.split(delimiter, expand=True)
    new_cols.columns = [f"{column}_{i+1}" for i in range(new_cols.shape[1])]
    return pd.concat([df, new_cols], axis=1)

def clean_data(df, trim=True, dedup=True, fill_value=None):
    """Clean data: trim, deduplicate, fill missing values."""
    if trim:
        df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
    if dedup:
        df = df.drop_duplicates()
    if fill_value is not None:
        df = df.fillna(fill_value)
    return df

def validate_data(df):
    """Validate data and return report."""
    report = {}
    for col in df.columns:
        if df[col].isnull().any():
            report[col] = f"{df[col].isnull().sum()} missing values"
    return report if report else None

def to_excel_bytes(df):
    """Return DataFrame as Excel bytes."""
    output = io.BytesIO()
    df.to_excel(output, index=False)
    output.seek(0)
    return output
# ------------------------------------
# END OF FILE   