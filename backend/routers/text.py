import asyncio
import pandas as pd
import io
from fastapi import APIRouter, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from backend.core.config import executor
from backend.core.auth import get_current_user, log_activity, upload_processed_file
from tools.list_tools import convert_column_advanced, convert_dates_text, column_stats

router = APIRouter(prefix="/api", tags=["text"])

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

class DateTimeConvertRequest(BaseModel):
    text: str
    target_format: str

class DiffRequest(BaseModel):
    text1: str
    text2: str
    ignore_whitespace: bool = False
    ignore_case: bool = False

@router.post("/convert")
async def convert(payload: ConvertRequest, user=Depends(get_current_user)):
    loop = asyncio.get_running_loop()
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
    return {"result": result, "stats": stats}

@router.post("/convert/export-xlsx")
async def export_xlsx(payload: ConvertRequest, user=Depends(get_current_user), background_tasks: BackgroundTasks = BackgroundTasks()):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        executor,
        lambda: convert_column_advanced(
            payload.text,
            delimiter="\n",
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
    
    filename = "conversion.xlsx"
    if user:
        async def bg_task():
            file_url = await upload_processed_file(user.id, filename, output.getvalue())
            await log_activity(user.id, "Download CSV as XLSX", filename, file_url)
        background_tasks.add_task(bg_task)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.post("/convert/datetime")
async def convert_datetime_text_api(payload: DateTimeConvertRequest, user=Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result, valid_count = await loop.run_in_executor(executor, lambda: convert_dates_text(payload.text, payload.target_format))
    stats = await loop.run_in_executor(executor, lambda: column_stats(payload.text))
    stats["non_empty"] = valid_count
    if user:
        await log_activity(user.id, "DateTime Conversion (Text)", "clipboard")
    return {"result": result, "stats": stats}

@router.post("/convert/datetime/export-xlsx")
async def export_datetime_xlsx(payload: DateTimeConvertRequest, user=Depends(get_current_user), background_tasks: BackgroundTasks = BackgroundTasks()):
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
        headers={"Content-Disposition": 'attachment; filename="dates_conversion.xlsx"'}
    )

@router.post("/diff/compare")
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
