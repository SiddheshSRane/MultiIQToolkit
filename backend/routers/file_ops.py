import io
import json
import pandas as pd
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from backend.core.config import logger
from backend.core.auth import get_current_user
from backend.utils.helpers import read_df, unified_batch_handler
from tools.add_modify import bulk_rename_columns, remove_columns, replace_blank_values, convert_datetime_column

router = APIRouter(prefix="/api/file", tags=["file_ops"])

@router.post("/preview-columns")
async def preview_columns(
    file: UploadFile = File(...),
    sheet_name: str = Form(None),
):
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        df = read_df(io.BytesIO(contents), file.filename, nrows=10, sheet_name=sheet_name)
        sheets = None
        if not file.filename.lower().endswith(".csv"):
            try:
                xls = pd.ExcelFile(io.BytesIO(contents))
                sheets = xls.sheet_names
            except:
                pass
        df_clean = df.fillna("").astype(str).replace(["nan", "NaN", "None"], "")
        headers = [str(c) for c in df_clean.columns]
        serializable_rows = df_clean.values.tolist()
        return {
            "columns": headers,
            "sheets": sheets,
            "sample": {
                "headers": headers,
                "rows": serializable_rows
            }
        }
    except Exception as e:
        logger.error(f"Preview error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")

@router.post("/remove-columns")
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

@router.post("/rename-columns")
async def rename_columns_api(
    files: List[UploadFile] = File(...),
    mapping: str = Form(...),
    sheet_name: str = Form(None),
    all_sheets: bool = Form(False),
    user=Depends(get_current_user)
):
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

@router.post("/replace-blanks")
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

@router.post("/convert-datetime")
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
