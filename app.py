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

# Apply external styling
load_css("assets/style.css")

# ------------------------------------
# PAGE TITLE & HEADER
# ------------------------------------
st.title("🧠 MultiIQ Toolkit")
st.caption("⚡ Convert, transform, and merge your data — all in one intelligent workspace")
st.divider()

# ------------------------------------
# TABS
# ------------------------------------
tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
    "📝 Text Tools",
    "📋 List Tools",
    "📂 File Tools",
    "🔧 Column Removal",
    "🧹 Data Tools",
    "📊 Data Profiler"
])

# ------------------------------------
# TAB 1: TEXT TOOLS
# ------------------------------------
with tab1:
    st.header("📝 Text Tools")

    text_options = {
        "🔤 Uppercase": text_tools.to_upper,
        "🔡 Lowercase": text_tools.to_lower,
        "📌 Proper Case": text_tools.to_proper,
        "🔗 Spaces → Commas": text_tools.replace_spaces_with_commas,
        "📍 Newlines → Commas": text_tools.replace_newlines_with_commas,
        "🔀 Regex Replacer": text_tools.regex_replace
    }

    cols = st.columns(3, gap="medium")
    for i, label in enumerate(text_options.keys()):
        with cols[i % 3]:
            if st.button(label, width="stretch"):
                st.session_state["active_text_tool"] = label

    if "active_text_tool" in st.session_state:
        st.divider()
        func = text_options[st.session_state["active_text_tool"]]
        st.subheader(f"Active: {st.session_state['active_text_tool']}")

        col1, col2 = st.columns(2, gap="large")

        with col1:
            text_input = st.text_area("📥 Input:", height=200, placeholder="Paste your text here...")
            if "Regex" in st.session_state["active_text_tool"]:
                st.markdown("#### Regex Configuration")
                pattern = st.text_input("Pattern:", placeholder="e.g., \\d+")
                repl = st.text_input("Replacement:", placeholder="e.g., [NUMBER]")

        with col2:
            if st.button("⚡ Convert Now", width="stretch", key="text_convert"):
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
                                st.download_button("📥 Download Result", output, file_name="text_output.txt", width="stretch")
                            else:
                                st.warning("⚠️ No output generated.")
                        except Exception as e:
                            st.error(f"❌ Error: {str(e)}")

# ------------------------------------
# TAB 2: LIST TOOLS
# ------------------------------------
with tab2:
    st.header("📋 List Tools")

    list_options = {
        "📊 Column → CSV": list_tools.column_to_comma,
        "✨ Column → Quoted CSV": list_tools.column_to_quoted_comma,
        "📈 CSV → Column": list_tools.comma_to_column
    }

    cols = st.columns(3, gap="medium")
    for i, label in enumerate(list_options.keys()):
        with cols[i % 3]:
            if st.button(label, width="stretch"):
                st.session_state["active_list_tool"] = label

    if "active_list_tool" in st.session_state:
        st.divider()
        func = list_options[st.session_state["active_list_tool"]]
        st.subheader(f"Active: {st.session_state['active_list_tool']}")

        col1, col2 = st.columns(2, gap="large")
        with col1:
            list_input = st.text_area("📥 Input:", height=200, placeholder="Paste your list data here...")

        with col2:
            if st.button("⚡ Convert Now", width="stretch", key="list_convert"):
                if not list_input.strip():
                    st.error("❌ Please enter some data")
                else:
                    with st.spinner("Converting..."):
                        try:
                            output = func(list_input)
                            if output:
                                st.success("✅ Conversion complete!")
                                st.text_area("📤 Output:", value=output, height=200, disabled=True)
                                st.download_button("📥 Download Result", output, file_name="list_output.txt", width="stretch")
                            else:
                                st.warning("⚠️ No valid data to convert.")
                        except Exception as e:
                            st.error(f"❌ Error: {str(e)}")

