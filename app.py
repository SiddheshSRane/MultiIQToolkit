import streamlit as st
import json
import logging
from typing import Optional
from tools import list_tools, file_tools, add_modify
import pandas as pd
from helpers import (
    PAGE_TITLE,
    PAGE_ICON,
    LAYOUT,
    INITIAL_SIDEBAR_STATE,
    MAX_FILE_SIZE_BYTES,
    MAX_FILE_SIZE_MB,
    validate_text_input,
    validate_file_extension,
    format_error_message,
    render_copy_button,
)

# ===== LOGGING SETUP =====
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ===== PAGE CONFIGURATION =====
st.set_page_config(
    page_title=PAGE_TITLE,
    page_icon=PAGE_ICON,
    layout=LAYOUT,
    initial_sidebar_state=INITIAL_SIDEBAR_STATE
)

# -----------------------------------------------------------
# PAGE CONFIGURATION
# -----------------------------------------------------------
st.set_page_config(
    page_title="📦 MiniIQ Toolkit",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ===== LOAD CSS =====
def load_css(file_name: str) -> bool:
    """
    Load external CSS for consistent UI styling.
    
    Args:
        file_name: Path to CSS file
        
    Returns:
        True if successful, False otherwise
    """
    try:
        with open(file_name, "r") as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
            logger.info(f"CSS loaded successfully from {file_name}")
            return True
    except FileNotFoundError:
        st.warning("⚠️ Custom CSS not found. Using default Streamlit theme.")
        logger.warning(f"CSS file not found: {file_name}")
        return False
    except Exception as e:
        st.warning("⚠️ Error loading CSS. Using default Streamlit theme.")
        logger.error(f"Error loading CSS: {str(e)}")
        return False

# Apply custom styles
load_css("assets/style.css")

# -----------------------------------------------------------
# PAGE HEADER
# -----------------------------------------------------------
st.title("📦 MiniIQ Toolkit")
st.caption("⚡ Simplified version — just the essentials")
st.divider()

# -----------------------------------------------------------
# TABS
# -----------------------------------------------------------
tab1, tab2 = st.tabs(["⚙️ Advanced Converter", "📂 File Tools"])

# ===========================================================
# ===========================================================
# TAB 1 — ADVANCED CONVERTER
# ===========================================================
with tab1:
    st.header("⚙️ Advanced Column Converter")
    st.caption("Convert column data with custom delimiters and wrapping")

    # Show common presets first (before widgets are created)
    st.markdown("### Common Presets (click to populate example)")
    st.caption("Quick examples of common conversions; clicking fills input and config")

    sample_lines = "apple\nbanana\ncherry"

    col_p1, col_p2, col_p3 = st.columns(3)
    with col_p1:
        if st.button("📊 Comma CSV", use_container_width=True):
            st.session_state["adv_input"] = sample_lines
            st.session_state["adv_delimiter"] = ", "
            st.session_state["adv_item_prefix"] = ""
            st.session_state["adv_item_suffix"] = ""
            st.session_state["adv_result_prefix"] = ""
            st.session_state["adv_result_suffix"] = ""
            st.rerun()
    with col_p2:
        if st.button("✨ Quoted CSV", use_container_width=True):
            st.session_state["adv_input"] = sample_lines
            st.session_state["adv_delimiter"] = ", "
            st.session_state["adv_item_prefix"] = "'"
            st.session_state["adv_item_suffix"] = "'"
            st.session_state["adv_result_prefix"] = ""
            st.session_state["adv_result_suffix"] = ""
            st.rerun()
    with col_p3:
        if st.button("📋 Newline List", use_container_width=True):
            st.session_state["adv_input"] = sample_lines
            st.session_state["adv_delimiter"] = "\n"
            st.session_state["adv_item_prefix"] = ""
            st.session_state["adv_item_suffix"] = ""
            st.session_state["adv_result_prefix"] = ""
            st.session_state["adv_result_suffix"] = ""
            st.rerun()

    st.divider()
    st.markdown("### Input Data")

    # Initialize session state defaults if not present
    if "adv_input" not in st.session_state:
        st.session_state["adv_input"] = ""
    if "adv_delimiter" not in st.session_state:
        st.session_state["adv_delimiter"] = ","
    if "adv_item_prefix" not in st.session_state:
        st.session_state["adv_item_prefix"] = ""
    if "adv_item_suffix" not in st.session_state:
        st.session_state["adv_item_suffix"] = ""
    if "adv_result_prefix" not in st.session_state:
        st.session_state["adv_result_prefix"] = ""
    if "adv_result_suffix" not in st.session_state:
        st.session_state["adv_result_suffix"] = ""

    text_input = st.text_area(
        "📥 Enter your column data:",
        height=200,
        placeholder="Enter (or paste) your column of data here...",
        key="adv_input"
    )

    # Configuration section
    col1, col2, col3 = st.columns([1, 1, 1])
    
    with col1:
        st.markdown("### Delimiter")
        delimiter = st.text_input(
            "Delimiter character(s):",
            max_chars=10,
            key="adv_delimiter"
        )
        if not delimiter:
            delimiter = ","

    with col2:
        st.markdown("### Item Wrapping")
        item_prefix = st.text_input(
            "Item prefix:",
            max_chars=20,
            key="adv_item_prefix",
            placeholder="e.g., '"
        )
        item_suffix = st.text_input(
            "Item suffix:",
            max_chars=20,
            key="adv_item_suffix",
            placeholder="e.g., '"
        )

    with col3:
        st.markdown("### Result Wrapping")
        result_prefix = st.text_input(
            "Result prefix:",
            max_chars=20,
            key="adv_result_prefix",
            placeholder="e.g., ["
        )
        result_suffix = st.text_input(
            "Result suffix:",
            max_chars=20,
            key="adv_result_suffix",
            placeholder="e.g., ]"
        )

    st.divider()

    # Convert button
    if st.button("⚡ Convert Now", use_container_width=True, key="adv_convert_button"):
        is_valid, error_msg = validate_text_input(text_input, operation="advanced conversion")
        if not is_valid:
            st.error(error_msg or "❌ Input validation failed")
            logger.warning("Advanced conversion: validation failed")
        else:
            with st.spinner("Processing..."):
                try:
                    logger.info("Starting advanced column conversion")
                    output = list_tools.convert_column_advanced(
                        text_input,
                        delimiter=delimiter,
                        item_prefix=item_prefix,
                        item_suffix=item_suffix,
                        result_prefix=result_prefix,
                        result_suffix=result_suffix
                    )

                    if output:
                        st.success("✅ Conversion complete!")
                        
                        # Display output
                        st.text_area(
                            "📤 Output:",
                            value=output,
                            height=200,
                            disabled=True
                        )

                        # Copy to clipboard - use code block for reliability
                        st.markdown("**Copy output:**")
                        render_copy_button(output)

                        # Download button
                        st.download_button(
                            "📥 Download Result",
                            data=output,
                            file_name="conversion.txt",
                            use_container_width=True
                        )
                        logger.info("Advanced conversion completed successfully")
                    else:
                        st.warning("⚠️ No output generated.")
                        logger.warning("Advanced conversion returned no data")
                except Exception as e:
                    error_msg = format_error_message(e, "advanced conversion")
                    st.error(error_msg)

# ===========================================================
# TAB 2 — FILE TOOLS
# ===========================================================
with tab2:
    st.header("📂 File Tools")
    st.caption("Merge Excel/CSV files or remove unwanted columns")

    section = st.radio(
        "Select Operation",
        ["📊 Merge Excel Files", "📄 Merge CSV Files", "🗑️ Remove Columns"],
        horizontal=True
    )

    # ---------------------------
    # MERGE EXCEL FILES
    # ---------------------------
    if section == "📊 Merge Excel Files":
        uploaded_files = st.file_uploader("Upload Excel files", accept_multiple_files=True, type=["xlsx", "xls"])
        if st.button("⚡ Merge Excel Files", use_container_width=True):
            if not uploaded_files:
                st.error("❌ Please upload at least one Excel file.")
                logger.warning("Merge Excel: no files uploaded")
            else:
                with st.spinner("Merging Excel files..."):
                    try:
                        logger.info(f"Starting merge of {len(uploaded_files)} Excel file(s)")
                        output = file_tools.merge_excel(uploaded_files)
                        if output:
                            st.success("✅ Excel files merged successfully!")
                            st.download_button(
                                "📥 Download Merged File",
                                data=output.getvalue(),
                                file_name="merged_excel.xlsx",
                                use_container_width=True
                            )
                            logger.info("Excel merge completed successfully")
                        else:
                            st.warning("⚠️ No valid data found in uploaded files.")
                            logger.warning("Excel merge returned no data")
                    except Exception as e:
                        error_msg = format_error_message(e, "Excel merge")
                        st.error(error_msg)

    # ---------------------------
    # MERGE CSV FILES
    # ---------------------------
    elif section == "📄 Merge CSV Files":
        uploaded_files = st.file_uploader("Upload CSV files", accept_multiple_files=True, type=["csv"])
        if st.button("⚡ Merge CSV Files", use_container_width=True):
            if not uploaded_files:
                st.error("❌ Please upload at least one CSV file.")
                logger.warning("Merge CSV: no files uploaded")
            else:
                with st.spinner("Merging CSV files..."):
                    try:
                        logger.info(f"Starting merge of {len(uploaded_files)} CSV file(s)")
                        output = file_tools.merge_csv(uploaded_files)
                        if output:
                            st.success("✅ CSV files merged successfully!")
                            st.download_button(
                                "📥 Download Merged File",
                                data=output.getvalue(),
                                file_name="merged_csv.csv",
                                use_container_width=True
                            )
                            logger.info("CSV merge completed successfully")
                        else:
                            st.warning("⚠️ No valid data found in uploaded files.")
                            logger.warning("CSV merge returned no data")
                    except Exception as e:
                        error_msg = format_error_message(e, "CSV merge")
                        st.error(error_msg)

    # ---------------------------
    # COLUMN REMOVAL TOOL (NO PREVIEW)
    # ---------------------------
    elif section == "🗑️ Remove Columns":
        st.subheader("🗑️ Column Removal Tool")
        uploaded_file = st.file_uploader("Choose an Excel file", type=["xlsx", "xls"])

        if uploaded_file:
            try:
                uploaded_file.seek(0)

                xls = pd.ExcelFile(uploaded_file)
                sheet_names = xls.sheet_names

                if not sheet_names:
                    st.error("❌ No sheets found in the Excel file.")
                    logger.error("No sheets found in uploaded file")
                    st.stop()

                st.markdown("### 📁 Select the Sheet to Clean:")
                selected_sheet = st.selectbox("Choose a tab:", options=sheet_names)

                # Load sheet to get columns preview (safe read)
                uploaded_file.seek(0)
                df_preview = pd.read_excel(uploaded_file, sheet_name=selected_sheet, nrows=50)
                all_columns = df_preview.columns.tolist()

                if not all_columns:
                    st.error("❌ Selected sheet has no columns.")
                    logger.error(f"No columns found in sheet: {selected_sheet}")
                    st.stop()

                st.divider()
                st.markdown("### 1️⃣ Select Columns to Remove")

                # Initialize checkbox states
                for col in all_columns:
                    if f"col_{col}" not in st.session_state:
                        st.session_state[f"col_{col}"] = False

                # Select/Deselect buttons
                b1, b2 = st.columns(2)
                with b1:
                    if st.button("✅ Select All", use_container_width=True, key="select_all_btn"):
                        for col in all_columns:
                            st.session_state[f"col_{col}"] = True
                        st.rerun()
                with b2:
                    if st.button("🚫 Deselect All", use_container_width=True, key="deselect_all_btn"):
                        for col in all_columns:
                            st.session_state[f"col_{col}"] = False
                        st.rerun()

                # Checkbox grid layout (scrollable)
                num_cols = len(all_columns)
                if num_cols <= 5:
                    cols_per_row = num_cols
                elif num_cols <= 12:
                    cols_per_row = 3
                elif num_cols <= 24:
                    cols_per_row = 4
                else:
                    cols_per_row = 5

                selected_columns = []
                with st.container():
                    st.markdown('<div style="max-height: 400px; overflow-y: auto; padding-right: 10px;">',
                                unsafe_allow_html=True)
                    for i in range(0, len(all_columns), cols_per_row):
                        cols = st.columns(cols_per_row, gap="small")
                        for j, col_name in enumerate(all_columns[i:i + cols_per_row]):
                            with cols[j]:
                                if st.checkbox(col_name, key=f"col_{col_name}"):
                                    if col_name not in selected_columns:
                                        selected_columns.append(col_name)
                    st.markdown('</div>', unsafe_allow_html=True)

                st.divider()

                # Preview of resulting table
                st.markdown("### Preview: first 10 rows after removal")
                preview_df = df_preview.drop(columns=selected_columns, errors="ignore")
                st.dataframe(preview_df.head(10))

                # Remove columns button
                remove_button = st.button("⚡ Remove Selected Columns", use_container_width=True, disabled=not selected_columns)

                if remove_button:
                    with st.spinner("Removing selected columns..."):
                        try:
                            uploaded_file.seek(0)
                            output, filename = add_modify.remove_columns(uploaded_file, selected_columns, selected_sheet)

                            if output:
                                st.balloons()
                                st.success(f"✅ Columns removed from '{selected_sheet}'!")
                                data = output.getvalue() if hasattr(output, 'getvalue') else output
                                st.download_button(
                                    "📥 Download Cleaned File",
                                    data=data,
                                    file_name=f"{filename}_{selected_sheet}_cleaned.xlsx",
                                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                    use_container_width=True
                                )
                                logger.info(f"Successfully removed columns from '{selected_sheet}'")
                            else:
                                st.error(f"❌ Failed to process the file: {filename}")
                                logger.error(f"Column removal failed: {filename}")
                        except Exception as e:
                            error_msg = format_error_message(e, "column removal")
                            st.error(error_msg)
            except Exception as e:
                error_msg = format_error_message(e, "file processing")
                st.error(error_msg)
                logger.error(f"Error processing file: {str(e)}")
        else:
            st.info("ℹ️ Please upload an Excel file to get started.")    