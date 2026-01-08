from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io
import pandas as pd

from tools.list_tools import convert_column_advanced
from tools.add_modify import remove_columns

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
    xls = pd.ExcelFile(buffer)
    active_sheet = sheet_name or xls.sheet_names[0]

    df = pd.read_excel(xls, sheet_name=active_sheet, nrows=1)

    return {
        "columns": list(df.columns),
        "sheets": xls.sheet_names,
    }

# =====================
# REMOVE COLUMNS
# =====================

@app.post("/file/remove-columns")
async def remove_columns_api(
    file: UploadFile = File(...),
    columns: str = Form(...),
    sheet_name: str = Form(None),
):
    data = await file.read()
    buffer = io.BytesIO(data)
    buffer.name = file.filename

    columns_list = [c.strip() for c in columns.split(",") if c.strip()]
    is_csv = file.filename.lower().endswith(".csv")

    output, base_name = remove_columns(
        buffer,
        columns_list,
        sheet_name,
        is_csv=is_csv,
    )

    if output is None:
        return {"error": base_name}

    output.seek(0)
    ext = ".csv" if is_csv else ".xlsx"
    filename = f"{base_name}_cleaned{ext}"

    return StreamingResponse(
        output,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )
