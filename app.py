# ===========================================================
# 📦 MiniIQ Toolkit — app.py (Full + Stats, No Regressions)
# ===========================================================

import streamlit as st
import logging
import pandas as pd

from tools import list_tools, file_tools, add_modify, file_merger
from tools.list_tools import column_stats
from helpers import (
    PAGE_TITLE,
    PAGE_ICON,
    LAYOUT,
    INITIAL_SIDEBAR_STATE,
    validate_text_input,
    format_error_message,
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

    selected = []
    st.markdown(
        f'<div style="max-height:{max_height}px; overflow-y:auto;">',
        unsafe_allow_html=True
    )

    cols_per_row = min(5, max(1, len(items)))
    for i in range(0, len(items), cols_per_row):
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
# TAB 1 — ADVANCED COLUMN CONVERTER (FULL)
# ===========================================================
with tab_converter:
    st.markdown("## ⚙️ Advanced Column Converter")
    st.caption("Paste data → format → inspect → export")

    # ---------------- PRESETS ----------------
    sample = "apple\nbanana\ncherry"
    p1, p2, p3 = st.columns(3)

    with p1:
        if st.button("📊 Comma CSV", use_container_width=True):
            st.session_state.update({
                "adv_input": sample,
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
                "adv_input": sample,
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
                "adv_input": sample,
                "adv_delimiter": "\n",
                "adv_item_prefix": "",
                "adv_item_suffix": "",
                "adv_result_prefix": "",
                "adv_result_suffix": ""
            })
            st.rerun()

    st.divider()

    # ---------------- FORMAT OPTIONS ----------------
    c1, c2, c3 = st.columns(3)
    with c1:
        delimiter = st.text_input("Delimiter", key="adv_delimiter")
    with c2:
        item_prefix = st.text_input("Item Prefix", key="adv_item_prefix")
        item_suffix = st.text_input("Item Suffix", key="adv_item_suffix")
    with c3:
        result_prefix = st.text_input("Result Prefix", key="adv_result_prefix")
        result_suffix = st.text_input("Result Suffix", key="adv_result_suffix")

    st.divider()

    # ---------------- ADVANCED OPTIONS ----------------
    st.markdown("### 🧠 Advanced Options")
    o1, o2, o3, o4 = st.columns(4)
    with o1:
        remove_duplicates = st.checkbox("Remove duplicates")
    with o2:
        sort_items = st.checkbox("Sort items")
    with o3:
        ignore_comments = st.checkbox("Ignore comments", value=True)
    with o4:
        strip_quotes = st.checkbox("Strip quotes")

    st.divider()

    # ---------------- INPUT / OUTPUT ----------------
    left, right = st.columns(2, gap="large")

    with left:
        st.markdown("### 📥 Input")
        text_input = st.text_area(
            "",
            height=300,
            key="adv_input",
            placeholder="Paste your column data here",
            label_visibility="collapsed"
        )

        if text_input and text_input.strip():
            stats = column_stats(text_input)
            s1, s2, s3 = st.columns(3)
            s1.metric("Lines", stats["total_lines"])
            s2.metric("Non-empty", stats["non_empty"])
            s3.metric("Unique", stats["unique"])

    with right:
        st.markdown("### 📤 Output")

        if text_input and text_input.strip():
            valid, err = validate_text_input(text_input, "conversion")
            if not valid:
                st.error(err)
                output = ""
            else:
                output = list_tools.convert_column_advanced(
                    text_input,
                    delimiter=delimiter or ", ",
                    item_prefix=item_prefix,
                    item_suffix=item_suffix,
                    result_prefix=result_prefix,
                    result_suffix=result_suffix,
                    remove_duplicates=remove_duplicates,
                    sort_items=sort_items,
                    ignore_comments=ignore_comments,
                    strip_quotes=strip_quotes,
                )
        else:
            output = ""

        st.text_area(
            "",
            value=output,
            height=300,
            disabled=True,
            placeholder="Formatted output appears here",
            label_visibility="collapsed"
        )

        if output:
            b1, b2 = st.columns(2)
            with b1:
                render_copy_button_only(output)
            with b2:
                st.download_button(
                    "📥 Download",
                    data=output,
                    file_name="conversion.txt",
                    use_container_width=True
                )

# ===========================================================
# TAB 2 — FILE TOOLS (UNCHANGED + STATS)
# ===========================================================
with tab_files:
    st.markdown("## 📂 File Tools")
    st.caption("Upload → Preview → Apply (with stats)")

    if "active_section" not in st.session_state:
        st.session_state.active_section = "📊 Merge Excel"

    options = [
        "📊 Merge Excel",
        "📄 Merge CSV",
        "🔗 Common Merger",
        "🗑️ Remove Columns",
        "✏️ Rename Columns",
        "🧩 Replace Blanks"
    ]

    cols = st.columns(len(options))
    for i, opt in enumerate(options):
        with cols[i]:
            if st.button(opt, use_container_width=True):
                st.session_state.active_section = opt
                st.rerun()

    st.divider()

    # --- Merge Excel ---
    if st.session_state.active_section == "📊 Merge Excel":
        files = st.file_uploader("Upload Excel files", type=["xlsx", "xls"], accept_multiple_files=True)
        if st.button("⚡ Merge", disabled=not files, use_container_width=True):
            output = file_tools.merge_excel(files)
            if output:
                df = pd.read_excel(output)
                st.success("✅ Merge successful")
                st.caption(f"📊 Result: {df.shape[0]} rows × {df.shape[1]} columns")
                st.download_button("📥 Download", data=output.getvalue(), file_name="merged_excel.xlsx", use_container_width=True)

    # --- Merge CSV ---
    elif st.session_state.active_section == "📄 Merge CSV":
        files = st.file_uploader("Upload CSV files", type=["csv"], accept_multiple_files=True)
        if st.button("⚡ Merge", disabled=not files, use_container_width=True):
            output = file_tools.merge_csv(files)
            if output:
                try:
                    df = pd.read_csv(output, encoding='utf-8-sig')
                except UnicodeDecodeError:
                    output.seek(0)
                    df = pd.read_csv(output, encoding='latin1')
                st.success("✅ Merge successful")
                st.caption(f"📊 Result: {df.shape[0]} rows × {df.shape[1]} columns")
                st.download_button("📥 Download", data=output.getvalue(), file_name="merged_csv.csv", use_container_width=True)

    # --- Common Merger ---
    elif st.session_state.active_section == "🔗 Common Merger":
        files = st.file_uploader("Upload CSV/Excel files to merge", type=["csv", "xlsx", "xls"], accept_multiple_files=True)
        
        if files and len(files) >= 2:
            st.markdown("### ⚙️ Merge Configuration")
            c1, c2 = st.columns(2)
            with c1:
                strategy = st.radio("Merge Strategy", ["Intersection (Common Only)", "Union (All Columns)"], index=0)
                strat_val = "intersection" if "Intersection" in strategy else "union"
            with c2:
                case_insensitive = st.checkbox("Case-Insensitive Match")
                remove_duplicates = st.checkbox("Remove Duplicate Rows")
                all_sheets = st.checkbox("Merge All Sheets (Excel)")

            st.divider()
            st.info("Analyzing files...")
            file_data = []
            for f in files:
                f.seek(0)
                file_data.append((f, f.name))
            
            # Preview columns
            all_column_sets = []
            first_file_cols_ordered = []
            for i, (f, name) in enumerate(file_data):
                f.seek(0)
                if name.lower().endswith(".csv"):
                    try:
                        df = pd.read_csv(f, nrows=0, encoding='utf-8-sig')
                    except UnicodeDecodeError:
                        f.seek(0)
                        df = pd.read_csv(f, nrows=0, encoding='latin1')
                else:
                    df = pd.read_excel(f, sheet_name=0, nrows=0)
                
                cols = [str(c).strip() for c in df.columns]
                if i == 0:
                    first_file_cols_ordered = cols
                    # Show preview of first file
                    f.seek(0)
                    if name.lower().endswith(".csv"):
                        try:
                            preview_df = pd.read_csv(f, nrows=5, encoding='utf-8-sig')
                        except UnicodeDecodeError:
                            f.seek(0)
                            preview_df = pd.read_csv(f, nrows=5, encoding='latin1')
                    else:
                        preview_df = pd.read_excel(f, sheet_name=0, nrows=5)
                    st.markdown("### 📋 Sample Data (First File)")
                    st.dataframe(preview_df, use_container_width=True)
                
                target_cols = {c.lower() for c in cols} if case_insensitive else set(cols)
                all_column_sets.append(target_cols)
            
            if strat_val == "intersection":
                shared = set.intersection(*all_column_sets)
                common_cols = [c for c in first_file_cols_ordered if (c.lower() if case_insensitive else c) in shared]
            else:
                # Union
                seen = set()
                common_cols = []
                for s in all_column_sets:
                    for c in s:
                        if c not in seen:
                            common_cols.append(c)
                            seen.add(c)
            
            if common_cols:
                st.success(f"Result will have {len(common_cols)} columns")
                with st.expander("View Column List"):
                    st.write(", ".join(common_cols))
                
                if st.button("⚡ Apply Advanced Merge", use_container_width=True):
                    # Reset buffers
                    for f, _ in file_data: f.seek(0)
                    output, cols, filename = file_merger.merge_files_advanced(
                        file_data,
                        strategy=strat_val,
                        case_insensitive=case_insensitive,
                        remove_duplicates=remove_duplicates,
                        all_sheets=all_sheets
                    )
                    
                    if output:
                        st.success(f"✅ Successfully merged into {filename}")
                        st.download_button("📥 Download Result", data=output.getvalue(), file_name=filename, use_container_width=True)
                    else:
                        st.error(filename)
            else:
                st.error("No columns found to merge.")
        elif files:
            st.warning("Please upload at least 2 files.")
    # --- Remove Columns ---
    elif st.session_state.active_section == "🗑️ Remove Columns":
        file = st.file_uploader("Upload file", type=["xlsx", "xls", "csv"])

        if file:
            is_csv = file.name.endswith(".csv")
            file.seek(0)

            if is_csv:
                df = pd.read_csv(file, nrows=100)
                sheet = None
            else:
                xls = pd.ExcelFile(file)
                sheet = st.selectbox("Sheet", xls.sheet_names)
                file.seek(0)
                df = pd.read_excel(file, sheet_name=sheet, nrows=100)

            st.caption(f"📊 Preview: {df.shape[0]} rows × {df.shape[1]} columns")

            selected = checkbox_grid(
                df.columns.tolist(),
                "remove",
                "Select columns to remove"
            )

            st.divider()
            st.markdown("### Preview After Removal")
            st.dataframe(df.drop(columns=selected, errors="ignore").head(10))

            if st.button("⚡ Apply", disabled=not selected, use_container_width=True):
                file.seek(0)
                output, name = add_modify.remove_columns(
                    file, selected, sheet, is_csv
                )
                if output:
                    st.success("✅ Columns removed successfully")
                    st.download_button(
                        "📥 Download",
                        data=output.getvalue(),
                        file_name=f"{name}_cleaned.csv" if is_csv else f"{name}_cleaned.xlsx",
                        use_container_width=True
                    )
                else:
                    st.error(name)
    elif st.session_state.active_section == "🧩 Replace Blanks":
        file = st.file_uploader("Upload file", type=["xlsx", "xls", "csv"])

        if file:
            is_csv = file.name.endswith(".csv")
            file.seek(0)

            if is_csv:
                df = pd.read_csv(file, nrows=100)
                sheet = None
            else:
                xls = pd.ExcelFile(file)
                sheet = st.selectbox("Sheet", xls.sheet_names)
                file.seek(0)
                df = pd.read_excel(file, sheet_name=sheet, nrows=100)

            st.caption(f"📊 Preview: {df.shape[0]} rows × {df.shape[1]} columns")

            selected = checkbox_grid(
                df.columns.tolist(),
                "blank",
                "Apply to columns (leave empty = all)"
            )

            replace_value = st.text_input("Replace blank values with")

            if st.button("⚡ Apply", disabled=not replace_value, use_container_width=True):
                file.seek(0)
                output, name = add_modify.replace_blank_values(
                    file,
                    replace_value,
                    sheet,
                    False,
                    selected or None,
                    is_csv
                )
                if output:
                    st.success("✅ Blank values replaced successfully")
                    st.download_button(
                        "📥 Download",
                        data=output.getvalue(),
                        file_name=f"{name}_filled.csv" if is_csv else f"{name}_filled.xlsx",
                        use_container_width=True
                    )
                else:
                    st.error(name)
    elif st.session_state.active_section == "✏️ Rename Columns":
        file = st.file_uploader("Upload file", type=["xlsx", "xls", "csv"])

        if file:
            is_csv = file.name.endswith(".csv")
            file.seek(0)

            if is_csv:
                df = pd.read_csv(file, nrows=100)
                sheet = None
            else:
                xls = pd.ExcelFile(file)
                sheet = st.selectbox("Sheet", xls.sheet_names)
                file.seek(0)
                df = pd.read_excel(file, sheet_name=sheet, nrows=100)

            st.caption(f"📊 Preview: {df.shape[0]} rows × {df.shape[1]} columns")

            selected = checkbox_grid(
                df.columns.tolist(),
                "rename",
                "Select columns to rename"
            )

            rename_map = {}
            for col in selected:
                new_name = st.text_input(
                    f"Rename `{col}` →",
                    value=col
                )
                if new_name != col:
                    rename_map[col] = new_name

            st.divider()
            st.markdown("### Preview After Rename")
            st.dataframe(df.rename(columns=rename_map).head(10))

            if st.button("⚡ Apply", disabled=not rename_map, use_container_width=True):
                file.seek(0)
                output, name = add_modify.bulk_rename_columns(
                    file, rename_map, sheet, False, is_csv
                )
                if output:
                    st.success("✅ Columns renamed successfully")
                    st.download_button(
                        "📥 Download",
                        data=output.getvalue(),
                        file_name=f"{name}_renamed.csv" if is_csv else f"{name}_renamed.xlsx",
                        use_container_width=True
                    )
                else:
                    st.error(name)