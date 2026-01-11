import logging
import time
import os
from typing import List, Tuple, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import io
import pandas as pd
from tools.add_modify import bulk_rename_columns, remove_columns, replace_blank_values, convert_datetime_column
from tools.list_tools import convert_column_advanced, convert_dates_text, column_stats
from tools.file_merger import merge_files_advanced
from tools.zip_handler import is_zip, process_zip_file

# =====================
# LOGGING SETUP
# =====================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("DataRefinery")

app = FastAPI(
    title="DataRefinery API",
    version="1.0.0",
)

# =====================
# MIDDLEWARE
# =====================
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(
        f"Handled {request.method} {request.url.path} | "
        f"Status: {response.status_code} | "
        f"Duration: {duration:.4f}s"
    )
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# =====================
# ERROR HANDLING
# =====================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error at {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "An internal server error occurred.", "detail": str(exc)},
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(f"HTTP {exc.status_code} at {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )

@app.api_route("/api", methods=["GET", "HEAD"])
def read_root():
    return {"status": "ok", "message": "MiniIQ API is running"}

# =====================
# API HELPERS
# =====================

async def flatten_files(files: List[UploadFile]) -> List[Tuple[io.BytesIO, str]]:
    """
    Extracts files from a list of UploadFile objects, including unpacking ZIPs.
    Returns a list of (buffer, filename) tuples.
    """
    import zipfile
    file_data = []
    for file in files:
        contents = await file.read()
        if is_zip(file.filename):
            with zipfile.ZipFile(io.BytesIO(contents)) as z:
                for name in z.namelist():
                    if name.endswith('/') or os.path.splitext(name)[1].lower() not in ['.csv', '.xlsx', '.xls']:
                        continue
                    file_data.append((io.BytesIO(z.read(name)), name))
        else:
            file_data.append((io.BytesIO(contents), file.filename))
    return file_data


async def unified_file_handler(
    file: UploadFile,
    processor_func,
    args_dict,
    action_name,
    ext_suffix
):
    """
    Standardizes ZIP and Single-file processing for modification tools.
    """
    data = await file.read()
    
    if is_zip(file.filename):
        def zip_processor(buffer, name):
            is_csv = name.lower().endswith(".csv")
            try:
                output, base_name = processor_func(buffer, **args_dict, is_csv=is_csv)
                if output:
                    final_ext = ".csv" if is_csv else ".xlsx"
                    return output, f"{base_name}{ext_suffix}{final_ext}"
            except Exception as e:
                logger.error(f"Error processing {name} in zip: {e}") # Changed print to logger.error
            return None, name

        zip_output = process_zip_file(data, zip_processor)
        return StreamingResponse(
            zip_output,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{os.path.splitext(file.filename)[0]}_processed.zip"'}
        )

    # Single-file logic
    buffer = io.BytesIO(data)
    buffer.name = file.filename
    is_csv = file.filename.lower().endswith(".csv")
    
    output, result_val = processor_func(buffer, **args_dict, is_csv=is_csv)
    
    if output is None:
        raise HTTPException(status_code=400, detail=result_val)
    
    output.seek(0)
    ext = ".csv" if is_csv else ".xlsx"
    return StreamingResponse(
        output,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{result_val}{ext_suffix}{ext}"'}
    )


# =====================
# TEXT CONVERTER
# =====================

class ConvertRequest(BaseModel):
    text: str
    delimiter: str = ", "
    item_prefix: str = ""
    item_suffix: str = ""
    result_prefix: str = ""
    result_suffix: str = ""
    remove_duplicates: bool = False
    sort_items: bool = False
    reverse_items: bool = False
    ignore_comments: bool = True
    strip_quotes: bool = False
    trim_items: bool = True
    case_transform: str = "none"


@app.post("/api/convert")
def convert(payload: ConvertRequest):
    result = convert_column_advanced(
        payload.text,
        delimiter=payload.delimiter,
        item_prefix=payload.item_prefix,
        item_suffix=payload.item_suffix,
        result_prefix=payload.result_prefix,
        result_suffix=payload.result_suffix,
        remove_duplicates=payload.remove_duplicates,
        sort_items=payload.sort_items,
        reverse_items=payload.reverse_items,
        ignore_comments=payload.ignore_comments,
        strip_quotes=payload.strip_quotes,
        trim_items=payload.trim_items,
        case_transform=payload.case_transform,
    )

    stats = column_stats(payload.text) # Already using column_stats

    return {
        "result": result,
        "stats": stats
    }


@app.post("/api/convert/export-xlsx")
def export_xlsx(payload: ConvertRequest):
    result = convert_column_advanced(
        payload.text,
        delimiter="\n", # For XLSX we usually want one item per row
        item_prefix=payload.item_prefix,
        item_suffix=payload.item_suffix,
        remove_duplicates=payload.remove_duplicates,
        sort_items=payload.sort_items,
        reverse_items=payload.reverse_items,
        ignore_comments=payload.ignore_comments,
        strip_quotes=payload.strip_quotes,
        trim_items=payload.trim_items,
        case_transform=payload.case_transform,
    )
    
    items = result.splitlines()
    df = pd.DataFrame({"Items": items})
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="ConvertedData")
    
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="conversion.xlsx"'
        }
    )

# =====================
# DATETIME CONVERTER (PASTE MODE)
# =====================

class DateTimeConvertRequest(BaseModel):
    text: str
    target_format: str

@app.post("/api/convert/datetime")
def convert_datetime_text_api(payload: DateTimeConvertRequest):
    result = convert_dates_text(payload.text, payload.target_format)
    stats = column_stats(payload.text)
    return {
        "result": result,
        "stats": stats
    }

