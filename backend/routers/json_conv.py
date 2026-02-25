from typing import List
from fastapi import APIRouter, UploadFile, File, Form, Depends, BackgroundTasks
from backend.core.auth import get_current_user
from backend.utils.helpers import unified_batch_handler
from tools.json_converter import convert_to_json

router = APIRouter(prefix="/api/file", tags=["json"])

@router.post("/convert-to-json")
async def convert_to_json_api(
    files: List[UploadFile] = File(...),
    orient: str = Form("records"),
    indent: int = Form(4),
    sheet_name: str = Form(None),
    all_sheets: bool = Form(False),
    user=Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    return await unified_batch_handler(
        files,
        convert_to_json,
        {"orient": orient, "indent": indent, "sheet_name": sheet_name, "apply_all_sheets": all_sheets},
        "JSON Conversion",
        "", # extension handled by processor
        user=user,
        background_tasks=background_tasks
    )
