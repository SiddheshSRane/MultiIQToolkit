from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io
import pandas as pd
from tools.add_modify import bulk_rename_columns, remove_columns, replace_blank_values
from tools.list_tools import convert_column_advanced

app = FastAPI(
    title="MiniIQ API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    return {"status": "ok", "message": "MiniIQ API is running"}

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
    ignore_comments: bool = True
    strip_quotes: bool = False


@app.post("/convert")
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
        ignore_comments=payload.ignore_comments,
        strip_quotes=payload.strip_quotes,
    )

    lines = payload.text.splitlines()
    non_empty = [l for l in lines if l.strip()]

    return {
        "result": result,
        "stats": {
            "total_lines": len(lines),
            "non_empty": len(non_empty),
            "unique": len(set(non_empty)),
        }
    }

# =====================
# FILE PREVIEW
# =====================

@app.post("/file/preview-columns")
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
            df = pd.read_csv(buffer, nrows=1)
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

# ... (existing endpoints)

@app.post("/file/remove-columns")
async def remove_columns_api(
    file: UploadFile = File(...),
    columns: str = Form(...),
    sheet_name: str = Form(None),
):
    try:
        data = await file.read()
        buffer = io.BytesIO(data)
        buffer.name = file.filename

        columns_list = [c.strip() for c in columns.split(",") if c.strip()]
        is_csv = file.filename.lower().endswith(".csv")

        output, error_msg = remove_columns(
            buffer,
            columns_list,
            sheet_name,
            is_csv=is_csv,
        )

        if output is None:
            raise HTTPException(status_code=400, detail=error_msg)

        output.seek(0)
        ext = ".csv" if is_csv else ".xlsx"
        filename = f"{error_msg}_cleaned{ext}"  # base_name is returned in error_msg position on success

        return StreamingResponse(
            output,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/file/rename-columns")
async def rename_columns_api(
    file: UploadFile = File(...),
    mapping: str = Form(...),  # JSON string
    sheet_name: str = Form(None),
):
    try:
        data = await file.read()
        buffer = io.BytesIO(data)
        buffer.name = file.filename

        is_csv = file.filename.lower().endswith(".csv")

        import json
        try:
            rename_map = json.loads(mapping)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON mapping provided.")

        output, error_msg = bulk_rename_columns(
            buffer,
            rename_map,
            sheet_name,
            is_csv=is_csv,
        )

        if output is None:
            raise HTTPException(status_code=400, detail=error_msg)

        output.seek(0)
        ext = ".csv" if is_csv else ".xlsx"
        # error_msg variable holds base_name on success
        
        return StreamingResponse(
            output,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{error_msg}_renamed{ext}"'
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/file/replace-blanks")
async def replace_blanks_api(
    file: UploadFile = File(...),
    columns: str = Form(...),
    replacement: str = Form(""),
    sheet_name: str = Form(None),
):
    try:
        data = await file.read()
        buffer = io.BytesIO(data)
        buffer.name = file.filename

        is_csv = file.filename.lower().endswith(".csv")
        
        # Parse columns
        columns_list = [c.strip() for c in columns.split(",") if c.strip()]

        output, error_msg = replace_blank_values(
            buffer,
            replacement,
            sheet_name,
            target_columns=columns_list,
            is_csv=is_csv,
        )

        if output is None:
            raise HTTPException(status_code=400, detail=error_msg)

        output.seek(0)
        ext = ".csv" if is_csv else ".xlsx"
        # error_msg variable holds base_name on success
        
        return StreamingResponse(
            output,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{error_msg}_filled{ext}"'
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
