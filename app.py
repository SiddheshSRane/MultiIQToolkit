import streamlit as st
from tools import text_tools, list_tools, file_tools, add_modify

# ------------------------------------
# PAGE CONFIGURATION
# ------------------------------------
st.set_page_config(
    page_title="🧠 Multi Specialist Toolkit",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ------------------------------------
# CUSTOM MODERN THEME STYLING
# ------------------------------------
st.markdown("""
<style>
/* General Page Styling */
.main {
    background: linear-gradient(135deg, #0F1117 0%, #1A1F2E 100%);
    padding: 2rem 2.5rem;
}
h1 {
    color: #00D9FF !important;
    font-weight: 700 !important;
    font-size: 2.8rem !important;
    margin-bottom: 0.5rem !important;
    background: linear-gradient(90deg, #00D9FF, #00B4D8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
h2, h3 {
    color: #E0E6ED !important;
    font-weight: 600 !important;
}
p, .stMarkdown {
    color: #B0B8C4 !important;
}

/* Tabs - Modern Glass Effect */
.stTabs [data-baseweb="tab-list"] {
    gap: 8px;
    border-bottom: 2px solid #2A2F3C;
    margin-bottom: 2rem;
}
.stTabs [data-baseweb="tab"] {
    color: #8B92A0 !important;
    background-color: transparent;
    border-radius: 8px 8px 0 0;
    padding: 0.75rem 1.5rem;
    font-weight: 600;
    transition: all 0.3s ease;
    border: none !important;
}
.stTabs [data-baseweb="tab"]:hover {
    background-color: #1C2333;
    color: #00D9FF !important;
}
.stTabs [aria-selected="true"] {
    background-color: transparent;
    color: #00D9FF !important;
    border-bottom: 3px solid #00D9FF;
}

/* Buttons - Modern Style */
div.stButton > button {
    background: linear-gradient(135deg, #1E3A5F 0%, #2A4F7E 100%);
    color: #00D9FF;
    border-radius: 10px;
    border: 1.5px solid #00D9FF;
    font-weight: 600;
    font-size: 0.95rem;
    transition: all 0.35s ease;
    width: 100%;
    height: 48px;
    box-shadow: 0 4px 15px rgba(0, 217, 255, 0.15);
}
div.stButton > button:hover {
    background: linear-gradient(135deg, #00D9FF 0%, #00B4D8 100%);
    color: #0F1117;
    box-shadow: 0 8px 25px rgba(0, 217, 255, 0.35);
    transform: translateY(-3px);
}
div.stButton > button:active {
    transform: translateY(-1px);
}

/* Tool Selection Buttons */
.tool-button {
    transition: all 0.3s ease;
}

/* Text Areas & Inputs */
textarea, input[type="text"], .stTextInput>div>div>input, .stSelectbox>div>div>select {
    background-color: #1C1F26 !important;
    color: #E0E6ED !important;
    border: 1.5px solid #2A2F3C !important;
    border-radius: 8px !important;
    padding: 0.75rem !important;
    font-size: 0.95rem !important;
    transition: all 0.3s ease !important;
}
textarea:focus, input[type="text"]:focus, .stTextInput>div>div>input:focus {
    border-color: #00D9FF !important;
    background-color: #232A34 !important;
    box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.1) !important;
}

/* Download Buttons */
.stDownloadButton > button {
    background: linear-gradient(135deg, #00D9FF 0%, #00B4D8 100%);
    color: #0F1117;
    font-weight: 700;
    border-radius: 10px;
    border: none;
    height: 48px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 217, 255, 0.25);
}
.stDownloadButton > button:hover {
    box-shadow: 0 8px 30px rgba(0, 217, 255, 0.4);
    transform: translateY(-3px);
}

/* Success/Info Messages */
.stSuccess, .stInfo {
    background-color: rgba(0, 217, 255, 0.1) !important;
    border-left: 4px solid #00D9FF !important;
    border-radius: 8px !important;
}

/* Caption Text */
.stCaption {
    color: #8B92A0 !important;
    font-size: 0.95rem !important;
}

/* Footer */
footer {
    visibility: hidden;
}

/* Select Box Styling */
.stSelectbox [data-baseweb="select"] > div {
    background-color: #1C1F26 !important;
    border-color: #2A2F3C !important;
    border-radius: 8px !important;
}

/* File Uploader */
.stFileUploadDropzone {
    border: 2px dashed #00D9FF !important;
    border-radius: 10px !important;
    background-color: rgba(0, 217, 255, 0.05) !important;
}

/* Column Cards */
.column-card {
    background: linear-gradient(135deg, #1E3A5F 0%, #2A4F7E 100%);
    border: 1.5px solid #00D9FF;
    border-radius: 12px;
    padding: 1rem;
    margin: 0.5rem 0;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: center;
    font-weight: 600;
    color: #00D9FF;
    box-shadow: 0 4px 15px rgba(0, 217, 255, 0.15);
}
.column-card:hover {
    background: linear-gradient(135deg, #00D9FF 0%, #00B4D8 100%);
    color: #0F1117;
    box-shadow: 0 8px 25px rgba(0, 217, 255, 0.35);
    transform: translateY(-2px);
}
</style>
""", unsafe_allow_html=True)

# ------------------------------------
# PAGE TITLE & HEADER
# ------------------------------------
st.title("🧠 Multi Specialist Toolkit")
st.caption("⚡ Convert, transform, and merge your data — all in one powerful suite")
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
    
    cols = st.columns(3, gap="medium")
    text_options = {
        "🔤 Uppercase": text_tools.to_upper,
        "🔡 Lowercase": text_tools.to_lower,
        "📌 Proper Case": text_tools.to_proper,
        "🔗 Spaces → Commas": text_tools.replace_spaces_with_commas,
        "📍 Newlines → Commas": text_tools.replace_newlines_with_commas,
        "🔀 Regex Replacer": text_tools.regex_replace
    }

    # Display tool buttons
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
                if not text_input or not text_input.strip():
                    st.error("❌ Please enter some text")
                elif "Regex" in st.session_state["active_text_tool"] and not pattern:
                    st.error("❌ Please enter a regex pattern")
                else:
                    with st.spinner("Converting..."):
                        if "Regex" in st.session_state["active_text_tool"]:
                            output = func(text_input, pattern, repl)
                        else:
                            output = func(text_input)
                        
                        if output and not output.startswith("❌"):
                            st.success("✅ Conversion complete!")
                            st.text_area("📤 Output:", value=output, height=200, disabled=True, key="text_output")
                            st.download_button(
                                "📥 Download Result",
                                output,
                                file_name="text_output.txt",
                                use_container_width=True
                            )
                        else:
                            st.error(f"Error: {output}")

# ------------------------------------
# TAB 2: LIST TOOLS
# ------------------------------------
with tab2:
    st.header("📋 List Tools")
    
    cols = st.columns(3, gap="medium")
    list_options = {
        "📊 Column → CSV": list_tools.column_to_comma,
        "✨ Column → Quoted CSV": list_tools.column_to_quoted_comma,
        "📈 CSV → Column": list_tools.comma_to_column
    }

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
            list_input = st.text_area("📥 Input:", height=200, placeholder="Paste your list data here...", key="list_input")
        
        with col2:
            if st.button("⚡ Convert Now", use_container_width=True, key="list_convert"):
                if not list_input or not list_input.strip():
                    st.error("❌ Please enter some data")
                else:
                    with st.spinner("Converting..."):
                        output = func(list_input)
                        if output:
                            st.success("✅ Conversion complete!")
                            st.text_area("📤 Output:", value=output, height=200, disabled=True, key="list_output")
                            st.download_button(
                                "📥 Download Result",
                                output,
                                file_name="list_output.txt",
                                use_container_width=True
                            )
                        else:
                            st.error("❌ No valid data to convert")

# ------------------------------------
# TAB 3: FILE TOOLS
# ------------------------------------
with tab3:
    st.header("📂 File Tools")
    
    # Initialize merge type in session state
    if "merge_type" not in st.session_state:
        st.session_state.merge_type = "📊 Merge Excel Files"
    
    col1, col2 = st.columns(2, gap="large")
    
    with col1:
        st.markdown("#### Choose Operation")
        st.session_state.merge_type = st.selectbox(
            "Select merge type:",
            ["📊 Merge Excel Files", "📄 Merge CSV Files"],
            index=0 if st.session_state.merge_type == "📊 Merge Excel Files" else 1,
            label_visibility="collapsed",
            key="merge_type_select"
        )
    
    with col2:
        st.markdown("#### Upload Files")
        uploaded_files = st.file_uploader(
            "Select files to merge",
            accept_multiple_files=True,
            label_visibility="collapsed",
            type=["xlsx", "xls", "csv"]
        )
    
    st.divider()
    
    if uploaded_files:
        st.info(f"📁 {len(uploaded_files)} file(s) selected")
        for file in uploaded_files:
            st.caption(f"✓ {file.name}")
    
    col1, col2, col3 = st.columns([1, 1, 1], gap="medium")
    
    with col2:
        if st.button("⚡ Start Merging", use_container_width=True):
            if not uploaded_files:
                st.error("❌ Please upload at least one file")
            else:
                with st.spinner("Merging your files..."):
                    if "Excel" in st.session_state.merge_type:
                        output = file_tools.merge_excel(uploaded_files)
                    else:
                        output = file_tools.merge_csv(uploaded_files)

                    if output:
                        st.success("✅ Merging completed successfully!")
                        file_name = "merged_output.xlsx" if "Excel" in st.session_state.merge_type else "merged_output.csv"
                        st.download_button(
                            "📥 Download Merged File",
                            data=output.getvalue(),
                            file_name=file_name,
                            use_container_width=True
                        )
                    else:
                        st.error("❌ Error during file merge. Please check your files and try again.")
# ------------------------------------
# TAB 4: COLUMN REMOVAL TOOL
# ------------------------------------
with tab4:
    st.header("🔧 Column Removal Tool")
    st.caption("Upload an Excel file, select columns to remove, and download the modified file")
    
    # Initialize session state for column removal
    if "col_removal_file" not in st.session_state:
        st.session_state.col_removal_file = None
    if "col_removal_columns" not in st.session_state:
        st.session_state.col_removal_columns = []
    
    col1, col2 = st.columns(2, gap="large")
    
    with col1:
        st.markdown("#### Upload Excel File")
        uploaded_file = st.file_uploader(
            "Select an Excel file",
            type=["xlsx", "xls"],
            label_visibility="collapsed",
            key="column_removal_upload"
        )
        
        if uploaded_file:
            st.session_state.col_removal_file = uploaded_file
            st.success(f"✓ File loaded: {uploaded_file.name}")
    
    if st.session_state.col_removal_file:
        st.divider()
        st.markdown("#### Select Columns to Remove")
        
        # Get available columns (cached for performance)
        file_bytes = st.session_state.col_removal_file.read()
        st.session_state.col_removal_file.seek(0)  # Reset file pointer
        
        columns = add_modify.get_excel_columns(file_bytes)
        
        if columns:
            # Create two-side layout
            left_col, arrow_col, right_col = st.columns([2, 0.3, 2], gap="small")
            
            with left_col:
                st.markdown("**📋 Available Columns**")
                st.markdown("---")
                available_cols = [col for col in columns if col not in st.session_state.col_removal_columns]
                
                if available_cols:
                    # Render in 2-column grid
                    cols_per_row = 2
                    for row_idx in range(0, len(available_cols), cols_per_row):
                        row_cols = st.columns(cols_per_row, gap="small")
                        for col_idx, column in enumerate(available_cols[row_idx:row_idx+cols_per_row]):
                            with row_cols[col_idx]:
                                if st.button(f"▶️  {column}", use_container_width=True, key=f"add_{column}"):
                                    st.session_state.col_removal_columns.append(column)
                                    st.rerun()
                else:
                    st.caption("✓ All columns selected for removal")
            
            with arrow_col:
                st.write("")
                st.write("")
                st.markdown("###  ↔️")
            
            with right_col:
                st.markdown("**🗑️ Columns to Remove**")
                st.markdown("---")
                
                if st.session_state.col_removal_columns:
                    # Render in 2-column grid
                    cols_per_row = 2
                    for row_idx in range(0, len(st.session_state.col_removal_columns), cols_per_row):
                        row_cols = st.columns(cols_per_row, gap="small")
                        for col_idx, column in enumerate(st.session_state.col_removal_columns[row_idx:row_idx+cols_per_row]):
                            with row_cols[col_idx]:
                                if st.button(f"◀️  {column}", use_container_width=True, key=f"remove_{column}"):
                                    st.session_state.col_removal_columns.remove(column)
                                    st.rerun()
                    st.divider()
                    st.info(f"📍 {len(st.session_state.col_removal_columns)} column(s) selected")
                else:
                    st.caption("No columns selected")
        else:
            st.error("❌ Could not read columns from file")
    
    st.divider()
    
    if st.session_state.col_removal_file and st.session_state.col_removal_columns:
        col1, col2, col3 = st.columns([1, 1, 1], gap="medium")
        
        with col2:
            if st.button("⚡ Remove Columns", use_container_width=True):
                with st.spinner("Removing columns..."):
                    output, filename = add_modify.remove_columns(
                        st.session_state.col_removal_file,
                        st.session_state.col_removal_columns
                    )
                    
                    if output:
                        st.success("✅ Columns removed successfully!")
                        st.download_button(
                            "📥 Download Modified Excel",
                            data=output,
                            file_name=f"{filename}_modified.xlsx",
                            use_container_width=True,
                            key="download_col_removal"
                        )
                    else:
                        st.error(f"❌ Error: {filename}")
    elif st.session_state.col_removal_file:
        st.info("👈 Select columns from the right panel to remove them")