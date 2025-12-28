import streamlit as st
from tools import text_tools, list_tools, file_tools, add_modify
import pandas as pd
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
tab1, tab2, tab3, tab4 = st.tabs(["📝 Text Tools", "📋 List Tools", "📂 File Tools", "🔧 Column Removal"])

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
            if st.button(label, use_container_width=True):
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
            if st.button("⚡ Convert Now", use_container_width=True, key="text_convert"):
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
            if st.button(label, use_container_width=True):
                st.session_state["active_list_tool"] = label

    if "active_list_tool" in st.session_state:
        st.divider()
        func = list_options[st.session_state["active_list_tool"]]
        st.subheader(f"Active: {st.session_state['active_list_tool']}")
        
        col1, col2 = st.columns(2, gap="large")
        with col1:
            list_input = st.text_area("📥 Input:", height=200, placeholder="Paste your list data here...")
        
        with col2:
            if st.button("⚡ Convert Now", use_container_width=True, key="list_convert"):
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
    
    if st.button("⚡ Start Merging", use_container_width=True):
        if not uploaded_files:
            st.error("❌ Please upload at least one file")
        else:
            with st.spinner("Merging your files..."):
                try:
                    output = file_tools.merge_excel(uploaded_files) if "Excel" in st.session_state.merge_type else file_tools.merge_csv(uploaded_files)
                    if output:
                        st.success("✅ Merging completed successfully!")
                        file_name = "merged_output.xlsx" if "Excel" in st.session_state.merge_type else "merged_output.csv"
                        st.download_button("📥 Download Merged File", data=output.getvalue(), file_name=file_name, use_container_width=True)
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
                    if st.button(f"▶️ {col}", use_container_width=True, key=f"add_{col}"):
                        st.session_state.col_removal_columns.append(col)
                        st.rerun()

            with right_col:
                st.markdown("**🗑️ Columns to Remove**")
                for col in st.session_state.col_removal_columns:
                    if st.button(f"◀️ {col}", use_container_width=True, key=f"remove_{col}"):
                        st.session_state.col_removal_columns.remove(col)
                        st.rerun()

            if st.session_state.col_removal_columns:
                st.divider()
                if st.button("⚡ Remove Columns", use_container_width=True):
                    with st.spinner("Removing columns..."):
                        output, filename = add_modify.remove_columns(st.session_state.col_removal_file, st.session_state.col_removal_columns)
                        if output:
                            st.success("✅ Columns removed successfully!")
                            st.download_button("📥 Download Modified Excel", data=output, file_name=f"{filename}_modified.xlsx", use_container_width=True)
                        else:
                            st.error(f"❌ Error: {filename}")
        else:
            st.error("❌ Unable to read columns from the file.")
# ------------------------------------
# END OF FILE