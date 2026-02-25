import asyncio
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from backend.core.config import executor
from backend.core.auth import get_current_user, log_activity, upload_processed_file
from backend.utils.helpers import flatten_files
from tools.file_merger import merge_files_advanced, preview_common_columns as get_preview

router = APIRouter(prefix="/api/file", tags=["merger"])

@router.post("/preview-common-columns")
async def preview_common_columns(
    files: List[UploadFile] = File(...),
    strategy: str = Form("intersection"),
    case_insensitive: bool = Form(False),
    all_sheets: bool = Form(False),
):
    try:
        file_data = await flatten_files(files)
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

@router.post("/merge-common-columns")
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
    user=Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
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
            async def bg_task():
                file_url = await upload_processed_file(user.id, filename, output.getvalue())
                await log_activity(user.id, "Advanced Merge", filename, file_url)
            background_tasks.add_task(bg_task)

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if filename.endswith(".xlsx") else "text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