# ------------------------------------
# TAB 3: FILE TOOLS
# ------------------------------------
with tab3:
    st.header("📂 File Tools")

    if "merge_type" not in st.session_state:
        st.session_state.merge_type = "📊 Merge Excel Files"

    col1, col2 = st.columns(2, gap="large")

    with col1:
        st.markdown("#### Choose Operation")
        st.session_state.merge_type = st.selectbox(
            "Select merge type:",
            ["📊 Merge Excel Files", "📄 Merge CSV Files"],
            label_visibility="collapsed"
        )

    with col2:
        st.markdown("#### Upload Files")
        uploaded_files = st.file_uploader(
            "Select files to merge",
            accept_multiple_files=True,
            type=["xlsx", "xls", "csv"],
            label_visibility="collapsed"
        )

    st.divider()

    if uploaded_files:
        st.info(f"📁 {len(uploaded_files)} file(s) selected")
        for file in uploaded_files:
            st.caption(f"✓ {file.name}")

    if st.button("⚡ Start Merging", width="stretch"):
        if not uploaded_files:
            st.error("❌ Please upload at least one file")
        else:
            with st.spinner("Merging your files..."):
                try:
                    output = file_tools.merge_excel(uploaded_files) if "Excel" in st.session_state.merge_type else file_tools.merge_csv(uploaded_files)
                    if output:
                        st.success("✅ Merging completed successfully!")
                        file_name = "merged_output.xlsx" if "Excel" in st.session_state.merge_type else "merged_output.csv"
                        st.download_button("📥 Download Merged File", data=output.getvalue(), file_name=file_name, width="stretch")
                    else:
                        st.error("❌ Merge failed. Please verify input files.")
                except Exception as e:
                    st.error(f"❌ Error: {str(e)}")

# ------------------------------------
# TAB 4: COLUMN REMOVAL TOOL
# ------------------------------------
with tab4:
    st.header("🔧 Column Removal Tool")
    st.caption("Upload an Excel file, select columns to remove, and download the modified file")

    if "col_removal_file" not in st.session_state:
        st.session_state.col_removal_file = None
    if "col_removal_columns" not in st.session_state:
        st.session_state.col_removal_columns = []

    uploaded_file = st.file_uploader(
        "Select an Excel file",
        type=["xlsx", "xls"],
        key="column_removal_upload"
    )

    if uploaded_file:
        st.session_state.col_removal_file = uploaded_file
        st.success(f"✓ File loaded: {uploaded_file.name}")
        st.divider()

        file_bytes = uploaded_file.read()
        uploaded_file.seek(0)
        columns = add_modify.get_excel_columns(file_bytes)

        if columns:
            left_col, mid_col, right_col = st.columns([2, 0.3, 2])

            with left_col:
                st.markdown("**📋 Available Columns**")
                available_cols = [col for col in columns if col not in st.session_state.col_removal_columns]
                for col in available_cols:
                    if st.button(f"▶️ {col}", width="stretch", key=f"add_{col}"):
                        st.session_state.col_removal_columns.append(col)
                        st.rerun()

            with right_col:
                st.markdown("**🗑️ Columns to Remove**")
                for col in st.session_state.col_removal_columns:
                    if st.button(f"◀️ {col}", width="stretch", key=f"remove_{col}"):
                        st.session_state.col_removal_columns.remove(col)
                        st.rerun()

            if st.session_state.col_removal_columns:
                st.divider()
                if st.button("⚡ Remove Columns", width="stretch"):
                    with st.spinner("Removing columns..."):
                        output, filename = add_modify.remove_columns(st.session_state.col_removal_file, st.session_state.col_removal_columns)
                        if output:
                            st.success("✅ Columns removed successfully!")
                            st.download_button("📥 Download Modified Excel", data=output, file_name=f"{filename}_modified.xlsx", width="stretch")
                        else:
                            st.error(f"❌ Error: {filename}")
        else:
            st.error("❌ Unable to read columns from the file.")

