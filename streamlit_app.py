import streamlit as st
from tools import list_tools, file_tools, add_modify
import pandas as pd

# -----------------------------------------------------------
# PAGE CONFIGURATION
# -----------------------------------------------------------
st.set_page_config(
    page_title="📦 MiniIQ Toolkit",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# -----------------------------------------------------------
# LOAD CSS
# -----------------------------------------------------------
def load_css(file_name: str):
    """Load external CSS for consistent UI styling."""
    try:
        with open(file_name, "r") as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
    except FileNotFoundError:
        st.warning("⚠️ Custom CSS not found. Using default Streamlit theme.")

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
tab1, tab2 = st.tabs(["🧠 Text & List Tools", "📂 File Tools"])

# ===========================================================
# TAB 1 — TEXT & LIST TOOLS
# ===========================================================
with tab1:
    st.header("🧠 Text & List Tools")

    tool_options = {
        "📊 Column → CSV": list_tools.column_to_comma,
        "✨ Column → Quoted CSV": list_tools.column_to_quoted_comma,
        "📈 CSV → Column": list_tools.comma_to_column,
        "🔗 Spaces → Commas": None,
        "📍 Newlines → Commas": None,
    }

    cols = st.columns(len(tool_options))
    for i, label in enumerate(tool_options.keys()):
        with cols[i]:
            if st.button(label, use_container_width=True):
                st.session_state["active_tool"] = label

    st.divider()

    if "active_tool" in st.session_state:
        selected_tool = st.session_state["active_tool"]
        st.subheader(f"Active Tool: {selected_tool}")

        text_input = st.text_area("📥 Input:", height=200, placeholder="Paste your text or list data here...")

        if st.button("⚡ Convert Now", use_container_width=True, key="convert_button"):
            if not text_input.strip():
                st.error("❌ Please enter some data")
            else:
                with st.spinner("Processing..."):
                    try:
                        func = tool_options[selected_tool]

                        # Handle manual text transformations
                        if selected_tool == "🔗 Spaces → Commas":
                            output = text_input.replace(" ", ",")
                        elif selected_tool == "📍 Newlines → Commas":
                            output = text_input.replace("\n", ",").replace("\r", "")
                        else:
                            output = func(text_input)

                        if output:
                            st.success("✅ Conversion complete!")
                            st.text_area("📤 Output:", value=output, height=200, disabled=True)

                            # Copy to clipboard
                            st.markdown(f"""
                                <button style="
                                    margin-top:8px;
                                    padding:8px 16px;
                                    background-color:#00B4D8;
                                    color:white;
                                    border:none;
                                    border-radius:6px;
                                    cursor:pointer;
                                    transition: all 0.3s ease;"
                                onmouseover="this.style.backgroundColor='#0096C7'"
                                onmouseout="this.style.backgroundColor='#00B4D8'"
                                onclick="navigator.clipboard.writeText(`{output}`)">
                                    📋 Copy to Clipboard
                                </button>
                            """, unsafe_allow_html=True)

                            st.download_button(
                                "📥 Download Result",
                                data=output,
                                file_name=f"{selected_tool.replace(' ', '_')}.txt",
                                use_container_width=True
                            )
                        else:
                            st.warning("⚠️ No output generated.")
                    except Exception as e:
                        st.error(f"❌ Error: {str(e)}")

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
            else:
                with st.spinner("Merging Excel files..."):
                    output = file_tools.merge_excel(uploaded_files)
                    if output:
                        st.success("✅ Excel files merged successfully!")
                        st.download_button(
                            "📥 Download Merged File",
                            data=output.getvalue(),
                            file_name="merged_excel.xlsx",
                            use_container_width=True
                        )

    # ---------------------------
    # MERGE CSV FILES
    # ---------------------------
    elif section == "📄 Merge CSV Files":
        uploaded_files = st.file_uploader("Upload CSV files", accept_multiple_files=True, type=["csv"])
        if st.button("⚡ Merge CSV Files", use_container_width=True):
            if not uploaded_files:
                st.error("❌ Please upload at least one CSV file.")
            else:
                with st.spinner("Merging CSV files..."):
                    output = file_tools.merge_csv(uploaded_files)
                    if output:
                        st.success("✅ CSV files merged successfully!")
                        st.download_button(
                            "📥 Download Merged File",
                            data=output.getvalue(),
                            file_name="merged_csv.csv",
                            use_container_width=True
                        )

    # ---------------------------
    # COLUMN REMOVAL TOOL (NO PREVIEW)
    # ---------------------------
    elif section == "🗑️ Remove Columns":
        st.subheader("🗑️ Column Removal Tool")
        uploaded_file = st.file_uploader("Choose an Excel file", type=["xlsx", "xls"])

        if uploaded_file:
            try:
                xl = pd.ExcelFile(uploaded_file)
                sheet_names = xl.sheet_names

                st.markdown("### 📁 Select the Sheet to Clean:")
                selected_sheet = st.radio(
                    "Choose a tab:",
                    options=sheet_names,
                    horizontal=True
                )

                # Load sheet to get columns
                uploaded_file.seek(0)
                df_preview = pd.read_excel(uploaded_file, sheet_name=selected_sheet, nrows=2)
                all_columns = df_preview.columns.tolist()

                st.divider()
                st.markdown("### 1️⃣ Select Columns to Remove")

                # Initialize checkbox states
                for col in all_columns:
                    if f"col_{col}" not in st.session_state:
                        st.session_state[f"col_{col}"] = False

                # Select/Deselect buttons
                b1, b2 = st.columns(2)
                with b1:
                    if st.button("✅ Select All", use_container_width=True):
                        for col in all_columns:
                            st.session_state[f"col_{col}"] = True
                with b2:
                    if st.button("🚫 Deselect All", use_container_width=True):
                        for col in all_columns:
                            st.session_state[f"col_{col}"] = False

                selected_columns = [col for col in all_columns if st.session_state[f"col_{col}"]]

                # ✅ Clean checkbox grid layout (scrollable)
                num_cols = len(all_columns)
                if num_cols <= 5:
                    cols_per_row = num_cols
                elif num_cols <= 12:
                    cols_per_row = 3
                elif num_cols <= 24:
                    cols_per_row = 4
                else:
                    cols_per_row = 5

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

                # Remove columns button
                remove_button = st.button("⚡ Remove Selected Columns",
                                          use_container_width=True,
                                          disabled=not selected_columns)

                if remove_button:
                    with st.spinner("Removing selected columns..."):
                        uploaded_file.seek(0)
                        output, filename = add_modify.remove_columns(uploaded_file, selected_columns, selected_sheet)

                        if output:
                            st.balloons()
                            st.success(f"✅ Columns removed from '{selected_sheet}'!")
                            st.download_button(
                                "📥 Download Cleaned File",
                                data=output,
                                file_name=f"{filename}_{selected_sheet}_cleaned.xlsx",
                                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                use_container_width=True
                            )
                        else:
                            st.error("❌ Failed to process the file.")
            except Exception as e:
                st.error(f"❌ Error processing file: {e}")
        else:
            st.info("ℹ️ Please upload an Excel file to get started.")    