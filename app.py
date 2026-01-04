# ===========================================================
# MiniIQ Toolkit — Improved app.py
# ===========================================================

import streamlit as st
import logging
import pandas as pd
import html
from typing import Optional

from tools import list_tools, file_tools, add_modify
from helpers import (
    PAGE_TITLE,
    PAGE_ICON,
    LAYOUT,
    INITIAL_SIDEBAR_STATE,
    validate_text_input,
    format_error_message,
    render_copy_button,
    render_copy_button_only,
)

# ===========================================================
# LOGGING
# ===========================================================
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ===========================================================
# PAGE CONFIG
# ===========================================================
st.set_page_config(
    page_title=PAGE_TITLE,
    page_icon=PAGE_ICON,
    layout=LAYOUT,
    initial_sidebar_state=INITIAL_SIDEBAR_STATE
)

# ===========================================================
# SHARED UI HELPERS
# ===========================================================
def checkbox_grid(items, key_prefix, title=None, max_height=300):
    if title:
        st.markdown(f"### {title}")

    for item in items:
        st.session_state.setdefault(f"{key_prefix}_{item}", False)

    c1, c2 = st.columns(2)
    with c1:
        if st.button("✅ Select All", use_container_width=True):
            for item in items:
                st.session_state[f"{key_prefix}_{item}"] = True
            st.rerun()
    with c2:
        if st.button("🚫 Deselect All", use_container_width=True):
            for item in items:
                st.session_state[f"{key_prefix}_{item}"] = False
            st.rerun()

    n = len(items)
    if n <= 5:
        cols_per_row = n
    elif n <= 12:
        cols_per_row = 3
    elif n <= 24:
        cols_per_row = 4
    else:
        cols_per_row = 5

    selected = []
    st.markdown(
        f'<div style="max-height:{max_height}px; overflow-y:auto;">',
        unsafe_allow_html=True
    )

    for i in range(0, n, cols_per_row):
        cols = st.columns(cols_per_row)
        for j, item in enumerate(items[i:i + cols_per_row]):
            with cols[j]:
                if st.checkbox(item, key=f"{key_prefix}_{item}"):
                    selected.append(item)

    st.markdown("</div>", unsafe_allow_html=True)
    return selected


# ===========================================================
# HEADER
# ===========================================================
st.title("📦 MiniIQ Toolkit")
st.caption("Clean. Fast. Zero-nonsense data utilities.")
st.divider()

# ===========================================================
# TABS
# ===========================================================
tab_converter, tab_files = st.tabs(["⚙️ Column Converter", "📂 File Tools"])

