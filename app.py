import streamlit as st
from tools import text_tools, list_tools, file_tools, add_modify, data_tools, profiler_tools
import pandas as pd
import matplotlib.pyplot as plt

# ------------------------------------
# PAGE CONFIGURATION
# ------------------------------------
st.set_page_config(
    page_title="🧠 MultiIQ Toolkit",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ------------------------------------
# LOAD EXTERNAL CSS
# ------------------------------------
def load_css(file_name: str):
    """Load CSS from the assets folder."""
    try:
        with open(file_name, "r") as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
    except FileNotFoundError:
        st.warning("⚠️ Custom CSS not found. Using default Streamlit theme.")

load_css("assets/style.css")

st.title("🧠 MultiIQ Toolkit")
st.caption("⚡ Convert, transform, and analyze your data — all in one workspace")
st.divider()

# ------------------------------------
# NEW MERGED TABS
# ------------------------------------
tab1, tab2, tab3 = st.tabs([
    "🧠 Text & List Tools",
    "📂 Data Operations",
    "📊 Data Profiler"
])

# ==========================================================
# TAB 1 — TEXT + LIST TOOLS
# ==========================================================
with tab1:
    st.header("🧠 Text & List Tools")

    section = st.radio(
        "Select Section",
        ["Text Tools", "List Tools"],
        horizontal=True
    )

    # ------------------------------
    # TEXT TOOLS SECTION
    # ------------------------------
    if section == "Text Tools":
        st.subheader("📝 Text Tools")
        text_options = {
            "🔤 Uppercase": text_tools.to_upper,
            "🔡 Lowercase": text_tools.to_lower,
            "📌 Proper Case": text_tools.to_proper,
            "🔗 Spaces → Commas": text_tools.replace_spaces_with_commas,
            "📍 Newlines → Commas": text_tools.replace_newlines_with_commas,
            "🔀 Regex Replace": text_tools.regex_replace
        }

        cols = st.columns(3)
        for i, label in enumerate(text_options.keys()):
            with cols[i % 3]:
                if st.button(label, use_container_width=True):
                    st.session_state["active_text_tool"] = label

        if "active_text_tool" in st.session_state:
            st.divider()
            func = text_options[st.session_state["active_text_tool"]]
            st.subheader(f"Active: {st.session_state['active_text_tool']}")

            col1, col2 = st.columns(2)
            with col1:
                text_input = st.text_area("📥 Input:", height=200, placeholder="Paste text here...")
                if "Regex" in st.session_state["active_text_tool"]:
                    pattern = st.text_input("Pattern:", placeholder="e.g., \\d+")
                    repl = st.text_input("Replacement:", placeholder="e.g., [NUMBER]")

            with col2:
                if st.button("⚡ Convert Now", use_container_width=True):
                    if not text_input.strip():
                        st.error("❌ Please enter some text")
                    elif "Regex" in st.session_state["active_text_tool"] and not pattern:
                        st.error("❌ Please enter a regex pattern")
                    else:
                        with st.spinner("Processing..."):
                            try:
                                output = func(text_input, pattern, repl) if "Regex" in st.session_state["active_text_tool"] else func(text_input)
                                if output:
                                    st.success("✅ Conversion complete!")
                                    st.text_area("📤 Output:", value=output, height=200, disabled=True)
                                    st.download_button("📥 Download Result", output, file_name="text_output.txt", use_container_width=True)
                                else:
                                    st.warning("⚠️ No output generated.")
                            except Exception as e:
                                st.error(f"❌ Error: {str(e)}")

    # ------------------------------
    # LIST TOOLS SECTION
    # ------------------------------
    else:
        st.subheader("📋 List Tools")

        list_options = {
            "📊 Column → CSV": list_tools.column_to_comma,
            "✨ Column → Quoted CSV": list_tools.column_to_quoted_comma,
            "📈 CSV → Column": list_tools.comma_to_column
        }

        cols = st.columns(3)
        for i, label in enumerate(list_options.keys()):
            with cols[i % 3]:
                if st.button(label, use_container_width=True):
                    st.session_state["active_list_tool"] = label

        if "active_list_tool" in st.session_state:
            st.divider()
            func = list_options[st.session_state["active_list_tool"]]
            st.subheader(f"Active: {st.session_state['active_list_tool']}")

            col1, col2 = st.columns(2)
            with col1:
                list_input = st.text_area("📥 Input:", height=200, placeholder="Paste list data here...")

            with col2:
                if st.button("⚡ Convert Now", use_container_width=True):
                    if not list_input.strip():
                        st.error("❌ Please enter some data")
                    else:
                        with st.spinner("Converting..."):
                            try:
                                output = func(list_input)
                                if output:
                                    st.success("✅ Conversion complete!")
                                    st.text_area("📤 Output:", value=output, height=200, disabled=True)
                                    st.download_button("📥 Download Result", output, file_name="list_output.txt", use_container_width=True)
                                else:
                                    st.warning("⚠️ No valid data to convert.")
                            except Exception as e:
                                st.error(f"❌ Error: {str(e)}")

# ==========================================================
# TAB 2 — DATA OPERATIONS
# ==========================================================
with tab2:
    st.header("📂 Data Operations")

    section = st.radio(
        "Select Section",
        ["File Merge", "Column Removal", "Data Cleaning & Transform"],
        horizontal=True
    )

    # ------------------------------
    # FILE MERGE SECTION
    # ------------------------------
    if section == "File Merge":
        st.subheader("📁 Merge Files")
        merge_type = st.selectbox("Merge Type", ["📊 Excel Files", "📄 CSV Files"])
        uploaded_files = st.file_uploader("Upload Files", accept_multiple_files=True, type=["xlsx", "xls", "csv"])

        if st.button("⚡ Start Merging", use_container_width=True):
            if not uploaded_files:
                st.error("❌ Please upload files")
            else:
                with st.spinner("Merging..."):
                    output = file_tools.merge_excel(uploaded_files) if "Excel" in merge_type else file_tools.merge_csv(uploaded_files)
                    if output:
                        file_name = "merged_output.xlsx" if "Excel" in merge_type else "merged_output.csv"
                        st.success("✅ Merge complete!")
                        st.download_button("📥 Download Merged File", data=output.getvalue(), file_name=file_name, use_container_width=True)
                    else:
                        st.error("❌ Merge failed.")

    # ------------------------------
    # COLUMN REMOVAL SECTION
    # ------------------------------
    elif section == "Column Removal":
        st.subheader("🔧 Column Removal Tool")
        uploaded_file = st.file_uploader("Select Excel File", type=["xlsx", "xls"])

        if uploaded_file:
            st.success(f"✓ File loaded: {uploaded_file.name}")
            file_bytes = uploaded_file.read()
            uploaded_file.seek(0)
            columns = add_modify.get_excel_columns(file_bytes)

            if columns:
                selected_columns = st.multiselect("Select Columns to Remove", columns)
                if st.button("⚡ Remove Columns", use_container_width=True):
                    output, filename = add_modify.remove_columns(uploaded_file, selected_columns)
                    if output:
                        st.success("✅ Columns removed successfully!")
                        st.download_button("📥 Download Modified File", data=output, file_name=f"{filename}_modified.xlsx", use_container_width=True)
                    else:
                        st.error(f"❌ Error: {filename}")
            else:
                st.error("❌ Unable to read columns from file.")

    # ------------------------------
    # DATA CLEANING / TRANSFORM SECTION
    # ------------------------------
    else:
        st.subheader("🧹 Data Tools")
        uploaded_file = st.file_uploader("📂 Upload Excel File (.xlsx)", type=["xlsx"])
        if uploaded_file:
            df = data_tools.load_excel(uploaded_file)
            st.dataframe(df.head(), use_container_width=True)
            operation = st.selectbox("Select Operation", ["Merge Columns", "Split Column", "Clean Data", "Validate Data"])
            st.divider()

            if operation == "Merge Columns":
                cols = st.multiselect("Select Columns", df.columns)
                sep = st.text_input("Separator", "_")
                new_col = st.text_input("New Column Name", "merged_column")
                if st.button("⚡ Merge Now"):
                    if len(cols) < 2:
                        st.error("❌ Select at least two columns")
                    else:
                        result = data_tools.merge_columns(df, cols, sep, new_col)
                        st.success("✅ Columns merged")
                        st.dataframe(result.head())
                        st.download_button("📥 Download Excel", data_tools.to_excel_bytes(result), file_name="merged_data.xlsx", use_container_width=True)

            elif operation == "Split Column":
                col = st.selectbox("Select Column", df.columns)
                delim = st.text_input("Delimiter", ",")
                if st.button("⚡ Split Now"):
                    result = data_tools.split_column(df, col, delim)
                    st.success("✅ Column split")
                    st.dataframe(result.head())
                    st.download_button("📥 Download Excel", data_tools.to_excel_bytes(result), file_name="split_data.xlsx", use_container_width=True)

            elif operation == "Clean Data":
                trim = st.checkbox("✂️ Trim whitespace", True)
                dedup = st.checkbox("🧹 Remove duplicates", True)
                fill_value = st.text_input("Fill empty cells with (optional)")
                if st.button("⚡ Clean Data"):
                    result = data_tools.clean_data(df, trim, dedup, fill_value or None)
                    st.success("✅ Data cleaned")
                    st.dataframe(result.head())
                    st.download_button("📥 Download Excel", data_tools.to_excel_bytes(result), file_name="cleaned_data.xlsx", use_container_width=True)

            elif operation == "Validate Data":
                if st.button("⚡ Validate Data"):
                    report = data_tools.validate_data(df)
                    if not report:
                        st.success("✅ No issues found.")
                    else:
                        st.warning("⚠️ Issues detected:")
                        st.json(report)

# ==========================================================
# TAB 3 — DATA PROFILER
# ==========================================================
with tab3:
    st.header("📊 Data Profiler")
    uploaded_file = st.file_uploader("📂 Upload Excel or CSV", type=["xlsx", "xls", "csv"], key="profiler_uploader")

    if uploaded_file:
        df = profiler_tools.load_file(uploaded_file)
        st.success(f"✅ File loaded: {uploaded_file.name}")

        info = profiler_tools.get_basic_info(df)
        col1, col2, col3 = st.columns(3)
        for i, (k, v) in enumerate(info.items()):
            with [col1, col2, col3][i % 3]:
                st.metric(label=k, value=v)

        st.divider()
        summary = profiler_tools.get_summary(df)
        st.subheader("🧾 Column Summary")
        st.dataframe(summary, use_container_width=True)

        st.divider()
        st.subheader("📉 Visual Insights")

        missing_plot = profiler_tools.plot_missing_values(df)
        if missing_plot:
            st.image(missing_plot, caption="Missing Values by Column")

        numeric_plot = profiler_tools.plot_numeric_distribution(df)
        if numeric_plot:
            st.image(numeric_plot, caption="Numeric Distribution")

        st.divider()
        export_data = profiler_tools.export_profile_to_excel(df, summary)
        st.download_button("💾 Download Profile Report (Excel)", data=export_data, file_name="data_profile.xlsx", use_container_width=True)
