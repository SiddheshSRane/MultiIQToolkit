# 📦 MiniIQ Toolkit v5.0

A lightweight, production-ready Streamlit application for simplified Excel, CSV, and text data processing.

## 🎯 Features

### Text & List Tools
- **Column → CSV**: Convert newline-separated data to comma-separated format
- **Column → Quoted CSV**: Same as above but with quoted values
- **CSV → Column**: Reverse conversion from comma-separated to newline-separated
- **Spaces → Commas**: Replace spaces with commas (with whitespace collapsing)
- **Newlines → Commas**: Convert newline breaks to commas

### File Tools
- **Merge Excel Files**: Combine multiple Excel files with source tracking
- **Merge CSV Files**: Merge multiple CSV files preserving all data
- **Remove Columns**: Clean up Excel files by removing unwanted columns

## 🏗️ Project Structure

```
MultiIQToolkit/
├── app.py                    # Main Streamlit application
├── config.py                 # Configuration & constants
├── utils.py                  # Validation & utility functions
├── requirements.txt          # Python dependencies
├── assets/
│   └── style.css            # Custom styling (v5 with CSS variables)
├── tools/
│   ├── __init__.py
│   ├── list_tools.py        # Text conversion utilities
│   ├── file_tools.py        # File merge operations
│   └── add_modify.py        # File modification operations
└── logs/                     # Application logs (auto-created)
```

## 🚀 Quick Start

### Installation

```bash
# Clone or download the repository
cd MultiIQToolkit

# Create virtual environment (recommended)
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Running the App

```bash
streamlit run app.py
```

The app will open at `http://localhost:8501`

## 🔒 Stability Features (v5.0)

### Input Validation
- **File size limits**: Max 50MB per file (configurable in `config.py`)
- **Text length limits**: Max 1,000,000 characters
- **Line count limits**: Max 50,000 lines
- **Format validation**: Type checking for all file operations

### Error Handling
- **Comprehensive logging**: All operations logged to `logs/` directory
- **Graceful degradation**: Operations fail safely with user-friendly error messages
- **Exception tracking**: Detailed error information for debugging
- **Recovery mechanisms**: Proper cleanup of resources on failure

### Type Hints
- All functions include type annotations for IDE support and runtime validation
- Better code documentation and autocomplete

### Session Management
- Persistent session state for UI controls
- Proper state initialization and cleanup
- Prevention of duplicate operations

### Data Processing Safety
- Validation of empty datasets
- Column existence verification before removal
- Proper buffer management for file operations
- UTF-8 encoding explicit for CSV operations

### Performance Optimization
- Streamlit caching for expensive operations
- Efficient file streaming for large files
- Memory-efficient DataFrame concatenation

## ⚙️ Configuration

Edit `config.py` to customize:

```python
# File size limits (in MB)
MAX_FILE_SIZE_MB = 50

# Text processing limits
MAX_TEXT_LENGTH = 1_000_000
MAX_TEXT_LINES = 50_000

# UI Configuration
PAGE_TITLE = "📦 MiniIQ Toolkit"
LAYOUT = "wide"
```

## 📊 Logging

All operations are logged to `logs/` directory with format:
```
2026-01-04 12:34:56,789 - module_name - INFO - Operation completed
```

Check logs for debugging and audit trails.

## 🎨 UI Enhancements (v5.0)

- **CSS Variables**: Centralized color and spacing system
- **Responsive Design**: Mobile-optimized breakpoints
- **Improved Animations**: Smooth transitions and feedback
- **Better Accessibility**: Enhanced focus states and keyboard navigation
- **Modern Typography**: Refined font scales and hierarchy

## 🔧 Development

### Adding New Tools

1. Create function in appropriate `tools/*.py` file
2. Add type hints and docstrings
3. Add error handling and logging
4. Register in `app.py` UI section
5. Test with edge cases

### Testing Locally

```bash
# Run linting
pip install flake8
flake8 app.py tools/ config.py utils.py

# Run type checking (optional)
pip install mypy
mypy app.py
```

## 📦 Dependencies

- **streamlit**: Web framework
- **pandas**: Data manipulation
- **openpyxl**: Excel file handling
- **pyarrow**: Parquet support (future)

See `requirements.txt` for full list.

## 🐛 Troubleshooting

### CSS Not Loading
- Check that `assets/style.css` exists
- Clear browser cache or use Ctrl+Shift+R

### File Upload Fails
- Ensure file size is under 50MB
- Check file format is valid (.xlsx, .xls, or .csv)
- Verify file is not corrupted

### Merge Operations Return No Data
- Check that uploaded files contain actual data (not just headers)
- Verify file encoding (UTF-8 recommended for CSV)

### Check Logs
```bash
tail -f logs/*.log  # Monitor real-time logs
```

## 📝 Version History

- **v5.0**: Added comprehensive stability features, logging, validation, type hints, CSS improvements
- **v4.0**: Single color simplified UI
- **v3.0**: Initial stable release

## 📄 License

See LICENSE file for details.

## 👤 Author

Siddhesh Rane - [GitHub](https://github.com/siddheshrane)

## 🤝 Contributing

Contributions welcome! Please:
1. Test thoroughly
2. Add type hints
3. Include logging for new features
4. Update documentation

---

**Made with ❤️ for simplified data processing**