@app.post("/api/convert/datetime/export-xlsx")
def export_datetime_xlsx(payload: DateTimeConvertRequest):
    result = convert_dates_text(payload.text, payload.target_format)
    items = result.splitlines()
    df = pd.DataFrame({"Converted DateTime": items})
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="ConvertedDates")
    
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="dates_conversion.xlsx"'
        }
    )


# =====================
# FILE PREVIEW
# =====================

@app.post("/api/file/preview-columns")
async def preview_columns(
    file: UploadFile = File(...),
    sheet_name: str = Form(None),
):
    try:
        contents = await file.read()
        buffer = io.BytesIO(contents)
        buffer.name = file.filename

        is_csv = file.filename.lower().endswith(".csv")

        if is_csv:
            try:
                # Try UTF-8 first (sig handles BOM)
                df = pd.read_csv(buffer, nrows=1, encoding='utf-8-sig')
            except UnicodeDecodeError:
                # Fallback to Latin-1 which accepts most non-UTF8 characters
                buffer.seek(0)
                df = pd.read_csv(buffer, nrows=1, encoding='latin1')
            
            return {
                "columns": list(df.columns),
                "sheets": None,
            }

        # Excel file
        # Use dtype=str to allow safe preview even if data is mixed
        xls = pd.ExcelFile(buffer)
        active_sheet = sheet_name or xls.sheet_names[0]

        df = pd.read_excel(xls, sheet_name=active_sheet, nrows=1, dtype=str)

        return {
            "columns": list(df.columns),
            "sheets": xls.sheet_names,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")


# =====================
# MODIFICATION ENDPOINTS
# =====================

@app.post("/api/file/remove-columns")
async def remove_columns_api(
    file: UploadFile = File(...),
    columns: str = Form(...),
    sheet_name: str = Form(None),
    all_sheets: bool = Form(False),
):
    columns_list = [c.strip() for c in columns.split(",") if c.strip()]
    return await unified_file_handler(
        file,
        remove_columns,
        {"columns_to_remove": columns_list, "sheet_name": sheet_name, "apply_all_sheets": all_sheets},
        "Remove",
        "_cleaned"
    )

@app.post("/api/file/rename-columns")
async def rename_columns_api(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    sheet_name: str = Form(None),
    all_sheets: bool = Form(False),
):
    import json
    try:
        rename_map = json.loads(mapping)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON mapping provided.")

    return await unified_file_handler(
        file,
        bulk_rename_columns,
        {"rename_map": rename_map, "sheet_name": sheet_name, "apply_all_sheets": all_sheets},
        "Rename",
        "_renamed"
    )

@app.post("/api/file/replace-blanks")
async def replace_blanks_api(
    file: UploadFile = File(...),
    columns: str = Form(...),
    replacement: str = Form(""),
    sheet_name: str = Form(None),
    all_sheets: bool = Form(False),
):
    columns_list = [c.strip() for c in columns.split(",") if c.strip()]
    return await unified_file_handler(
        file,
        replace_blank_values,
        {"replace_value": replacement, "sheet_name": sheet_name, "apply_all_sheets": all_sheets, "target_columns": columns_list},
        "Replace",
        "_modified"
    )


@app.post("/api/file/convert-datetime")
async def convert_datetime_api(
    file: UploadFile = File(...),
    column: str = Form(...),
    target_format: str = Form(...),
    sheet_name: str = Form(None),
    all_sheets: bool = Form(False),
):
    columns_list = [c.strip() for c in column.split(",") if c.strip()]
    return await unified_file_handler(
        file,
        convert_datetime_column,
        {
            "column_names": columns_list,
            "target_format": target_format,
            "sheet_name": sheet_name,
            "apply_all_sheets": all_sheets
        },
        "ConvertDateTime",
        "_formatted"
    )


# =====================
# FILE MERGER
# =====================

@app.post("/api/file/preview-common-columns")
async def preview_common_columns(
    files: List[UploadFile] = File(...),
    strategy: str = Form("intersection"),
    case_insensitive: bool = Form(False),
    all_sheets: bool = Form(False),
):
    try:
        file_data = await flatten_files(files)
        
        from tools.file_merger import preview_common_columns as get_preview
        columns, sample = get_preview(
            file_data, 
            strategy=strategy, 
            case_insensitive=case_insensitive,
            all_sheets=all_sheets
        )
        
        return {
            "columns": columns,
            "sample": {
                "headers": sample[0] if sample else [],
                "rows": sample[1:] if sample else []
            },
            "file_count": len(file_data)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to preview files: {str(e)}")


@app.post("/api/file/merge-common-columns")
async def merge_advanced_api(
    files: List[UploadFile] = File(...),
    strategy: str = Form("intersection"),
    case_insensitive: bool = Form(False),
    remove_duplicates: bool = Form(False),
    all_sheets: bool = Form(False),
    selected_columns: str = Form(None),
    trim_whitespace: bool = Form(False),
    casing: str = Form("none"),
    include_source_col: bool = Form(True),
    join_mode: str = Form("stack"),
    join_key: str = Form(None),
):
    try:
        file_data = await flatten_files(files)
        
        columns_list = None
        if selected_columns:
            columns_list = [c.strip() for c in selected_columns.split(",") if c.strip()]

        output, columns, filename = merge_files_advanced(
            file_data,
            strategy=strategy,
            case_insensitive=case_insensitive,
            remove_duplicates=remove_duplicates,
            all_sheets=all_sheets,
            selected_columns=columns_list,
            trim_whitespace=trim_whitespace,
            casing=casing,
            include_source_col=include_source_col,
            join_mode=join_mode,
            join_key=join_key
        )

        if output is None:
            raise HTTPException(status_code=400, detail=filename)

        return StreamingResponse(
            output,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