# ===========================================================
# TAB 1 — ADVANCED COLUMN CONVERTER (SIDE-BY-SIDE)
# ===========================================================
with tab_converter:
    st.markdown("## ⚙️ Advanced Column Converter")
    st.caption("Paste data on the left → get formatted output on the right")

    # -------------------------------------------------------
    # Presets
    # -------------------------------------------------------
    sample_lines = "apple\nbanana\ncherry"
    p1, p2, p3 = st.columns(3)

    with p1:
        if st.button("📊 Comma CSV", use_container_width=True):
            st.session_state.update({
                "adv_input": sample_lines,
                "adv_delimiter": ", ",
                "adv_item_prefix": "",
                "adv_item_suffix": "",
                "adv_result_prefix": "",
                "adv_result_suffix": ""
            })
            st.rerun()

    with p2:
        if st.button("✨ Quoted CSV", use_container_width=True):
            st.session_state.update({
                "adv_input": sample_lines,
                "adv_delimiter": ", ",
                "adv_item_prefix": "'",
                "adv_item_suffix": "'",
                "adv_result_prefix": "",
                "adv_result_suffix": ""
            })
            st.rerun()

    with p3:
        if st.button("📋 Newline List", use_container_width=True):
            st.session_state.update({
                "adv_input": sample_lines,
                "adv_delimiter": "\n",
                "adv_item_prefix": "",
                "adv_item_suffix": "",
                "adv_result_prefix": "",
                "adv_result_suffix": ""
            })
            st.rerun()

    st.divider()

    # -------------------------------------------------------
    # Formatting rules
    # -------------------------------------------------------
    cfg1, cfg2, cfg3 = st.columns(3)
    with cfg1:
        delimiter = st.text_input("Delimiter", key="adv_delimiter")
    with cfg2:
        item_prefix = st.text_input("Item Prefix", key="adv_item_prefix")
        item_suffix = st.text_input("Item Suffix", key="adv_item_suffix")
    with cfg3:
        result_prefix = st.text_input("Result Prefix", key="adv_result_prefix")
        result_suffix = st.text_input("Result Suffix", key="adv_result_suffix")

    st.divider()

    # -------------------------------------------------------
    # ✅ Advanced Options (NEW)
    # -------------------------------------------------------
    st.markdown("### 🧠 Advanced Options")

    opt1, opt2, opt3, opt4 = st.columns(4)
    with opt1:
        remove_duplicates = st.checkbox("Remove duplicates", value=False)
    with opt2:
        sort_items = st.checkbox("Sort items", value=False)
    with opt3:
        ignore_comments = st.checkbox("Ignore comments", value=True)
    with opt4:
        strip_quotes = st.checkbox("Strip quotes", value=False)

    st.divider()

    # -------------------------------------------------------
    # SIDE-BY-SIDE INPUT / OUTPUT
    # -------------------------------------------------------
    left, right = st.columns(2, gap="large")

    with left:
        st.markdown("### 📥 Input")
        text_input = st.text_area(
            "",
            height=280,
            key="adv_input",
            placeholder="Enter (or paste) your column of data here",
            label_visibility="collapsed"
        )

    with right:
        st.markdown("### 📤 Output")

        if text_input and text_input.strip():
            is_valid, error_msg = validate_text_input(
                text_input,
                operation="advanced conversion"
            )

            if not is_valid:
                st.error(error_msg)
                output = ""
            else:
                try:
                    output = list_tools.convert_column_advanced(
                        text_input,
                        delimiter=delimiter or ",",
                        item_prefix=item_prefix,
                        item_suffix=item_suffix,
                        result_prefix=result_prefix,
                        result_suffix=result_suffix,
                        remove_duplicates=remove_duplicates,
                        sort_items=sort_items,
                        ignore_comments=ignore_comments,
                        strip_quotes=strip_quotes,
                    )
                except Exception as e:
                    st.error(format_error_message(e, "advanced conversion"))
                    output = ""
        else:
            output = ""

        st.text_area(
            "",
            value=output,
            height=280,
            disabled=True,
            placeholder="Your formatted output will appear here",
            label_visibility="collapsed"
        )

        if output:
            btn_cols = st.columns(2)
            with btn_cols[0]:
                render_copy_button_only(output)
            with btn_cols[1]:
                st.download_button(
                    "📥 Download",
                    data=output,
                    file_name="conversion.txt",
                    use_container_width=True
                )

