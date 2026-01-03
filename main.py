from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tools import list_tools, file_tools, add_modify

app = FastAPI(title="MiniIQ API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextInput(BaseModel):
    text: str
    tool: str

@app.post("/text-tool")
def text_tool(data: TextInput):
    tool_map = {
        "column_to_csv": list_tools.column_to_comma,
        "column_to_quoted_csv": list_tools.column_to_quoted_comma,
        "csv_to_column": list_tools.comma_to_column,
        "spaces_to_commas": lambda x: x.replace(" ", ","),
        "newlines_to_commas": lambda x: x.replace("\n", ",")
    }

    if data.tool not in tool_map:
        return {"error": "Invalid tool"}

    return {"output": tool_map[data.tool](data.text)}
from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse
import io

@app.post("/merge-csv")
async def merge_csv(files: list[UploadFile] = File(...)):
    output = file_tools.merge_csv(files)

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=merged.csv"
        }
    )
@app.post("/merge-excel")
async def merge_excel(files: list[UploadFile] = File(...)):
    output = file_tools.merge_excel(files)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=merged.xlsx"
        }
    )
from fastapi import Form

@app.post("/remove-columns")
async def remove_columns_api(
    file: UploadFile = File(...),
    sheet_name: str = Form(...),
    columns: str = Form(...)
):
    column_list = [c.strip() for c in columns.split(",") if c.strip()]

    output, filename = add_modify.remove_columns(
        file,
        column_list,
        sheet_name
    )

    if output is None:
        raise HTTPException(status_code=400, detail=filename)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}_{sheet_name}_cleaned.xlsx"
        }
    )

from fastapi import UploadFile, File, HTTPException
import pandas as pd

@app.post("/excel-metadata")
async def excel_metadata(file: UploadFile = File(...)):
    try:
        # Read Excel file
        xls = pd.ExcelFile(file.file)

        metadata = {}

        for sheet in xls.sheet_names:
            # Read only header row
            df = pd.read_excel(xls, sheet_name=sheet, nrows=0)
            metadata[sheet] = df.columns.tolist()

        return metadata

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
