import io
import json
import asyncio
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse
from backend.core.config import logger, executor
from backend.core.auth import get_current_user, log_activity
from tools.template_mapper import get_excel_headers, map_template_data, preview_mapped_data

router = APIRouter(prefix="/api/file", tags=["template"])

@router.post("/template-headers")
async def get_template_headers_api(file: UploadFile = File(...)):
    try:
        is_csv = file.filename.lower().endswith(".csv")
        headers = get_excel_headers(file.file, is_csv=is_csv)
        return {"headers": headers}
    except Exception as e:
        logger.error(f"Error getting headers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/template-preview")
async def preview_mapping_api(
    template_headers: str = Form(...),
    data_file: UploadFile = File(...),
    mapping_json: str = Form(...) 
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

@router.post("/template-map")
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