# ===========================================================
# TAB 2 — FILE TOOLS
# ===========================================================
with tab_files:
    st.markdown("## 📂 File Tools")
    st.caption("Upload → Configure → Preview → Apply")

    st.markdown("### 🧰 File Operations")

    # Use session state to manage the active tool
    if 'active_section' not in st.session_state:
        st.session_state.active_section = "📊 Merge Excel"

    options = [
        "📊 Merge Excel",
        "📄 Merge CSV",
        "🗑️ Remove Columns",
        "✏️ Rename Columns",
        "🧩 Replace Blanks"
    ]
    
    cols = st.columns(len(options))
    for i, option in enumerate(options):
        with cols[i]:
            if st.button(option, use_container_width=True):
                st.session_state.active_section = option
                st.rerun()

    st.divider()

    # -------------------------------------------------------
    # MERGE EXCEL
    # -------------------------------------------------------
    if st.session_state.active_section == "📊 Merge Excel":
        files = st.file_uploader("Upload Excel files", type=["xlsx", "xls"], accept_multiple_files=True, key="merge_excel_uploader")
        if st.button("⚡ Merge", use_container_width=True, disabled=not files):
            output = file_tools.merge_excel(files)
            if output:
                st.success("✅ Excel files merged successfully!")
                st.download_button(
                    "📥 Download",
                    data=output.getvalue(),
                    file_name="merged_excel.xlsx",
                    use_container_width=True
                )
            else:
                st.error("❌ Merge operation failed. No data was returned.")

    # -------------------------------------------------------
    # MERGE CSV
    # -------------------------------------------------------
    elif st.session_state.active_section == "📄 Merge CSV":
        files = st.file_uploader("Upload CSV files", type=["csv"], accept_multiple_files=True, key="merge_csv_uploader")
        if st.button("⚡ Merge", use_container_width=True, disabled=not files):
            output = file_tools.merge_csv(files)
            if output:
                st.success("✅ CSV files merged successfully!")
                st.download_button(
                    "📥 Download",
                    data=output.getvalue(),
                    file_name="merged_csv.csv",
                    use_container_width=True
                )
            else:
                st.error("❌ Merge operation failed. No data was returned.")

    # -------------------------------------------------------
    # REMOVE COLUMNS
    # -------------------------------------------------------
    elif st.session_state.active_section == "🗑️ Remove Columns":
        file = st.file_uploader("Upload file", type=["xlsx", "xls", "csv"], key="remove_columns_uploader")

        if file:
            if file.size == 0:
                st.error("❌ The uploaded file is empty. Please upload a valid file.")
                st.stop()

            is_csv = file.name.endswith(".csv")
            file.seek(0)

            if is_csv:
                df = pd.read_csv(file, nrows=50)
                sheet = None
            else:
                xls = pd.ExcelFile(file)
                sheet = st.selectbox("Sheet", xls.sheet_names)
                file.seek(0)
                df = pd.read_excel(file, sheet_name=sheet, nrows=50)

            cols = df.columns.tolist()
            selected = checkbox_grid(cols, "remove", "Select columns to remove")

            st.divider()
            st.markdown("### Preview")
            st.dataframe(df.drop(columns=selected, errors="ignore").head(10))

            if st.button("⚡ Apply", use_container_width=True, disabled=not selected):
                file.seek(0)
                output, name = add_modify.remove_columns(file, selected, sheet, is_csv)
                if output:
                    st.success("✅ Columns removed successfully!")
                    st.download_button(
                        "📥 Download",
                        data=output.getvalue(),
                        file_name=f"{name}_cleaned.csv" if is_csv else f"{name}_cleaned.xlsx",
                        use_container_width=True
                    )
                else:
                    st.error(f"❌ Operation failed: {name}")

    # -------------------------------------------------------
    # RENAME COLUMNS
    # -------------------------------------------------------
    elif st.session_state.active_section == "✏️ Rename Columns":
        file = st.file_uploader("Upload file", type=["xlsx", "xls", "csv"], key="rename_columns_uploader")

        if file:
            if file.size == 0:
                st.error("❌ The uploaded file is empty. Please upload a valid file.")
                st.stop()

            is_csv = file.name.endswith(".csv")
            file.seek(0)

            if is_csv:
                df = pd.read_csv(file, nrows=50)
                sheet = None
            else:
                xls = pd.ExcelFile(file)
                sheet = st.selectbox("Sheet", xls.sheet_names)
                file.seek(0)
                df = pd.read_excel(file, sheet_name=sheet, nrows=50)

            cols = df.columns.tolist()
            selected = checkbox_grid(cols, "rename", "Select columns to rename")

            rename_map = {}
            for col in selected:
                new = st.text_input(f"Rename `{col}` →", value=col)
                if new != col:
                    rename_map[col] = new

            st.divider()
            st.markdown("### Preview")
            st.dataframe(df.rename(columns=rename_map).head(10))

            if st.button("⚡ Apply", use_container_width=True, disabled=not rename_map):
                output, name = add_modify.bulk_rename_columns(file, rename_map, sheet, False, is_csv)
                if output:
                    st.success("✅ Columns renamed successfully!")
                    st.download_button(
                        "📥 Download",
                        data=output.getvalue(),
                        file_name=f"{name}_renamed.csv" if is_csv else f"{name}_renamed.xlsx",
                        use_container_width=True
                    )
                else:
                    st.error(f"❌ Operation failed: {name}")

    # -------------------------------------------------------
    # REPLACE BLANK VALUES
    # -------------------------------------------------------
    elif st.session_state.active_section == "🧩 Replace Blanks":
        file = st.file_uploader("Upload file", type=["xlsx", "xls", "csv"], key="replace_blanks_uploader")

        if file:
            if file.size == 0:
                st.error("❌ The uploaded file is empty. Please upload a valid file.")
                st.stop()

            is_csv = file.name.endswith(".csv")
            file.seek(0)

            if is_csv:
                df = pd.read_csv(file, nrows=50)
                sheet = None
            else:
                xls = pd.ExcelFile(file)
                sheet = st.selectbox("Sheet", xls.sheet_names)
                file.seek(0)
                df = pd.read_excel(file, sheet_name=sheet, nrows=50)

            cols = df.columns.tolist()
            selected = checkbox_grid(cols, "blank", "Apply to columns (none = all)")
            replace_val = st.text_input("Replace blanks with")

            if st.button("⚡ Apply", use_container_width=True, disabled=not replace_val):
                file.seek(0)
                output, name = add_modify.replace_blank_values(
                    file,
                    replace_val,
                    sheet,
                    False,
                    selected or None,
                    is_csv
                )
                if output:
                    st.success("✅ Blank values replaced successfully!")
                    st.download_button(
                        "📥 Download",
                        data=output.getvalue(),
                        file_name=f"{name}_filled.csv" if is_csv else f"{name}_filled.xlsx",
                        use_container_width=True
                    )
                else:
                    st.error(f"❌ Operation failed: {name}")
