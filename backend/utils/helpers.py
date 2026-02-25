import io
import os
import time
import pandas as pd
import asyncio
from typing import List, Tuple, Optional
from fastapi import UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from backend.core.config import logger, executor
from backend.core.auth import log_activity, upload_processed_file
from tools.zip_handler import is_zip

def read_df(file_obj, filename: str, nrows: Optional[int] = None, sheet_name: Optional[str] = None) -> pd.DataFrame:
    """
    Standardizes reading a DataFrame from CSV or Excel with robustness.
    """
    is_csv = filename.lower().endswith(".csv")
    
    if hasattr(file_obj, 'read'):
        content = file_obj.read()
        buffer = io.BytesIO(content)
    else:
        buffer = io.BytesIO(file_obj) if isinstance(file_obj, bytes) else file_obj

    if is_csv:
        encodings = ['utf-8-sig', 'latin1', 'utf-16', 'cp1252']
        for enc in encodings:
            try:
                buffer.seek(0)
                return pd.read_csv(buffer, nrows=nrows, encoding=enc, engine='c')
            except Exception:
                continue
        buffer.seek(0)
        return pd.read_csv(buffer, nrows=nrows)
    else:
        try:
            buffer.seek(0)
            xls = pd.ExcelFile(buffer)
            active_sheet = sheet_name or (xls.sheet_names[0] if xls.sheet_names else None)
            if active_sheet is None:
                return pd.DataFrame()
            return pd.read_excel(xls, sheet_name=active_sheet, nrows=nrows, dtype=str)
        except Exception as e:
            logger.error(f"Excel read error ({filename}): {e}")
            return pd.DataFrame()

async def flatten_files(files: List[UploadFile]) -> List[Tuple[io.BytesIO, str]]:
    """
    Extracts files from a list of UploadFile objects, including unpacking ZIPs.
    """
    import zipfile
    file_data = []
    MAX_FILES_IN_ZIP = 50
    
    for file in files:
        contents = await file.read()
        if is_zip(file.filename):
            with zipfile.ZipFile(io.BytesIO(contents)) as z:
                infos = z.infolist()
                if len(infos) > MAX_FILES_IN_ZIP:
                   raise HTTPException(status_code=400, detail=f"ZIP contains too many files (Limit: {MAX_FILES_IN_ZIP})")
                
                for info in infos:
                    name = info.filename
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
    user=None,
    background_tasks=None
):
    """
    Handles multiple files (and ZIPs) and returns a single file or a ZIP of processed files.
    """
    import zipfile
    flat_files = await flatten_files(files)
    
    if not flat_files:
        raise HTTPException(status_code=400, detail="No valid CSV or Excel files found.")

    loop = asyncio.get_running_loop()

    if len(flat_files) == 1:
        buffer, filename = flat_files[0]
        is_csv = filename.lower().endswith(".csv")
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
        final_ext = res_ext if res_ext.startswith('.') else (".csv" if is_csv else ".xlsx")
        base_name = os.path.splitext(filename)[0]
        final_filename = f"{base_name}{ext_suffix}{final_ext}"

        if user and background_tasks:
            async def bg_task():
                file_url = await upload_processed_file(user.id, final_filename, output.getvalue())
                await log_activity(user.id, action_name, final_filename, file_url)
            background_tasks.add_task(bg_task)
        elif user:
            await log_activity(user.id, action_name, final_filename)

        if final_ext == ".json" or final_ext == ".txt":
            media_type = "application/json" if final_ext == ".json" else "text/plain"
        elif final_ext == ".csv":
            media_type = "text/csv"
        else:
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        return StreamingResponse(
            output,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{base_name}{ext_suffix}{final_ext}"'}
        )

    async def process_single_file(file_info):
        buf, fname = file_info
        is_csv = fname.lower().endswith(".csv")
        try:
            output, result_val = await loop.run_in_executor(
                executor,
                lambda: processor_func(buf, **args_dict, is_csv=is_csv)
            )
            if output:
                return (output, result_val, is_csv, fname)
        except Exception as e:
            logger.error(f"Batch processing error for {fname}: {e}")
        return None

    results = await asyncio.gather(*(process_single_file(f) for f in flat_files))
    processed_results = [r for r in results if r is not None]

    if not processed_results:
        raise HTTPException(status_code=400, detail="Failed to process any files in the batch.")

    zip_output = io.BytesIO()
    with zipfile.ZipFile(zip_output, 'w', zipfile.ZIP_DEFLATED) as z:
        for output, result_val, is_csv, orig_fname in processed_results:
            if result_val.startswith('.'):
                base_name = os.path.splitext(orig_fname)[0]
                final_ext = result_val
            else:
                base_name = result_val
                final_ext = ".csv" if is_csv else ".xlsx"
            
            z.writestr(f"{base_name}{ext_suffix}{final_ext}", output.getbuffer())

    zip_output.seek(0)
    return StreamingResponse(
        zip_output,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="data_refinery_batch_{int(time.time())}.zip"'}
    )
