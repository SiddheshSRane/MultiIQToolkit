import io
import json
import zipfile
import asyncio
import logging
import time
import os
from typing import List, Tuple, Optional
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from tools.add_modify import bulk_rename_columns, remove_columns, replace_blank_values, convert_datetime_column
from tools.list_tools import convert_column_advanced, convert_dates_text, column_stats
from tools.file_merger import merge_files_advanced
from tools.zip_handler import is_zip, process_zip_file
from tools.json_converter import convert_to_json
from tools.template_mapper import get_excel_headers, map_template_data, preview_mapped_data

load_dotenv()


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
    version="1.1.0",
)

# Supabase Configuration
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    logger.warning("Supabase credentials missing from environment variables.")

# Shared thread pool for CPU-bound tasks (pandas, zipping)
executor = ThreadPoolExecutor(max_workers=min(32, (os.cpu_count() or 1) + 4))

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

from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)

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
    return {"status": "ok", "message": "DataRefinery API is running", "version": "1.1.0"}

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "supabase_configured": bool(supabase_url and supabase_key)
    }

# =====================
# AUTHENTICATION (Direct HTTP)
# =====================
async def get_current_user(request: Request):
    """
    Verifies the user with Supabase Auth API directly using httpx.
    """
    if not supabase_url or not supabase_key:
        return None

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split(" ")[1]
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "apikey": supabase_key,
                "Authorization": f"Bearer {token}"
            }
            response = await client.get(f"{supabase_url}/auth/v1/user", headers=headers, timeout=5)
            if response.status_code == 200:
                user_data = response.json()
                class User:
                    def __init__(self, data):
                        self.id = data.get("id")
                        self.email = data.get("email")
                return User(user_data)
        return None
    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        return None

async def log_activity(user_id: str, action: str, filename: str, file_url: Optional[str] = None):
    """
    Logs backend actions to Supabase via REST API directly using httpx.
    """
    if not supabase_url or not supabase_key:
        return
    
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            }
            payload = {
                "user_id": user_id,
                "action": f"Backend: {action}",
                "filename": filename,
                "file_url": file_url
            }
            await client.post(f"{supabase_url}/rest/v1/activity_logs", headers=headers, json=payload, timeout=5)
    except Exception as e:
        logger.error(f"Failed to log activity: {str(e)}")

# =====================
# API HELPERS
# =====================

def read_df(file_obj, filename: str, nrows: Optional[int] = None, sheet_name: Optional[str] = None) -> pd.DataFrame:
    """
    Standardizes reading a DataFrame from CSV or Excel with robustness.
    Accepts file_obj which can be bytes buffer or file-like object.
    """
    is_csv = filename.lower().endswith(".csv")
    
    # Ensure we are at the start of the file
    if hasattr(file_obj, 'seek'):
        file_obj.seek(0)
        
    if is_csv:
        try:
            return pd.read_csv(file_obj, nrows=nrows, encoding='utf-8-sig', engine='c')
        except Exception:
            try:
                if hasattr(file_obj, 'seek'): file_obj.seek(0)
                return pd.read_csv(file_obj, nrows=nrows, encoding='latin1', engine='c')
            except Exception:
                if hasattr(file_obj, 'seek'): file_obj.seek(0)
                return pd.read_csv(file_obj, nrows=nrows)
    else:
        try:
            xls = pd.ExcelFile(file_obj)
            active_sheet = sheet_name or xls.sheet_names[0]
            return pd.read_excel(xls, sheet_name=active_sheet, nrows=nrows, dtype=str)
        except Exception as e:
            logger.error(f"Excel read error ({filename}): {e}")
            return pd.DataFrame()


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
                    # Ignore directories and non-data files
                    if name.endswith('/') or os.path.basename(name).startswith('.'):
                        continue
                    ext = os.path.splitext(name)[1].lower()
                    if ext in ['.csv', '.xlsx', '.xls']:
                        file_data.append((io.BytesIO(z.read(name)), name))
        else:
            file_data.append((io.BytesIO(contents), file.filename))
    return file_data


