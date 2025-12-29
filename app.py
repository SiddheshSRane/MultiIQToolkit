import streamlit as st
from tools import list_tools, file_tools, add_modify

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
    try:
        with open(file_name, "r") as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
    except FileNotFoundError:
        st.warning("⚠️ Custom CSS not found. Using default Streamlit theme.")

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
# TAB 1 — TEXT & LIST TOOLS (WITH COPY BUTTON)
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

    cols = st.columns(3)
    for i, label in enumerate(tool_options.keys()):
        with cols[i % 3]:
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
                        output = None

                        if selected_tool == "🔗 Spaces → Commas":
                            output = text_input.replace(" ", ",")
                        elif selected_tool == "📍 Newlines → Commas":
                            output = text_input.replace("\n", ",").replace("\r", "")
                        else:
                            output = func(text_input)

                        if output:
                            st.success("✅ Conversion complete!")
                            st.text_area("📤 Output:", value=output, height=200, disabled=True)

                            # Copy to clipboard button (JS hack)
                            copy_button = f"""
                            <button 
                                style="margin-top:8px;padding:8px 16px;background-color:#4CAF50;
                                color:white;border:none;border-radius:6px;cursor:pointer;"
                                onclick="navigator.clipboard.writeText(`{output}`)">
                                📋 Copy to Clipboard
                            </button>
                            """
                            st.markdown(copy_button, unsafe_allow_html=True)

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
# TAB 2 — FILE TOOLS (UNCHANGED)
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
                            file_name="merged_excel_output.xlsx",
                            use_container_width=True
                        )
                    else:
                        st.error("❌ Merge failed. Please verify your input files.")

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
                            file_name="merged_csv_output.csv",
                            use_container_width=True
                        )
                    else:
                        st.error("❌ Merge failed. Please verify your input files.")

    # ---------------------------
    # COLUMN REMOVAL TOOL
    # ---------------------------
    elif section == "🗑️ Remove Columns":
        uploaded_file = st.file_uploader("Upload Excel file", type=["xlsx", "xls"])
        if uploaded_file:
            st.success(f"✅ File loaded: {uploaded_file.name}")
            file_bytes = uploaded_file.read()
            uploaded_file.seek(0)
            columns = add_modify.get_excel_columns(file_bytes)

            if columns:
                selected_columns = st.multiselect("Select Columns to Remove", columns)
                if st.button("⚡ Remove Columns", use_container_width=True):
                    with st.spinner("Removing selected columns..."):
                        output, filename = add_modify.remove_columns(uploaded_file, selected_columns)
                        if output:
                            st.success("✅ Columns removed successfully!")
                            st.download_button(
                                "📥 Download Modified Excel",
                                data=output,
                                file_name=f"{filename}_modified.xlsx",
                                use_container_width=True
                            )
                        else:
                            st.error(f"❌ Error: {filename}")
            else:
                st.error("❌ Could not read columns from the file.")

# -----------------------------------------------------------
# END OF FILE
# -----------------------------------------------------------