# ------------------------------------
# TAB 5: DATA TOOLS
# ------------------------------------
with tab5:
    st.header("🧹 Data Tools")
    st.caption("Perform analyst-ready tasks like merging, splitting, cleaning, and validating Excel data")

    uploaded_file = st.file_uploader("📂 Upload Excel File (.xlsx)", type=["xlsx"], key="data_tools_uploader")
    if uploaded_file:
        df = data_tools.load_excel(uploaded_file)
        st.subheader("📊 Preview Data")
        st.dataframe(df.head(), width="stretch")

        operation = st.selectbox(
            "Select Operation",
            ["Merge Columns", "Split Column", "Clean Data", "Validate Data"]
        )

        st.divider()

        if operation == "Merge Columns":
            cols = st.multiselect("Select columns to merge", df.columns)
            sep = st.text_input("Separator", "_")
            new_col = st.text_input("New column name", "merged_column")
            if st.button("⚡ Merge Now"):
                if len(cols) < 2:
                    st.error("❌ Please select at least two columns")
                else:
                    result = data_tools.merge_columns(df, cols, sep, new_col)
                    st.success(f"✅ Columns merged into '{new_col}'")
                    st.dataframe(result.head())
                    st.download_button(
                        "📥 Download Updated Excel",
                        data_tools.to_excel_bytes(result),
                        file_name="merged_data.xlsx",
                        width="stretch"
                    )

        elif operation == "Split Column":
            col = st.selectbox("Select column to split", df.columns)
            delim = st.text_input("Delimiter", ",")
            if st.button("⚡ Split Now"):
                result = data_tools.split_column(df, col, delim)
                st.success("✅ Column split successfully!")
                st.dataframe(result.head())
                st.download_button(
                    "📥 Download Updated Excel",
                    data_tools.to_excel_bytes(result),
                    file_name="split_data.xlsx",
                    width="stretch"
                )

        elif operation == "Clean Data":
            trim = st.checkbox("✂️ Trim whitespace", True)
            dedup = st.checkbox("🧹 Remove duplicates", True)
            fill_value = st.text_input("Fill empty cells with (optional)")
            if st.button("⚡ Clean Data"):
                result = data_tools.clean_data(df, trim, dedup, fill_value or None)
                st.success("✅ Data cleaned successfully!")
                st.dataframe(result.head())
                st.download_button(
                    "📥 Download Cleaned Data",
                    data_tools.to_excel_bytes(result),
                    file_name="cleaned_data.xlsx",
                    width="stretch"
                )

        elif operation == "Validate Data":
            if st.button("⚡ Validate Data"):
                report = data_tools.validate_data(df)
                if not report:
                    st.success("✅ No issues found in data.")
                else:
                    st.warning("⚠️ Data issues detected:")
                    st.json(report)

# ------------------------------------
# TAB 6: DATA PROFILER
# ------------------------------------
with tab6:
    st.header("📊 Data Profiler - Quick EDA")
    st.caption("Upload a dataset to automatically generate a summary and data insights")

    uploaded_file = st.file_uploader("📂 Upload Excel or CSV", type=["xlsx", "xls", "csv"], key="profiler_uploader")

    if uploaded_file:
        df = profiler_tools.load_file(uploaded_file)
        st.success(f"✅ File loaded successfully: **{uploaded_file.name}**")
        st.subheader("📋 Dataset Overview")

        info = profiler_tools.get_basic_info(df)
        col1, col2, col3 = st.columns(3)
        for i, (k, v) in enumerate(info.items()):
            with [col1, col2, col3][i % 3]:
                st.metric(label=k, value=v)

        st.divider()
        st.subheader("🧾 Column Summary")
        summary = profiler_tools.get_summary(df)
        st.dataframe(summary, width="stretch")

        st.divider()
        st.subheader("📉 Visual Insights")

        missing_plot = profiler_tools.plot_missing_values(df)
        if missing_plot:
            st.image(missing_plot, caption="Missing Values by Column")

        numeric_plot = profiler_tools.plot_numeric_distribution(df)
        if numeric_plot:
            st.image(numeric_plot, caption="Numeric Distribution")

        st.divider()
        st.subheader("📥 Export Report")
        export_data = profiler_tools.export_profile_to_excel(df, summary)
        st.download_button(
            "💾 Download Profile Report (Excel)",
            data=export_data,
            file_name="data_profile.xlsx",
            width="stretch"
        )

# ------------------------------------
# END OF FILE