async def unified_batch_handler(
    files: List[UploadFile],
    processor_func,
    args_dict,
    action_name,
    ext_suffix,
    user=None
):
    """
    Handles multiple files (and ZIPs) and returns a single file or a ZIP of processed files.
    Uses parallel processing for batch operations.
    """
    import zipfile
    flat_files = await flatten_files(files)
    
    # Log Backend Activity if user is authenticated
    if user:
        await log_activity(user.id, action_name, f"{len(flat_files)} files")
    
    if not flat_files:
        raise HTTPException(status_code=400, detail="No valid CSV or Excel files found.")

    loop = asyncio.get_running_loop()

    # If only one file was uploaded (or one file found in zip)
    if len(flat_files) == 1:
        buffer, filename = flat_files[0]
        is_csv = filename.lower().endswith(".csv")
        
    # Run CPU-bound processing in thread pool
        try:
            output, res_ext = await loop.run_in_executor(
                executor, 
                lambda: processor_func(buffer, **args_dict, is_csv=is_csv)
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

        if output is None:
            raise HTTPException(status_code=400, detail=res_ext)
        
        output.seek(0)
        # Use res_ext if provided by processor, else use ext_suffix logic
        final_ext = res_ext if res_ext.startswith('.') else (".csv" if is_csv else ".xlsx")
        base_name = os.path.splitext(filename)[0]
        
        # Determine media type
        if final_ext == ".json" or final_ext == ".txt":
            media_type = "application/json" if final_ext == ".json" else "text/plain"
        elif final_ext == ".csv":
            media_type = "text/csv"
        else:media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        return StreamingResponse(
            output,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{base_name}{ext_suffix}{final_ext}"'}
        )

    # Multiple files -> Parallel processing
    async def process_single_file(file_info):
        buf, fname = file_info
        is_csv = fname.lower().endswith(".csv")
        try:
            # processor_func returns (output_buffer, base_name_or_extension)
            output, result_val = await loop.run_in_executor(
                executor,
                lambda: processor_func(buf, **args_dict, is_csv=is_csv)
            )
            if output:
                return (output, result_val, is_csv, fname)
        except Exception as e:
            logger.error(f"Batch processing error for {fname}: {e}")
        return None

    # Run all processing tasks in parallel
    results = await asyncio.gather(*(process_single_file(f) for f in flat_files))
    processed_results = [r for r in results if r is not None]

    if not processed_results:
        raise HTTPException(status_code=400, detail="Failed to process any files in the batch.")

    # Zipping
    zip_output = io.BytesIO()
    with zipfile.ZipFile(zip_output, 'w', zipfile.ZIP_DEFLATED) as z:
        for output, result_val, is_csv, orig_fname in processed_results:
            # Determine base name and extension
            if result_val.startswith('.'):
                # result_val is extension (e.g. .txt for JSON)
                base_name = os.path.splitext(orig_fname)[0]
                final_ext = result_val
            else:
                # result_val is the processed base name
                base_name = result_val
                final_ext = ".csv" if is_csv else ".xlsx"
            
            z.writestr(f"{base_name}{ext_suffix}{final_ext}", output.getvalue())

    zip_output.seek(0)
    return StreamingResponse(
        zip_output,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="data_refinery_batch_{int(time.time())}.zip"'}
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
async def convert(payload: ConvertRequest, user=Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    
    # Run CPU-bound processing in thread pool
    result = await loop.run_in_executor(
        executor,
        lambda: convert_column_advanced(
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
    )

    stats = await loop.run_in_executor(executor, lambda: column_stats(payload.text))
    
    if user:
        await log_activity(user.id, "Text Conversion", "clipboard")

    return {
        "result": result,
        "stats": stats
    }


@app.post("/api/convert/export-xlsx")
async def export_xlsx(payload: ConvertRequest, user=Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        executor,
        lambda: convert_column_advanced(
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
    )
    
    items = result.splitlines()
    df = pd.DataFrame({"Items": items})
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="ConvertedData")
    
    output.seek(0)
    
    if user:
        await log_activity(user.id, "Download CSV as XLSX", "conversion.xlsx")

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
async def convert_datetime_text_api(payload: DateTimeConvertRequest, user=Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(executor, lambda: convert_dates_text(payload.text, payload.target_format))
    stats = await loop.run_in_executor(executor, lambda: column_stats(payload.text))
    
    if user:
        await log_activity(user.id, "DateTime Conversion (Text)", "clipboard")

    return {
        "result": result,
        "stats": stats
    }

@app.post("/api/convert/datetime/export-xlsx")
async def export_datetime_xlsx(payload: DateTimeConvertRequest, user=Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(executor, lambda: convert_dates_text(payload.text, payload.target_format))
    
    items = result.splitlines()
    df = pd.DataFrame({"Converted DateTime": items})
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="ConvertedDates")
    
    output.seek(0)
    
    if user:
        await log_activity(user.id, "DateTime Export XLSX", "dates_conversion.xlsx")

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
        # Optimization: Pass file.file directly to pandas to avoid reading whole file into memory
        # pandas functions can handle SpooledTemporaryFile
        
        # Note: We do not need to await file.read() here which saves memory for large files
        
        df = read_df(file.file, file.filename, nrows=5, sheet_name=sheet_name)
        
        # If it was an Excel file, we might want to return sheet list too
        sheets = None
        if not file.filename.lower().endswith(".csv"):
            try:
                # Seek back to start for sheet reading
                file.file.seek(0)
                xls = pd.ExcelFile(file.file)
                sheets = xls.sheet_names
            except:
                pass

        sample_data = {
            "headers": [str(c) for c in df.columns],
            "rows": df.astype(str).replace('nan', '').values.tolist()
        }
        
        return {
            "columns": sample_data["headers"],
            "sheets": sheets,
            "sample": sample_data
        }
    except Exception as e:
        logger.error(f"Preview error: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")


# =====================
# MODIFICATION ENDPOINTS
# =====================

@app.post("/api/file/remove-columns")
async def remove_columns_api(
    files: List[UploadFile] = File(...),
    columns: str = Form(...),
    sheet_name: str = Form(None),
    all_sheets: bool = Form(False),
    user=Depends(get_current_user)
):
    columns_list = [c.strip() for c in columns.split(",") if c.strip()]
    return await unified_batch_handler(
        files,
        remove_columns,
        {"columns_to_remove": columns_list, "sheet_name": sheet_name, "apply_all_sheets": all_sheets},
        "Remove Columns",
        "_cleaned",
        user=user
    )

@app.post("/api/file/rename-columns")
async def rename_columns_api(
    files: List[UploadFile] = File(...),
    mapping: str = Form(...),
    sheet_name: str = Form(None),
    all_sheets: bool = Form(False),
    user=Depends(get_current_user)
):
    import json
    try:
        rename_map = json.loads(mapping)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON mapping provided.")

    return await unified_batch_handler(
        files,
        bulk_rename_columns,
        {"rename_map": rename_map, "sheet_name": sheet_name, "apply_all_sheets": all_sheets},
        "Rename Columns",
        "_renamed",
        user=user
    )

@app.post("/api/file/replace-blanks")
async def replace_blanks_api(
    files: List[UploadFile] = File(...),
    columns: str = Form(...),
    replacement: str = Form(""),
    sheet_name: str = Form(None),
    all_sheets: bool = Form(False),
    user=Depends(get_current_user)
):
    columns_list = [c.strip() for c in columns.split(",") if c.strip()]
    return await unified_batch_handler(
        files,
        replace_blank_values,
        {"replace_value": replacement, "sheet_name": sheet_name, "apply_all_sheets": all_sheets, "target_columns": columns_list},
        "Replace Blanks",
        "_modified",
        user=user
    )


@app.post("/api/file/convert-datetime")
async def convert_datetime_api(
    files: List[UploadFile] = File(...),
    column: str = Form(...),
    target_format: str = Form(...),
    sheet_name: str = Form(None),
    all_sheets: bool = Form(False),
    user=Depends(get_current_user)
):
    columns_list = [c.strip() for c in column.split(",") if c.strip()]
    return await unified_batch_handler(
        files,
        convert_datetime_column,
        {
            "column_names": columns_list,
            "target_format": target_format,
            "sheet_name": sheet_name,
            "apply_all_sheets": all_sheets
        },
        "Convert DateTime",
        "_formatted",
        user=user
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
    user=Depends(get_current_user)
):
    try:
        file_data = await flatten_files(files)
        loop = asyncio.get_running_loop()
        
        columns_list = None
        if selected_columns:
            columns_list = [c.strip() for c in selected_columns.split(",") if c.strip()]

        output, columns, filename = await loop.run_in_executor(
            executor,
            lambda: merge_files_advanced(
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
        )

        if output is None:
            raise HTTPException(status_code=400, detail=filename)

        if user:
            await log_activity(user.id, "Advanced Merge", filename)

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if filename.endswith(".xlsx") else "text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =====================
# JSON CONVERTER
# =====================

@app.post("/api/file/convert-to-json")
async def convert_to_json_api(
    files: List[UploadFile] = File(...),
    orient: str = Form("records"),
    indent: int = Form(4),
    sheet_name: str = Form(None),
    user=Depends(get_current_user)
):
    return await unified_batch_handler(
        files,
        convert_to_json,
        {"orient": orient, "indent": indent, "sheet_name": sheet_name},
        "JSON Conversion",
        "", # JSON converter already returns the correct ext
        user
    )

# =====================
# TEMPLATE MAPPER
# =====================

@app.post("/api/file/template-headers")
async def get_template_headers_api(file: UploadFile = File(...)):
    try:
        # Optimization: Use streaming file directly
        is_csv = file.filename.lower().endswith(".csv")
        headers = get_excel_headers(file.file, is_csv=is_csv)
        return {"headers": headers}
    except Exception as e:
        logger.error(f"Error getting headers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/file/template-preview")
async def preview_mapping_api(
    template_headers: str = Form(...),
    data_file: UploadFile = File(...),
    mapping_json: str = Form(...) # JSON string
):
    try:
        t_headers = json.loads(template_headers)
        mapping = json.loads(mapping_json)
        
        contents = await data_file.read()
        buffer = io.BytesIO(contents)
        is_csv = data_file.filename.lower().endswith(".csv")
        
        preview = preview_mapped_data(t_headers, buffer, is_csv, mapping)
        return preview
    except Exception as e:
        logger.error(f"Error in preview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/file/template-map")
async def map_template_api(
    template_headers: str = Form(...),
    data_file: UploadFile = File(...),
    mapping_json: str = Form(...),
    user=Depends(get_current_user)
):
    try:
        t_headers = json.loads(template_headers)
        mapping = json.loads(mapping_json)
        
        contents = await data_file.read()
        buffer = io.BytesIO(contents)
        is_csv = data_file.filename.lower().endswith(".csv")
        
        loop = asyncio.get_running_loop()
        output, filename = await loop.run_in_executor(
            executor,
            lambda: map_template_data(t_headers, buffer, is_csv, mapping)
        )
        
        if output is None:
            raise HTTPException(status_code=400, detail=filename)
            
        if user:
            await log_activity(user.id, "Template Mapping", filename)

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="mapped_output_{int(time.time())}.xlsx"'}
        )
    except Exception as e:
        logger.error(f"Error in template mapping: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =====================
# DIFF CHECKER TOOL
# =====================

class DiffRequest(BaseModel):
    text1: str
    text2: str
    ignore_whitespace: bool = False
    ignore_case: bool = False

@app.post("/api/diff/compare")
async def compare_text_api(payload: DiffRequest, user=Depends(get_current_user)):
    from tools.diff_tool import compute_diff
    
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        executor, 
        lambda: compute_diff(
            payload.text1, 
            payload.text2, 
            ignore_whitespace=payload.ignore_whitespace,
            ignore_case=payload.ignore_case
        )
    )
    
    if user:
        await log_activity(user.id, "Diff Comparison", "text_compare")
        
    return result

if __name__ == "__main__":


    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
