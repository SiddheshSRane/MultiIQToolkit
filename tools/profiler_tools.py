import io
import pandas as pd
import matplotlib.pyplot as plt

def load_file(file):
    """Load Excel or CSV file based on extension."""
    if file.name.endswith(".csv"):
        return pd.read_csv(file)
    return pd.read_excel(file)

def get_summary(df: pd.DataFrame) -> pd.DataFrame:
    """Return column-level summary."""
    summary = pd.DataFrame({
        "Data Type": df.dtypes,
        "Non-Null Count": df.notnull().sum(),
        "Missing (%)": df.isnull().mean() * 100,
        "Unique Values": df.nunique(),
    })
    # For numeric columns
    numeric_cols = df.select_dtypes(include=["number"]).columns
    if len(numeric_cols) > 0:
        summary["Mean"] = df[numeric_cols].mean(skipna=True)
        summary["Std Dev"] = df[numeric_cols].std(skipna=True)
    return summary.round(2)

def get_basic_info(df: pd.DataFrame) -> dict:
    """Return general dataset info."""
    return {
        "Rows": df.shape[0],
        "Columns": df.shape[1],
        "Missing Cells": int(df.isnull().sum().sum()),
        "Total Cells": int(df.size),
        "Missing (%)": round((df.isnull().sum().sum() / df.size) * 100, 2),
        "Memory Usage (MB)": round(df.memory_usage().sum() / 1e6, 2),
    }

def plot_missing_values(df: pd.DataFrame):
    """Plot missing value heatmap."""
    plt.figure(figsize=(10, 4))
    df.isnull().mean().sort_values(ascending=False).plot.bar(color="cyan")
    plt.title("Missing Values (%)")
    plt.ylabel("Percentage")
    plt.tight_layout()
    buffer = io.BytesIO()
    plt.savefig(buffer, format="png", bbox_inches="tight")
    buffer.seek(0)
    return buffer

def plot_numeric_distribution(df: pd.DataFrame):
    """Plot numeric distributions."""
    numeric_cols = df.select_dtypes(include=["number"]).columns
    if len(numeric_cols) == 0:
        return None
    df[numeric_cols].hist(bins=20, figsize=(10, 6), color="#00D9FF", edgecolor="black")
    plt.tight_layout()
    buffer = io.BytesIO()
    plt.savefig(buffer, format="png", bbox_inches="tight")
    buffer.seek(0)
    return buffer

def export_profile_to_excel(df, summary):
    """Export profile summary and data preview to Excel bytes."""
    import io
    output = io.BytesIO()
    try:
        with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
            summary.to_excel(writer, sheet_name="Summary")
            df.head(50).to_excel(writer, sheet_name="Preview", index=False)
    except ModuleNotFoundError:
        # fallback to openpyxl if xlsxwriter is missing
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            summary.to_excel(writer, sheet_name="Summary")
            df.head(50).to_excel(writer, sheet_name="Preview", index=False)
    output.seek(0)
    return output

# ------------------------------------
# END OF FILE